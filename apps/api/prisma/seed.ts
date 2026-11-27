import { PrismaClient, RolUsuario, EstadoActivo, TipoIngreso } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const clasificador2027 = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'prisma', 'clasificadores-2027.json'), 'utf8'),
);
const CLASIFICADOR_MATERIALES_2027: Array<{ codigo: string; descripcion: string }> = clasificador2027.materiales;
const CLASIFICADOR_ACTIVOS_2027: Array<{
  codigo: number;
  nombre: string;
  vidaUtilMeses: number;
  depreciar: boolean;
  actualizar: boolean;
  auxiliares: Array<{ codigo: number; nombre: string }>;
}> = clasificador2027.activos;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos semilla (Seed) para NSIAF v2...');

  // 1. Limpiar o verificar Entidad
  const entidad = await prisma.entidad.upsert({
    where: { codigo: 'ENT' },
    update: {},
    create: {
      codigo: 'ENT',
      nombre: 'Entidad Institucional Principal',
      sigla: 'ENT',
      encabezado: 'SISTEMA INTEGRADO DE ACTIVOS FIJOS Y ALMACENES',
      piePagina: 'Calle Ayacucho esq. Potosí, Edif. Telecomunicaciones Piso 4, La Paz - Bolivia',
    },
  });

  // 2. Edificio
  const edificio = await prisma.edificio.upsert({
    where: { codigo: 'EDIF-CENTRAL' },
    update: {},
    create: {
      codigo: 'EDIF-CENTRAL',
      nombre: 'Edificio Central Telecomunicaciones',
      direccion: 'Calle Ayacucho esq. Potosí, La Paz',
      entidadId: entidad.id,
    },
  });

  // 3. Unidades
  const unidadUAF = await prisma.unidad.upsert({
    where: { codigo: 101 },
    update: {},
    create: {
      codigo: 101,
      nombre: 'Unidad Administrativa Financiera',
      edificioId: edificio.id,
    },
  });

  const unidadTIC = await prisma.unidad.upsert({
    where: { codigo: 102 },
    update: {},
    create: {
      codigo: 102,
      nombre: 'Unidad de Tecnologías de Información y Comunicación',
      edificioId: edificio.id,
    },
  });

  const unidadDir = await prisma.unidad.upsert({
    where: { codigo: 100 },
    update: {},
    create: {
      codigo: 100,
      nombre: 'Dirección Ejecutiva',
      edificioId: edificio.id,
    },
  });

  // 4. Usuarios
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      ci: '0000001',
      username: 'admin',
      passwordHash: adminPasswordHash,
      nombres: 'Super',
      apellidos: 'Administrador',
      email: 'admin@entidad.bo',
      cargo: 'Administrador General del Sistema',
      telefono: '22112233',
      rol: RolUsuario.SUPER_ADMIN,
      accesoActivos: true,
      accesoAlmacenes: true,
      unidadId: unidadTIC.id,
    },
  });

  const respActivosPasswordHash = await bcrypt.hash('activos123', 10);
  const respActivos = await prisma.usuario.upsert({
    where: { username: 'admin_activos' },
    update: {},
    create: {
      ci: '4839201',
      username: 'admin_activos',
      passwordHash: respActivosPasswordHash,
      nombres: 'Carlos',
      apellidos: 'Mamani Quispe',
      email: 'cmamani@entidad.bo',
      cargo: 'Responsable de Activos Fijos',
      telefono: '71928374',
      rol: RolUsuario.ADMIN_ACTIVOS,
      accesoActivos: true,
      accesoAlmacenes: false,
      unidadId: unidadUAF.id,
    },
  });

  const respAlmacenes = await prisma.usuario.upsert({
    where: { username: 'admin_almacenes' },
    update: {},
    create: {
      ci: '9900112',
      username: 'admin_almacenes',
      passwordHash: respActivosPasswordHash,
      nombres: 'Ramiro',
      apellidos: 'Condori Huanca',
      email: 'almacenes@cooperativa.bo',
      cargo: 'Encargado de Almacenes',
      telefono: '71002233',
      rol: RolUsuario.ADMIN_ALMACENES,
      accesoActivos: false,
      accesoAlmacenes: true,
      unidadId: unidadUAF.id,
      esJefe: true,
      jerarquia: 'JEFE',
    },
  });

  const adminGeneral = await prisma.usuario.upsert({
    where: { username: 'admin_general' },
    update: {},
    create: {
      ci: '9900113',
      username: 'admin_general',
      passwordHash: respActivosPasswordHash,
      nombres: 'Eduardo',
      apellidos: 'Vargas Miranda',
      email: 'administracion@cooperativa.bo',
      cargo: 'Administrador General',
      telefono: '71004455',
      rol: RolUsuario.ADMIN_GENERAL,
      accesoActivos: true,
      accesoAlmacenes: true,
      unidadId: unidadDir.id,
      esJefe: true,
      jerarquia: 'MAE',
    },
  });

  const funcionarioPasswordHash = await bcrypt.hash('funcionario123', 10);
  const funcionario = await prisma.usuario.upsert({
    where: { username: 'jflores' },
    update: {},
    create: {
      ci: '6192834',
      username: 'jflores',
      passwordHash: funcionarioPasswordHash,
      nombres: 'Jorge',
      apellidos: 'Flores Vargas',
      email: 'jflores@entidad.bo',
      cargo: 'Especialista en Infraestructura y Redes',
      telefono: '76543210',
      rol: RolUsuario.FUNCIONARIO,
      accesoActivos: false,
      accesoAlmacenes: false,
      unidadId: unidadTIC.id,
    },
  });

  // Configuración Inicial del Sistema
  await prisma.configuracionSistema.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      nombreEntidad: 'Cooperativa de Telecomunicaciones y Servicios',
      siglaEntidad: 'COOP',
      regimenNormativo: 'PUBLICO',
      modalidadAdministracion: 'DESCENTRALIZADA',
      exigirCite: true,
      responsableActivosId: respActivos.id,
      responsableAlmacenesId: respAlmacenes.id,
      ssoAuthentikHabilitado: true,
      authentikIssuerUrl: 'https://auth.marabuntarl.com/application/o/intranet/',
      authentikLdapUrl: 'ldap://localhost:389',
    },
  });

  // 5. Cuentas Contables y Auxiliares
  const cuentaComputo = await prisma.cuentaContable.upsert({
    where: { codigo: 12400 },
    update: {},
    create: {
      codigo: 12400,
      nombre: 'Equipo de Computación',
      vidaUtilMeses: 48,
      depreciar: true,
      actualizar: true,
    },
  });

  const cuentaMuebles = await prisma.cuentaContable.upsert({
    where: { codigo: 12500 },
    update: {},
    create: {
      codigo: 12500,
      nombre: 'Muebles y Enseres de Oficina',
      vidaUtilMeses: 120,
      depreciar: true,
      actualizar: true,
    },
  });

  const cuentaVehiculos = await prisma.cuentaContable.upsert({
    where: { codigo: 12600 },
    update: {},
    create: {
      codigo: 12600,
      nombre: 'Vehículos Automotores',
      vidaUtilMeses: 60,
      depreciar: true,
      actualizar: true,
    },
  });

  // Auxiliares
  const auxLaptops = await prisma.auxiliar.upsert({
    where: {
      cuentaContableId_codigo: {
        cuentaContableId: cuentaComputo.id,
        codigo: 101,
      },
    },
    update: {},
    create: {
      codigo: 101,
      nombre: 'Computadoras Portátiles / Laptops',
      cuentaContableId: cuentaComputo.id,
    },
  });

  const auxServidores = await prisma.auxiliar.upsert({
    where: {
      cuentaContableId_codigo: {
        cuentaContableId: cuentaComputo.id,
        codigo: 102,
      },
    },
    update: {},
    create: {
      codigo: 102,
      nombre: 'Servidores de Red y Almacenamiento',
      cuentaContableId: cuentaComputo.id,
    },
  });

  const auxEscritorios = await prisma.auxiliar.upsert({
    where: {
      cuentaContableId_codigo: {
        cuentaContableId: cuentaMuebles.id,
        codigo: 201,
      },
    },
    update: {},
    create: {
      codigo: 201,
      nombre: 'Escritorios Ejecutivos de Madera y Metal',
      cuentaContableId: cuentaMuebles.id,
    },
  });

  // 6. Proveedores
  let provQuipus = await prisma.proveedor.findFirst({
    where: { nit: '1028374023' },
  });
  if (!provQuipus) {
    provQuipus = await prisma.proveedor.create({
      data: {
        nit: '1028374023',
        razonSocial: 'QUIPUS EMPRESA PUBLICA PRODUCTIVA',
        contacto: 'Ing. Fernando Rocha',
        telefono: '2113344',
        direccion: 'Av. Camacho, Edif. La Urbana Piso 2',
      },
    });
  }

  // 7. Gestión 2026 y UFV
  await prisma.gestion.upsert({
    where: { anio: 2026 },
    update: {},
    create: {
      anio: 2026,
      cerrado: false,
    },
  });

  const fechaHoy = new Date();
  fechaHoy.setHours(0, 0, 0, 0);

  await prisma.ufv.upsert({
    where: { fecha: fechaHoy },
    update: {},
    create: {
      fecha: fechaHoy,
      valor: 2.51842,
    },
  });

  // 8. Ingreso de Activos y Activos Fijos Iniciales
  let ingreso1 = await prisma.ingresoActivo.findFirst({
    where: { facturaNumero: 'F-8921' },
  });
  if (!ingreso1) {
    ingreso1 = await prisma.ingresoActivo.create({
      data: {
        fecha: new Date(),
        tipoIngreso: TipoIngreso.COMPRA,
        proveedorId: provQuipus.id,
        facturaNumero: 'F-8921',
        facturaAutorizacion: '782910293849',
        facturaFecha: new Date(),
        nroC31: 'C31-2026-0045',
        notaEntregaNumero: 'NE-0012',
        documentoCite: 'ENT-UAF-CITE-2026-0034',
        total: 18500.0,
        observacion: 'Adquisición de equipamiento informático para el personal técnico',
        creadoPorId: respActivos.id,
      },
    });
  }

  await prisma.activo.upsert({
    where: { codigoBarras: 'ENT-12400-0001' },
    update: {},
    create: {
      codigoBarras: 'ENT-12400-0001',
      descripcion: 'Laptop Quipus Kuti Ultra Core i7 32GB RAM 1TB SSD',
      detalle: 'Teclado retroiluminado en español, cargador original y funda',
      marca: 'QUIPUS',
      modelo: 'KUTI-ULTRA-2026',
      serie: 'QP-2026-9921',
      color: 'Gris Espacial',
      material: 'Aluminio reforzado',
      medidas: '35x24x1.8 cm',
      estado: EstadoActivo.BUENO,
      precioInicial: 9250.0,
      valorResidual: 1.0,
      depreciacionAcumulada: 0.0,
      vidaUtilRestanteMeses: 48,
      cuentaContableId: cuentaComputo.id,
      auxiliarId: auxLaptops.id,
      usuarioCustodioId: funcionario.id,
      ubicacion: 'Piso 4 - Área de Servidores y Redes',
      ingresoId: ingreso1.id,
    },
  });

  await prisma.activo.upsert({
    where: { codigoBarras: 'ENT-12400-0002' },
    update: {},
    create: {
      codigoBarras: 'ENT-12400-0002',
      descripcion: 'Laptop Quipus Kuti Ultra Core i7 32GB RAM 1TB SSD',
      detalle: 'Teclado retroiluminado en español, cargador original y funda',
      marca: 'QUIPUS',
      modelo: 'KUTI-ULTRA-2026',
      serie: 'QP-2026-9922',
      color: 'Gris Espacial',
      material: 'Aluminio reforzado',
      medidas: '35x24x1.8 cm',
      estado: EstadoActivo.BUENO,
      precioInicial: 9250.0,
      valorResidual: 1.0,
      depreciacionAcumulada: 0.0,
      vidaUtilRestanteMeses: 48,
      cuentaContableId: cuentaComputo.id,
      auxiliarId: auxLaptops.id,
      usuarioCustodioId: adminUser.id,
      ubicacion: 'Piso 4 - Dirección de Tecnologías',
      ingresoId: ingreso1.id,
    },
  });

  // 9. Almacenes: Central y Sub-almacenes dependientes
  const almCentral = await prisma.almacen.upsert({
    where: { codigo: 'ALM-CENTRAL' },
    update: {},
    create: {
      codigo: 'ALM-CENTRAL',
      nombre: 'Almacén Central - Sede La Paz',
      direccion: 'Edificio Central Telecomunicaciones, Planta Baja',
      esCentral: true,
      edificioId: edificio.id,
      responsableId: respActivos.id,
    },
  });

  const subAlmElAlto = await prisma.almacen.upsert({
    where: { codigo: 'SUB-EL-ALTO' },
    update: {},
    create: {
      codigo: 'SUB-EL-ALTO',
      nombre: 'Sub-Almacén Regional El Alto (Sucursal)',
      direccion: 'Av. 6 de Marzo, Sucursal Regional El Alto',
      esCentral: false,
      almacenPadreId: almCentral.id,
      responsableId: funcionario.id,
    },
  });

  const subAlmCochabamba = await prisma.almacen.upsert({
    where: { codigo: 'SUB-COCHABAMBA' },
    update: {},
    create: {
      codigo: 'SUB-COCHABAMBA',
      nombre: 'Sub-Almacén Sucursal Cochabamba',
      direccion: 'Av. Ballivián (El Prado) Nro 450, Cochabamba',
      esCentral: false,
      almacenPadreId: almCentral.id,
    },
  });

  // 10. Materiales y Subartículos
  const matEscritorio = await prisma.material.upsert({
    where: { codigo: 'MAT-ESC' },
    update: {},
    create: {
      codigo: 'MAT-ESC',
      descripcion: 'Material y Útiles de Escritorio',
    },
  });

  const matComputacion = await prisma.material.upsert({
    where: { codigo: 'MAT-COMP' },
    update: {},
    create: {
      codigo: 'MAT-COMP',
      descripcion: 'Insumos y Repuestos Computacionales',
    },
  });

  const subPapel = await prisma.subarticulo.upsert({
    where: { codigo: 30001 },
    update: {},
    create: {
      codigo: 30001,
      descripcion: 'Papel Bond A4 75g de 500 hojas',
      unidadMedida: 'Resma',
      stockActual: 120,
      costoUnitarioPromedio: 33.5,
      materialId: matEscritorio.id,
    },
  });

  const subToner = await prisma.subarticulo.upsert({
    where: { codigo: 30002 },
    update: {},
    create: {
      codigo: 30002,
      descripcion: 'Tóner HP LaserJet Negro Original CF226A',
      unidadMedida: 'Pieza',
      stockActual: 15,
      costoUnitarioPromedio: 460.0,
      materialId: matComputacion.id,
    },
  });

  // Stocks por Almacén
  // Central: 100 resmas, 12 tóners
  await prisma.stockAlmacen.upsert({
    where: {
      almacenId_subarticuloId: {
        almacenId: almCentral.id,
        subarticuloId: subPapel.id,
      },
    },
    update: {},
    create: {
      almacenId: almCentral.id,
      subarticuloId: subPapel.id,
      stockActual: 100,
      costoPromedio: 33.5,
      stockMinimo: 10,
      ubicacionEstante: 'Estante 01 - Fila A',
    },
  });

  await prisma.stockAlmacen.upsert({
    where: {
      almacenId_subarticuloId: {
        almacenId: almCentral.id,
        subarticuloId: subToner.id,
      },
    },
    update: {},
    create: {
      almacenId: almCentral.id,
      subarticuloId: subToner.id,
      stockActual: 12,
      costoPromedio: 460.0,
      stockMinimo: 2,
      ubicacionEstante: 'Gabinete Blindado 02',
    },
  });

  // Sub-Almacén El Alto (Asignado desde Central): 20 resmas, 3 tóners
  await prisma.stockAlmacen.upsert({
    where: {
      almacenId_subarticuloId: {
        almacenId: subAlmElAlto.id,
        subarticuloId: subPapel.id,
      },
    },
    update: {},
    create: {
      almacenId: subAlmElAlto.id,
      subarticuloId: subPapel.id,
      stockActual: 20,
      costoPromedio: 33.5,
      stockMinimo: 5,
      ubicacionEstante: 'Estante Regional 01',
    },
  });

  await prisma.stockAlmacen.upsert({
    where: {
      almacenId_subarticuloId: {
        almacenId: subAlmElAlto.id,
        subarticuloId: subToner.id,
      },
    },
    update: {},
    create: {
      almacenId: subAlmElAlto.id,
      subarticuloId: subToner.id,
      stockActual: 3,
      costoPromedio: 460.0,
      stockMinimo: 1,
      ubicacionEstante: 'Estante Regional 02',
    },
  });

  // 9. Clasificadores Presupuestarios Oficiales Gestión 2027 (MEFP - RM Nº 271)
  for (const mat of CLASIFICADOR_MATERIALES_2027) {
    await prisma.material.upsert({
      where: { codigo: mat.codigo },
      update: { descripcion: mat.descripcion },
      create: { codigo: mat.codigo, descripcion: mat.descripcion, activo: true },
    });
  }

  for (const cta of CLASIFICADOR_ACTIVOS_2027) {
    const cuenta = await prisma.cuentaContable.upsert({
      where: { codigo: cta.codigo },
      update: {
        nombre: cta.nombre,
        vidaUtilMeses: cta.vidaUtilMeses,
        depreciar: cta.depreciar,
        actualizar: cta.actualizar,
      },
      create: {
        codigo: cta.codigo,
        nombre: cta.nombre,
        vidaUtilMeses: cta.vidaUtilMeses,
        depreciar: cta.depreciar,
        actualizar: cta.actualizar,
        activo: true,
      },
    });
    for (const aux of cta.auxiliares) {
      await prisma.auxiliar.upsert({
        where: {
          cuentaContableId_codigo: {
            cuentaContableId: cuenta.id,
            codigo: aux.codigo,
          },
        },
        update: { nombre: aux.nombre },
        create: {
          cuentaContableId: cuenta.id,
          codigo: aux.codigo,
          nombre: aux.nombre,
          activo: true,
        },
      });
    }
  }

  console.log('✅ Seed completado con éxito:');
  console.log(` - Clasificador Presupuestario 2027: ${CLASIFICADOR_MATERIALES_2027.length} partidas 30000, ${CLASIFICADOR_ACTIVOS_2027.length} cuentas 40000`);
  console.log(` - Entidad: ${entidad.nombre}`);
  console.log(` - Almacén Central: ${almCentral.nombre}`);
  console.log(` - Sub-almacén Sucursal: ${subAlmElAlto.nombre} (Hijo dependiente)`);
  console.log(` - Sub-almacén Sucursal: ${subAlmCochabamba.nombre} (Hijo dependiente)`);
  console.log(` - Super Admin: admin / admin123`);
  console.log(` - Admin Activos: admin_activos / activos123`);
  console.log(` - Funcionario: jflores / funcionario123`);
  console.log(` - Activos Creados: 2`);
  console.log(` - Subartículos de Almacén: ${subPapel.descripcion}, ${subToner.descripcion}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
