import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LEGACY_URL = 'http://127.0.0.1:8888';
const V2_URL = 'http://127.0.0.1:8086';

test.describe('Contrastación y Auditoría de Accesibilidad (Axe-Core) NSIAF vs NSIAF v2', () => {

  // ========================================================
  // 1. PANTALLA DE LOGIN
  // ========================================================
  test('1. Pantalla de Login: Contrastación y Auditoría Axe', async ({ page }) => {
    // A. Evaluar NSIAF Legacy Login
    await page.goto(`${LEGACY_URL}/login`, { waitUntil: 'domcontentloaded' });
    const legacyAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n🏛️ [Legacy NSIAF] Violaciones de accesibilidad en Login: ${legacyAxe.violations.length}`);
    legacyAxe.violations.forEach((v) => {
      console.log(`   - [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`);
    });

    // B. Evaluar NSIAF v2 Login
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    const v2Axe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n⚡ [NSIAF v2] Violaciones de accesibilidad en Login: ${v2Axe.violations.length}`);
    if (v2Axe.violations.length > 0) {
      v2Axe.violations.forEach((v) => {
        console.log(`   - [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
      });
    }

    // Verificar que los controles esenciales existan y sean funcionales en v2
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // NSIAF v2 debe pasar la auditoría sin violaciones críticas
    const criticalViolations = v2Axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations, `Violaciones serias/críticas en login: ${JSON.stringify(criticalViolations, null, 2)}`).toHaveLength(0);
  });

  // ========================================================
  // 2. PANEL / DASHBOARD (BANDEJA PRINCIPAL)
  // ========================================================
  test('2. Panel de Control (Dashboard): Auditoría Axe', async ({ page }) => {
    // Iniciar sesión en v2
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar navegación al dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Panel de Control');

    // Ejecutar Axe
    const dashboardAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n⚡ [NSIAF v2] Violaciones de accesibilidad en Dashboard: ${dashboardAxe.violations.length}`);
    const criticalViolations = dashboardAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations).toHaveLength(0);
  });

  // ========================================================
  // 3. MÓDULO ACTIVOS FIJOS (BANDEJA, FORMULARIO Y VISOR PDF)
  // ========================================================
  test('3. Activos Fijos: Bandeja, Formularios y Visor PDF', async ({ page }) => {
    // Autenticación
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navegar a Activos Fijos
    await page.click('a[routerLink="/activos"]');
    await page.waitForURL('**/activos');
    await expect(page.locator('h1')).toContainText('Gestión de Activos Fijos');

    // A. Auditoría Axe de Bandeja de Activos
    const activosAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n⚡ [NSIAF v2] Violaciones en Bandeja de Activos Fijos: ${activosAxe.violations.length}`);
    expect(activosAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);

    // B. Auditoría de Formulario "Nuevo Activo Fijo"
    await page.click('button[aria-label="Registrar nuevo bien de uso o activo fijo"]');
    await expect(page.locator('#modal-nuevo-title')).toBeVisible();

    const formNuevoAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Formulario Nuevo Activo: ${formNuevoAxe.violations.length}`);
    expect(formNuevoAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar formulario de nuevo activo"]');

    // C. Auditoría de Formulario "Asignación / Acta de Custodia"
    await page.click('button[aria-label="Generar acta oficial de entrega o asignación"]');
    await expect(page.locator('#modal-acta-title')).toBeVisible();

    const formActaAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Formulario Asignación/Acta: ${formActaAxe.violations.length}`);
    expect(formActaAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar formulario de asignación"]');

    // D. Auditoría y Apertura de Visor PDF Oficial
    const primerPdfBtn = page.locator('button.pdf-btn').first();
    if (await primerPdfBtn.isVisible()) {
      await primerPdfBtn.click();
      await expect(page.locator('#pdf-dialog-title')).toBeVisible();
      await page.waitForTimeout(600);

      const pdfDialogAxe = await new AxeBuilder({ page: page as any })
        .include('.pdf-modal-container')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      console.log(`⚡ [NSIAF v2] Violaciones en Visor Oficial de PDF: ${pdfDialogAxe.violations.length}`);
      expect(pdfDialogAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
      await page.click('button[aria-label="Cerrar visor de documento"]');
    }
  });

  // ========================================================
  // 4. MÓDULO ALMACENES (BANDEJA, SUB-ALMACENES, FORMS Y KARDEX PDF)
  // ========================================================
  test('4. Almacenes: Existencias, Sub-Almacenes, Formularios y Kardex PDF', async ({ page }) => {
    // Autenticación
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navegar a Almacenes
    await page.click('a[routerLink="/almacenes"]');
    await page.waitForURL('**/almacenes');
    await expect(page.locator('h1')).toContainText('Almacén Central y Sub-Almacenes');

    // A. Auditoría Axe de Bandeja de Almacenes
    const almacenesAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n⚡ [NSIAF v2] Violaciones en Bandeja de Almacenes: ${almacenesAxe.violations.length}`);
    expect(almacenesAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);

    // B. Comprobar existencia y jerarquía de Sub-Almacenes de Sucursal
    const tabs = page.locator('.tab-btn');
    const cantidadAlmacenes = await tabs.count();
    console.log(`🏢 Cantidad de Almacenes/Sucursales detectados: ${cantidadAlmacenes}`);
    expect(cantidadAlmacenes).toBeGreaterThanOrEqual(2);

    // C. Auditoría Formulario Nota de Ingreso / Compra
    await page.click('button[aria-label="Registrar nueva nota de ingreso o compra"]');
    await expect(page.locator('#modal-ingreso-title')).toBeVisible();

    const ingresoAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Formulario Nota de Ingreso: ${ingresoAxe.violations.length}`);
    expect(ingresoAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar modal de ingreso"]');

    // D. Auditoría Formulario Dotación / Traspaso a Sucursal
    await page.click('button[aria-label="Dotar o traspasar suministros a sucursal"]');
    await expect(page.locator('#modal-traspaso-title')).toBeVisible();

    const traspasoAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Formulario Dotación a Sucursal: ${traspasoAxe.violations.length}`);
    expect(traspasoAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar modal de dotación"]');

    // E. Auditoría Formulario Crear Sub-Almacén
    await page.click('button[aria-label="Crear nueva sucursal o subalmacén"]');
    await expect(page.locator('#modal-subalmacen-title')).toBeVisible();

    const subalmacenAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Formulario Crear Sub-Almacén: ${subalmacenAxe.violations.length}`);
    expect(subalmacenAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar modal de creación de subalmacén"]');

    // F. Auditoría de Kardex Físico-Valorado en PDF
    const pdfKardexBtn = page.locator('button.pdf-kardex-btn').first();
    if (await pdfKardexBtn.isVisible()) {
      await pdfKardexBtn.click();
      await expect(page.locator('#pdf-dialog-title')).toBeVisible();

      const kardexPdfAxe = await new AxeBuilder({ page: page as any })
        .include('.pdf-modal-container')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      console.log(`⚡ [NSIAF v2] Violaciones en Visor Kardex PDF: ${kardexPdfAxe.violations.length}`);
      expect(kardexPdfAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
      await page.click('button[aria-label="Cerrar visor de documento"]');
    }
  });

  // ========================================================
  // 5. GESTIÓN JERÁRQUICA DE ENTIDADES E INSTITUCIONES
  // ========================================================
  test('5. Módulo de Entidades e Instituciones: Estructura Jerárquica y Auditoría Axe', async ({ page }) => {
    // Iniciar sesión en v2
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navegar a Entidades
    await page.goto(`${V2_URL}/entidades`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Estructura Organizacional: Entidades e Instituciones');

    // Comprobar aviso de administración back-office
    await expect(page.locator('.header-badge-scope')).toBeVisible();

    // Comprobar presencia de Entidad principal (ADSIB)
    await expect(page.locator('.entidad-card').first()).toBeVisible();

    // Auditoría de Accesibilidad Axe
    const entidadesAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Módulo Entidades: ${entidadesAxe.violations.length}`);
    expect(entidadesAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);

    // Abrir modal de nueva institución / edificio hijo
    await page.locator('.btn-add-inst').first().click();
    await expect(page.locator('#modal-inst-title')).toBeVisible();

    const instModalAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Modal Nueva Institución: ${instModalAxe.violations.length}`);
    expect(instModalAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar modal de institución"]');
  });

  // ========================================================
  // 6. CATÁLOGO Y GESTIÓN DE PROVEEDORES
  // ========================================================
  test('6. Catálogo de Proveedores: Búsqueda, Métricas y Auditoría Axe', async ({ page }) => {
    // Iniciar sesión en v2
    await page.goto(`${V2_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navegar a Proveedores
    await page.goto(`${V2_URL}/proveedores`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Gestión de Proveedores');

    // Comprobar tarjetas de métricas
    await expect(page.locator('.kpi-card').first()).toBeVisible();

    // Comprobar búsqueda de proveedor
    await page.fill('#search-prov-input', 'Quipus');
    await page.click('button[aria-label="Ejecutar búsqueda"]');

    // Auditoría de Accesibilidad Axe
    const provAxe = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Módulo Proveedores: ${provAxe.violations.length}`);
    expect(provAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);

    // Abrir modal de registro de nuevo proveedor
    await page.click('button[aria-label="Registrar nuevo proveedor"]');
    await expect(page.locator('#modal-prov-title')).toBeVisible();

    const provModalAxe = await new AxeBuilder({ page: page as any })
      .include('.modal-panel')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`⚡ [NSIAF v2] Violaciones en Modal Nuevo Proveedor: ${provModalAxe.violations.length}`);
    expect(provModalAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toHaveLength(0);
    await page.click('button[aria-label="Cerrar modal de proveedor"]');
  });

});
