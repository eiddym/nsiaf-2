import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generarActaPdf(actaId: string): Promise<Uint8Array> {
    const acta = await this.prisma.acta.findUnique({
      where: { id: actaId },
      include: {
        usuarioFuncionario: {
          include: {
            unidad: {
              include: {
                edificio: {
                  include: {
                    entidad: true,
                  },
                },
              },
            },
          },
        },
        usuarioResponsable: true,
        detalles: {
          include: {
            activo: {
              include: {
                cuentaContable: true,
                auxiliar: true,
              },
            },
          },
        },
      },
    });

    if (!acta) {
      throw new NotFoundException(`Acta ${actaId} no encontrada`);
    }

    const entidad = await this.prisma.entidad.findFirst();

    // 1. Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 en puntos
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colores institucionales
    const primaryColor = rgb(0.05, 0.2, 0.41); // Azul Estado #0d3269
    const textColor = rgb(0.12, 0.16, 0.23); // Slate 800
    const lightGray = rgb(0.92, 0.94, 0.96);
    const borderColor = rgb(0.8, 0.83, 0.88);

    let y = height - 50;

    // 2. Encabezado Institucional
    page.drawText(entidad?.encabezado || 'ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 50,
      y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText(entidad?.nombre || 'ENTIDAD INSTITUCIONAL', {
      x: 50,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 10;

    // Línea separadora
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1.5,
      color: primaryColor,
    });
    y -= 25;

    // 3. Título del Acta
    const titulo = `ACTA OFICIAL DE ${acta.tipo} DE ACTIVOS FIJOS`;
    const titleWidth = fontBold.widthOfTextAtSize(titulo, 14);
    page.drawText(titulo, {
      x: (width - titleWidth) / 2,
      y,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });
    y -= 18;

    const nroActa = `N° ACTA: ${String(acta.numero).padStart(6, '0')}  |  CITE: ${acta.documentoCite || 'S/CITE'}`;
    const nroWidth = fontRegular.widthOfTextAtSize(nroActa, 10);
    page.drawText(nroActa, {
      x: (width - nroWidth) / 2,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });
    y -= 25;

    // 4. Recuadro de Metadatos y Partes Intervinientes
    page.drawRectangle({
      x: 50,
      y: y - 85,
      width: width - 100,
      height: 85,
      color: lightGray,
      borderColor,
      borderWidth: 1,
    });

    const f = acta.usuarioFuncionario;
    const r = acta.usuarioResponsable;
    const fechaStr = new Date(acta.fecha).toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let metaY = y - 18;
    page.drawText(`Fecha: ${fechaStr}`, { x: 65, y: metaY, size: 9, font: fontRegular, color: textColor });
    page.drawText(`Lugar: La Paz, Edificio Central`, { x: 300, y: metaY, size: 9, font: fontRegular, color: textColor });
    metaY -= 16;

    page.drawText(`Funcionario Receptor: ${f.nombres} ${f.apellidos}`, { x: 65, y: metaY, size: 9, font: fontBold, color: textColor });
    page.drawText(`C.I.: ${f.ci}`, { x: 350, y: metaY, size: 9, font: fontRegular, color: textColor });
    metaY -= 16;

    page.drawText(`Cargo: ${f.cargo || 'Funcionario Público'}`, { x: 65, y: metaY, size: 9, font: fontRegular, color: textColor });
    page.drawText(`Unidad: ${f.unidad?.nombre || 'General'}`, { x: 300, y: metaY, size: 9, font: fontRegular, color: textColor });
    metaY -= 16;

    page.drawText(`Responsable de Activos: ${r.nombres} ${r.apellidos} (${r.cargo || 'Responsable'})`, {
      x: 65,
      y: metaY,
      size: 9,
      font: fontRegular,
      color: textColor,
    });

    y -= 105;

    // 5. Tabla de Bienes Asignados
    page.drawText('DETALLE DE BIENES Y EQUIPOS EN CUSTODIA:', {
      x: 50,
      y,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    y -= 15;

    // Encabezado de la tabla
    const tableHeaders = [
      { text: 'N°', x: 55, width: 25 },
      { text: 'IDENTIFICACIÓN QR', x: 80, width: 110 },
      { text: 'DESCRIPCIÓN DEL BIEN', x: 195, width: 180 },
      { text: 'MARCA / SERIE', x: 380, width: 110 },
      { text: 'ESTADO', x: 495, width: 50 },
    ];

    page.drawRectangle({
      x: 50,
      y: y - 16,
      width: width - 100,
      height: 18,
      color: primaryColor,
    });

    for (const h of tableHeaders) {
      page.drawText(h.text, {
        x: h.x,
        y: y - 12,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }
    y -= 18;

    // Filas de bienes
    let itemIndex = 1;
    for (const d of acta.detalles) {
      const a = d.activo;
      const rowColor = itemIndex % 2 === 0 ? lightGray : rgb(1, 1, 1);

      page.drawRectangle({
        x: 50,
        y: y - 22,
        width: width - 100,
        height: 22,
        color: rowColor,
        borderColor,
        borderWidth: 0.5,
      });

      page.drawText(String(itemIndex), { x: 58, y: y - 14, size: 8, font: fontRegular, color: textColor });
      page.drawText(a.codigoBarras, { x: 80, y: y - 14, size: 8, font: fontBold, color: textColor });

      const desc = a.descripcion.length > 40 ? a.descripcion.substring(0, 38) + '...' : a.descripcion;
      page.drawText(desc, { x: 195, y: y - 14, size: 8, font: fontRegular, color: textColor });

      const marcaSerie = `${a.marca || 'S/M'} - ${a.serie || 'S/S'}`;
      page.drawText(marcaSerie.length > 22 ? marcaSerie.substring(0, 20) + '..' : marcaSerie, {
        x: 380,
        y: y - 14,
        size: 8,
        font: fontRegular,
        color: textColor,
      });

      page.drawText(a.estado, { x: 495, y: y - 14, size: 8, font: fontBold, color: textColor });

      y -= 22;
      itemIndex++;
    }

    y -= 20;

    // 6. Cláusula de Conformidad Legal
    const clausula =
      'En señal de absoluta conformidad, el funcionario receptor asume la custodia y responsabilidad civil y administrativa ' +
      'por la conservación y buen uso de los bienes detallados precedentemente, comprometiéndose a informar de forma inmediata ' +
      'a la Unidad Administrativa en caso de extravío, siniestro o desperfecto técnico.';

    page.drawText(clausula, {
      x: 50,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
      lineHeight: 11,
      maxWidth: width - 100,
    });

    y -= 75;

    // 7. Firmas
    const firmaY = y;
    page.drawLine({ start: { x: 80, y: firmaY }, end: { x: 230, y: firmaY }, thickness: 1, color: textColor });
    page.drawLine({ start: { x: width - 230, y: firmaY }, end: { x: width - 80, y: firmaY }, thickness: 1, color: textColor });

    page.drawText('ENTREGUÉ CONFORME', { x: 105, y: firmaY - 12, size: 8, font: fontBold, color: textColor });
    page.drawText(`${r.nombres} ${r.apellidos}`, { x: 95, y: firmaY - 24, size: 8, font: fontRegular, color: textColor });
    page.drawText('Responsable de Activos Fijos', { x: 90, y: firmaY - 34, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    page.drawText('RECIBÍ CONFORME', { x: width - 215, y: firmaY - 12, size: 8, font: fontBold, color: textColor });
    page.drawText(`${f.nombres} ${f.apellidos}`, { x: width - 225, y: firmaY - 24, size: 8, font: fontRegular, color: textColor });
    page.drawText(`C.I. ${f.ci} · Funcionario Custodio`, { x: width - 230, y: firmaY - 34, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    // Estampado de Código QR de Identificación Global y Verificación Rápida
    const primerActivo = acta.detalles?.[0]?.activo;
    const qrPayload = JSON.stringify({
      nsiaf: 'v2',
      acta: acta.documentoCite || `ACTA-${acta.numero}`,
      tipo: acta.tipo,
      funcionario: `${f.nombres} ${f.apellidos}`,
      ci: f.ci,
      activo: primerActivo?.codigoBarras,
      verif: `http://localhost:8086/verificar/activo/${primerActivo?.codigoBarras || acta.id}`,
    });

    const qrPngBuffer = await QRCode.toBuffer(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: '#0a192f', light: '#ffffff' },
    });
    const qrImage = await pdfDoc.embedPng(qrPngBuffer);
    page.drawImage(qrImage, {
      x: (width - 55) / 2,
      y: firmaY - 45,
      width: 55,
      height: 55,
    });
    page.drawText('VERIFICACIÓN QR', {
      x: (width - 70) / 2,
      y: firmaY - 53,
      size: 6,
      font: fontBold,
      color: primaryColor,
    });

    // Pie de página
    page.drawText(entidad?.piePagina || 'NSIAF v2 - Sistema Integrado de Activos Fijos y Almacenes · Bolivia', {
      x: 50,
      y: 30,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  async generarKardexPdf(subarticuloId: string, almacenId?: string): Promise<Uint8Array> {
    const subarticulo = await this.prisma.subarticulo.findUnique({
      where: { id: subarticuloId },
      include: {
        material: true,
      },
    });

    if (!subarticulo) {
      throw new NotFoundException(`Subartículo ${subarticuloId} no encontrado`);
    }

    const entidad = await this.prisma.entidad.findFirst();

    const whereClause: any = { subarticuloId };
    if (almacenId) {
      whereClause.almacenId = almacenId;
    }

    const movimientos = await this.prisma.kardexAlmacen.findMany({
      where: whereClause,
      include: {
        almacen: true,
      },
      orderBy: { fecha: 'asc' },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.05, 0.2, 0.41);
    const textColor = rgb(0.12, 0.16, 0.23);
    const lightGray = rgb(0.94, 0.96, 0.98);
    const borderColor = rgb(0.8, 0.83, 0.88);

    let y = height - 50;

    // Encabezado
    page.drawText(entidad?.encabezado || 'ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 50,
      y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText(entidad?.nombre || 'SISTEMA INTEGRADO DE ALMACENES', {
      x: 50,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 10;

    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1.5,
      color: primaryColor,
    });
    y -= 25;

    // Título
    const titulo = 'KARDEX FÍSICO - VALORADO DE ALMACÉN';
    const titleWidth = fontBold.widthOfTextAtSize(titulo, 14);
    page.drawText(titulo, {
      x: (width - titleWidth) / 2,
      y,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });
    y -= 20;

    // Ficha del ítem
    page.drawRectangle({
      x: 50,
      y: y - 45,
      width: width - 100,
      height: 45,
      color: lightGray,
      borderColor,
      borderWidth: 1,
    });

    page.drawText(`Artículo: ${subarticulo.codigo} - ${subarticulo.descripcion}`, {
      x: 60,
      y: y - 16,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    page.drawText(`Grupo / Material: ${subarticulo.material.codigo} - ${subarticulo.material.descripcion}`, {
      x: 60,
      y: y - 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Unidad: ${subarticulo.unidadMedida}   |   Método: PEPS / Ponderado`, {
      x: 350,
      y: y - 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 65;

    // Cabecera de Tabla
    const colX = [50, 110, 160, 260, 320, 380, 440, 500];
    page.drawRectangle({
      x: 50,
      y: y - 18,
      width: width - 100,
      height: 18,
      color: primaryColor,
    });

    const headers = ['Fecha', 'Tipo', 'CITE', 'Cant.', 'P. Unit', 'Total Bs.', 'Saldo Cant.'];
    headers.forEach((h, idx) => {
      page.drawText(h, {
        x: colX[idx] + 2,
        y: y - 13,
        size: 7,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    });
    y -= 20;

    // Filas
    if (movimientos.length === 0) {
      page.drawText('Sin movimientos registrados en este período.', {
        x: 60,
        y: y - 15,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 25;
    } else {
      for (const m of movimientos) {
        if (y < 80) break; // Límite de página

        const fechaStr = new Date(m.fecha).toISOString().slice(0, 10);
        page.drawText(fechaStr, { x: colX[0] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText(m.tipoMovimiento, { x: colX[1] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText((m.documentoCite || '-').slice(0, 16), { x: colX[2] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText(Number(m.cantidad).toFixed(0), { x: colX[3] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText(Number(m.costoUnitario).toFixed(2), { x: colX[4] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText(Number(m.costoTotal).toFixed(2), { x: colX[5] + 2, y: y - 10, size: 7, font: fontRegular, color: textColor });
        page.drawText(Number(m.saldoCantidad).toFixed(0), { x: colX[6] + 2, y: y - 10, size: 7, font: fontBold, color: primaryColor });

        y -= 14;
        page.drawLine({
          start: { x: 50, y: y + 2 },
          end: { x: width - 50, y: y + 2 },
          thickness: 0.5,
          color: borderColor,
        });
      }
    }

    // Pie de página
    page.drawText('NSIAF v2 - Reporte Oficial de Kardex Físico-Valorado · Generado en tiempo real', {
      x: 50,
      y: 30,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  async generarReporteDepreciacionPdf(cuentaId?: string): Promise<Uint8Array> {
    const where: any = {};
    if (cuentaId) {
      where.cuentaContableId = cuentaId;
    }

    const activos = await this.prisma.activo.findMany({
      where,
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
      orderBy: { codigo: 'asc' },
    });

    const entidad = await this.prisma.entidad.findFirst();

    // Landscape A4
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.05, 0.2, 0.41);
    const textColor = rgb(0.12, 0.16, 0.23);
    const borderColor = rgb(0.8, 0.83, 0.88);

    let y = height - 40;

    // Encabezado
    page.drawText(entidad?.encabezado || 'ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 40,
      y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText(entidad?.nombre || 'SISTEMA INTEGRADO DE ACTIVOS FIJOS · NSIAF v2', {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 10;

    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1.5, color: primaryColor });
    y -= 22;

    const titulo = 'REPORTE 10: INVENTARIO DE ACTIVOS FIJOS Y DEPRECIACIÓN CON ACTUALIZACIÓN POR UFV';
    const titleWidth = fontBold.widthOfTextAtSize(titulo, 12);
    page.drawText(titulo, { x: (width - titleWidth) / 2, y, size: 12, font: fontBold, color: primaryColor });
    y -= 25;

    // Tabla
    page.drawRectangle({ x: 40, y: y - 16, width: width - 80, height: 16, color: primaryColor });
    const cols = [42, 135, 305, 395, 455, 520, 585, 650, 715];
    const headers = ['Código', 'Descripción', 'Rubro Contable', 'P. Inicial', 'Factor', 'Inc. Act.', 'Val. Actual.', 'Dep. Gestión', 'Val. Neto'];
    headers.forEach((h, idx) => {
      page.drawText(h, { x: cols[idx], y: y - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    });
    y -= 18;

    const factorUfv = 1.01253;
    let totalInicial = 0;
    let totalActual = 0;
    let totalNeto = 0;

    for (const a of activos) {
      if (y < 60) break;

      const pIni = Number(a.precioInicial);
      const incAct = Number((pIni * (factorUfv - 1)).toFixed(2));
      const valAct = pIni + incAct;
      const depGest = Number((valAct / 4).toFixed(2));
      const neto = Math.max(1, Number((valAct - depGest).toFixed(2)));

      totalInicial += pIni;
      totalActual += valAct;
      totalNeto += neto;

      page.drawText(a.codigoBarras, { x: cols[0], y: y - 10, size: 7, font: fontBold, color: primaryColor });
      page.drawText(a.descripcion.slice(0, 32), { x: cols[1], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(a.cuentaContable.nombre.slice(0, 18), { x: cols[2], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(pIni.toFixed(2), { x: cols[3], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(factorUfv.toFixed(5), { x: cols[4], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(incAct.toFixed(2), { x: cols[5], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(valAct.toFixed(2), { x: cols[6], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(depGest.toFixed(2), { x: cols[7], y: y - 10, size: 7, font: fontRegular, color: textColor });
      page.drawText(neto.toFixed(2), { x: cols[8], y: y - 10, size: 7, font: fontBold, color: textColor });

      y -= 13;
      page.drawLine({ start: { x: 40, y: y + 2 }, end: { x: width - 40, y: y + 2 }, thickness: 0.5, color: borderColor });
    }

    // Fila de Totales
    y -= 5;
    page.drawText('TOTALES GENERALES (Bs.):', { x: cols[1], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalInicial.toFixed(2), { x: cols[3], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalActual.toFixed(2), { x: cols[6], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalNeto.toFixed(2), { x: cols[8], y: y - 10, size: 8, font: fontBold, color: primaryColor });

    // Pie
    page.drawText('Reporte Oficial de Cierre y Depreciación con Actualización UFV · Sistema NSIAF v2 Bolivia', {
      x: 40,
      y: 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  async generarReporteResumenPdf(): Promise<Uint8Array> {
    const cuentas = await this.prisma.cuentaContable.findMany({
      include: {
        activos: {
          select: { precioInicial: true },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    const entidad = await this.prisma.entidad.findFirst();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.05, 0.2, 0.41);
    const textColor = rgb(0.12, 0.16, 0.23);
    const borderColor = rgb(0.8, 0.83, 0.88);

    let y = height - 40;

    // Encabezado
    page.drawText(entidad?.encabezado || 'ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 40,
      y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText(entidad?.nombre || 'SISTEMA INTEGRADO DE ACTIVOS FIJOS · NSIAF v2', {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 10;

    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1.5, color: primaryColor });
    y -= 22;

    const titulo = 'REPORTE 6: RESUMEN GENERAL DE ACTIVOS FIJOS POR CUENTA CONTABLE';
    const titleWidth = fontBold.widthOfTextAtSize(titulo, 12);
    page.drawText(titulo, { x: (width - titleWidth) / 2, y, size: 12, font: fontBold, color: primaryColor });
    y -= 25;

    // Tabla
    page.drawRectangle({ x: 40, y: y - 16, width: width - 80, height: 16, color: primaryColor });
    const cols = [45, 120, 290, 360, 440, 515, 600, 680, 755];
    const headers = ['Código', 'Rubro Contable', 'Cant.', 'Costo Inicial (Bs)', 'Factor UFV', 'Inc. Actualiz. (Bs)', 'Valor Actual (Bs)', 'Deprec. Acum. (Bs)', 'Valor Neto (Bs)'];
    headers.forEach((h, idx) => {
      page.drawText(h, { x: cols[idx], y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    });
    y -= 20;

    const factorUfv = 1.01253;
    let totalCantidad = 0;
    let totalInicial = 0;
    let totalIncAct = 0;
    let totalActualizado = 0;
    let totalDeprec = 0;
    let totalNeto = 0;

    for (const c of cuentas) {
      if (y < 60) break;

      const cantidad = c.activos.length;
      const inicial = c.activos.reduce((acc, a) => acc + Number(a.precioInicial), 0);
      const incAct = Number((inicial * (factorUfv - 1)).toFixed(2));
      const actualizado = inicial + incAct;
      const deprec = Number((actualizado * 0.25).toFixed(2));
      const neto = Math.max(cantidad, actualizado - deprec);

      totalCantidad += cantidad;
      totalInicial += inicial;
      totalIncAct += incAct;
      totalActualizado += actualizado;
      totalDeprec += deprec;
      totalNeto += neto;

      page.drawText(String(c.codigo), { x: cols[0], y: y - 10, size: 7.5, font: fontBold, color: primaryColor });
      page.drawText(c.nombre.slice(0, 32), { x: cols[1], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(String(cantidad), { x: cols[2], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(inicial.toFixed(2), { x: cols[3], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(factorUfv.toFixed(5), { x: cols[4], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(incAct.toFixed(2), { x: cols[5], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(actualizado.toFixed(2), { x: cols[6], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(deprec.toFixed(2), { x: cols[7], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(neto.toFixed(2), { x: cols[8], y: y - 10, size: 7.5, font: fontBold, color: textColor });

      y -= 15;
      page.drawLine({ start: { x: 40, y: y + 2 }, end: { x: width - 40, y: y + 2 }, thickness: 0.5, color: borderColor });
    }

    // Fila de Totales
    y -= 5;
    page.drawText('TOTALES CONSOLIDADOS:', { x: cols[1], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(String(totalCantidad), { x: cols[2], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalInicial.toFixed(2), { x: cols[3], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalIncAct.toFixed(2), { x: cols[5], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalActualizado.toFixed(2), { x: cols[6], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalDeprec.toFixed(2), { x: cols[7], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalNeto.toFixed(2), { x: cols[8], y: y - 10, size: 8, font: fontBold, color: primaryColor });

    // Pie
    page.drawText('Reporte 6 Oficial de Resumen de Activos Fijos · Generado por NSIAF v2', {
      x: 40,
      y: 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  async generarReporteBajasPdf(): Promise<Uint8Array> {
    const activos = await this.prisma.activo.findMany({
      where: {
        bajaId: { not: null },
      },
      include: {
        cuentaContable: true,
        baja: {
          include: {
            usuario: true,
          },
        },
      },
      orderBy: { codigo: 'desc' },
    });

    const entidad = await this.prisma.entidad.findFirst();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.55, 0.05, 0.05);
    const textColor = rgb(0.12, 0.16, 0.23);
    const borderColor = rgb(0.8, 0.83, 0.88);

    let y = height - 40;

    // Encabezado
    page.drawText(entidad?.encabezado || 'ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 40,
      y,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText(entidad?.nombre || 'SISTEMA INTEGRADO DE ACTIVOS FIJOS · NSIAF v2', {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
    y -= 10;

    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1.5, color: primaryColor });
    y -= 22;

    const titulo = 'REPORTE 9: HISTÓRICO DE BAJAS DE ACTIVOS FIJOS Y DISPOSICIÓN DE BIENES';
    const titleWidth = fontBold.widthOfTextAtSize(titulo, 12);
    page.drawText(titulo, { x: (width - titleWidth) / 2, y, size: 12, font: fontBold, color: primaryColor });
    y -= 25;

    // Tabla
    page.drawRectangle({ x: 40, y: y - 16, width: width - 80, height: 16, color: primaryColor });
    const cols = [45, 130, 270, 390, 520, 610, 715];
    const headers = ['Código Activo', 'Descripción del Bien', 'Rubro Contable', 'Motivo de Baja', 'Documento / CITE', 'Fecha Baja', 'Valor Hist. (Bs)'];
    headers.forEach((h, idx) => {
      page.drawText(h, { x: cols[idx], y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    });
    y -= 20;

    let totalValorBaja = 0;

    for (const a of activos) {
      if (y < 60) break;

      const pIni = Number(a.precioInicial);
      totalValorBaja += pIni;
      const fechaStr = a.baja?.fecha ? new Date(a.baja.fecha).toISOString().slice(0, 10) : 'N/A';

      page.drawText(a.codigoBarras, { x: cols[0], y: y - 10, size: 7.5, font: fontBold, color: primaryColor });
      page.drawText(a.descripcion.slice(0, 26), { x: cols[1], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(a.cuentaContable.nombre.slice(0, 20), { x: cols[2], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText((a.baja?.motivo || 'Baja definitiva').slice(0, 24), { x: cols[3], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText((a.baja?.documentoCite || 'S/D').slice(0, 18), { x: cols[4], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(fechaStr, { x: cols[5], y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(pIni.toFixed(2), { x: cols[6], y: y - 10, size: 7.5, font: fontBold, color: textColor });

      y -= 15;
      page.drawLine({ start: { x: 40, y: y + 2 }, end: { x: width - 40, y: y + 2 }, thickness: 0.5, color: borderColor });
    }

    // Fila de Totales
    y -= 5;
    page.drawText(`TOTAL ACTIVOS DADOS DE BAJA: ${activos.length}`, { x: cols[1], y: y - 10, size: 8, font: fontBold, color: primaryColor });
    page.drawText(totalValorBaja.toFixed(2), { x: cols[6], y: y - 10, size: 8, font: fontBold, color: primaryColor });

    // Pie
    page.drawText('Reporte 9 Oficial de Bajas de Activos Fijos · Generado por NSIAF v2', {
      x: 40,
      y: 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  /**
   * Genera el Reporte Oficial de Inventario Físico Valorado de Almacenes en PDF.
   */
  async generarInventarioValoradoAlmacenPdf(): Promise<Uint8Array> {
    const subarticulos = await this.prisma.subarticulo.findMany({
      where: { activo: true },
      include: { material: true },
      orderBy: [{ material: { codigo: 'asc' } }, { codigo: 'asc' }],
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    const { width, height } = page.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.08, 0.14, 0.35);
    const textColor = rgb(0.15, 0.15, 0.15);
    const borderColor = rgb(0.8, 0.8, 0.85);

    page.drawText('INVENTARIO FÍSICO VALORADO DE ALMACENES Y SUMINISTROS', {
      x: 40,
      y: height - 38,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`Fecha de emisión: ${new Date().toISOString().slice(0, 10)}  ·  Clasificador Presupuestario Grupo 30000`, {
      x: 40,
      y: height - 53,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.45),
    });

    let y = height - 80;
    const cols = [40, 105, 175, 445, 535, 620, 710];
    const headers = ['PARTIDA', 'CÓDIGO', 'DESCRIPCIÓN DEL SUMINISTRO', 'UNIDAD', 'EXISTENCIA', 'COSTO UNIT.', 'VALOR TOTAL (Bs)'];

    page.drawRectangle({ x: 40, y: y - 16, width: width - 80, height: 18, color: primaryColor });
    headers.forEach((h, i) => {
      page.drawText(h, { x: cols[i] + 2, y: y - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    });
    y -= 20;

    let granTotal = 0;
    for (const item of subarticulos) {
      if (y < 60) break;
      const stock = Number(item.stockActual);
      const costo = Number(item.costoUnitarioPromedio);
      const total = stock * costo;
      granTotal += total;

      page.drawText(item.material?.codigo || '30000', { x: cols[0] + 2, y: y - 10, size: 7.5, font: fontBold, color: primaryColor });
      page.drawText(String(item.codigo), { x: cols[1] + 2, y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(item.descripcion.slice(0, 48), { x: cols[2] + 2, y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(item.unidadMedida.slice(0, 14), { x: cols[3] + 2, y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(stock.toFixed(2), { x: cols[4] + 2, y: y - 10, size: 7.5, font: fontBold, color: textColor });
      page.drawText(costo.toFixed(2), { x: cols[5] + 2, y: y - 10, size: 7.5, font: fontRegular, color: textColor });
      page.drawText(total.toFixed(2), { x: cols[6] + 2, y: y - 10, size: 7.5, font: fontBold, color: primaryColor });

      y -= 15;
      page.drawLine({ start: { x: 40, y: y + 2 }, end: { x: width - 40, y: y + 2 }, thickness: 0.5, color: borderColor });
    }

    y -= 6;
    page.drawText(`TOTAL ÍTEMS EN CATÁLOGO: ${subarticulos.length}`, { x: cols[2], y: y - 10, size: 8.5, font: fontBold, color: primaryColor });
    page.drawText(`Bs. ${granTotal.toFixed(2)}`, { x: cols[6], y: y - 10, size: 9, font: fontBold, color: primaryColor });

    page.drawText('Inventario Físico Valorado Oficial · Generado por NSIAF v2', {
      x: 40,
      y: 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }
}
