import { Controller, Get, Param, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@ApiTags('Documentos PDF')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('acta/:id')
  @ApiOperation({ summary: 'Generar y descargar Acta oficial en PDF (pdf-lib ultra-rápido)' })
  @ApiResponse({ status: 200, description: 'Archivo binario PDF con membrete y firmas' })
  @Header('Content-Type', 'application/pdf')
  async descargarActaPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBytes = await this.pdfService.generarActaPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acta-${id}.pdf"`,
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }

  @Get('kardex/:subarticuloId')
  @ApiOperation({ summary: 'Generar y descargar Kardex oficial en PDF (pdf-lib ultra-rápido)' })
  @ApiResponse({ status: 200, description: 'Archivo binario PDF con reporte de kardex valorado' })
  @Header('Content-Type', 'application/pdf')
  async descargarKardexPdf(
    @Param('subarticuloId') subarticuloId: string,
    @Res() res: Response,
  ) {
    const pdfBytes = await this.pdfService.generarKardexPdf(subarticuloId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="kardex-${subarticuloId}.pdf"`,
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }

  @Get('reportes/depreciacion')
  @ApiOperation({ summary: 'Descargar Reporte 10 oficial en PDF con depreciación y UFV' })
  @ApiResponse({ status: 200, description: 'Reporte binario PDF en orientación apaisada' })
  @Header('Content-Type', 'application/pdf')
  async descargarReporteDepreciacionPdf(@Res() res: Response) {
    const pdfBytes = await this.pdfService.generarReporteDepreciacionPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="reporte-10-depreciacion-ufv.pdf"',
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }

  @Get('reportes/resumen')
  @ApiOperation({ summary: 'Descargar Reporte 6 oficial en PDF (Resumen de activos por cuenta contable)' })
  @ApiResponse({ status: 200, description: 'Reporte binario PDF en orientación apaisada' })
  @Header('Content-Type', 'application/pdf')
  async descargarReporteResumenPdf(@Res() res: Response) {
    const pdfBytes = await this.pdfService.generarReporteResumenPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="reporte-6-resumen-activos.pdf"',
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }

  @Get('reportes/bajas')
  @ApiOperation({ summary: 'Descargar Reporte 9 oficial en PDF (Histórico de bajas de activos)' })
  @ApiResponse({ status: 200, description: 'Reporte binario PDF en orientación apaisada' })
  @Header('Content-Type', 'application/pdf')
  async descargarReporteBajasPdf(@Res() res: Response) {
    const pdfBytes = await this.pdfService.generarReporteBajasPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="reporte-9-bajas-activos.pdf"',
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }

  @Get('almacenes/inventario-valorado')
  @ApiOperation({ summary: 'Descargar Reporte Oficial de Inventario Físico Valorado de Almacenes en PDF' })
  @Header('Content-Type', 'application/pdf')
  async descargarInventarioValoradoAlmacen(@Res() res: Response) {
    const pdfBytes = await this.pdfService.generarInventarioValoradoAlmacenPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="inventario-fisico-valorado-almacenes.pdf"',
      'Content-Length': pdfBytes.length,
    });

    res.end(Buffer.from(pdfBytes));
  }
}
