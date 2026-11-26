import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE (375px)', width: 375, height: 667 },
  { name: 'Galaxy S20 (360px)', width: 360, height: 800 },
  { name: 'Pixel 7 (412px)', width: 412, height: 915 },
];

const PAGES_TO_TEST = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Activos Fijos', path: '/activos' },
  { name: 'Almacenes y Suministros', path: '/almacenes' },
  { name: 'Entidades Matriz e Hijas', path: '/entidades' },
  { name: 'Catálogo de Proveedores', path: '/proveedores' },
  { name: 'Seguros y Pólizas', path: '/seguros' },
  { name: 'Gestiones y UFV', path: '/gestiones' },
  { name: 'Verificación QR', path: '/verificar/activo' },
];

for (const vp of MOBILE_VIEWPORTS) {
  test.describe(`Mobile Overflow Audit - ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`Verify 0 horizontal overflow across all pages at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // 1. Iniciar sesión
      await page.goto('http://localhost:8086/login');
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      for (const p of PAGES_TO_TEST) {
        await page.goto(`http://localhost:8086${p.path}`);
        await page.waitForLoadState('networkidle');

        // Evaluar overflow horizontal en la página
        const overflowData = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          const winWidth = window.innerWidth;

          // Buscar elementos individuales que se desborden
          const overflowingElements: Array<{ tag: string; className: string; id: string; rectWidth: number }> = [];
          document.querySelectorAll('*').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1) {
              overflowingElements.push({
                tag: el.tagName,
                className: (el as HTMLElement).className || '',
                id: el.id || '',
                rectWidth: Math.round(rect.width),
              });
            }
          });

          return {
            winWidth,
            docWidth,
            bodyWidth,
            hasDocOverflow: docWidth > winWidth,
            hasBodyOverflow: bodyWidth > winWidth,
            overflowCount: overflowingElements.length,
            sampleOverflows: overflowingElements.slice(0, 5),
          };
        });

        console.log(`[${vp.name}] ${p.name}: win=${overflowData.winWidth}px, doc=${overflowData.docWidth}px, body=${overflowData.bodyWidth}px, overflows=${overflowData.overflowCount}`);

        expect(
          overflowData.hasDocOverflow,
          `Página ${p.name} desborda en ancho (${overflowData.docWidth}px > ${overflowData.winWidth}px). Elementos: ${JSON.stringify(overflowData.sampleOverflows)}`
        ).toBe(false);

        expect(
          overflowData.hasBodyOverflow,
          `Body de ${p.name} desborda en ancho (${overflowData.bodyWidth}px > ${overflowData.winWidth}px)`
        ).toBe(false);
      }
    });
  });
}
