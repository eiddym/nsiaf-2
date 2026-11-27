import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlmacenesClientService } from '../../core/services/almacenes-client.service';
import { VisorPdfDialogComponent } from '../../shared/components/visor-pdf/visor-pdf-dialog.component';

@Component({
  selector: 'app-almacenes-operaciones-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <section class="ops-wrapper">
      <nav class="ops-tabs">
        <button type="button" [class.active]="tab() === 'SOLICITUDES'" (click)="cambiarTab('SOLICITUDES')">
          <span class="material-icons">assignment</span>
          <span>Bandeja Solicitudes ({{ solicitudesPendientes() }})</span>
        </button>
        <button type="button" [class.active]="tab() === 'INGRESOS'" (click)="cambiarTab('INGRESOS')">
          <span class="material-icons">receipt_long</span>
          <span>Historial Ingresos ({{ ingresos().length }})</span>
        </button>
        <button type="button" [class.active]="tab() === 'CATALOGO'" (click)="cambiarTab('CATALOGO')">
          <span class="material-icons">category</span>
          <span>Catálogo Grupo 30000 ({{ materiales().length }})</span>
        </button>
        <button type="button" class="pdf-tab-btn" (click)="abrirInventarioValoradoPdf()">
          <span class="material-icons">picture_as_pdf</span>
          <span>Inventario Valorado PDF</span>
        </button>
      </nav>

      <!-- TAB 1: BANDEJA DE SOLICITUDES -->
      @if (tab() === 'SOLICITUDES') {
        <div class="ops-body">
          @if (solicitudes().length === 0) {
            <p class="empty-msg">No hay solicitudes de suministros registradas.</p>
          } @else {
            <div class="table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>Nro / Fecha</th>
                    <th>Solicitante</th>
                    <th>Ítems Pedidos</th>
                    <th>CITE</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of solicitudes(); track s.id) {
                    <tr>
                      <td class="mono">#{{ s.numero }}<br><small>{{ s.fecha | date:'dd/MM/yyyy' }}</small></td>
                      <td>
                        <strong>{{ s.solicitante?.nombres }} {{ s.solicitante?.apellidos }}</strong>
                        <small style="display:block;color:#64748b;">{{ s.almacen?.nombre || 'Almacén Central' }}</small>
                      </td>
                      <td>
                        @for (d of s.detalles || []; track d.id) {
                          <div class="item-line">• {{ d.subarticulo?.descripcion }} (<strong>{{ d.cantidadSolicitada }}</strong>)</div>
                        }
                      </td>
                      <td class="mono">{{ s.documentoCite || '—' }}</td>
                      <td><span class="estado-pill" [ngClass]="s.estado.toLowerCase()">{{ s.estado }}</span></td>
                      <td style="text-align:right;">
                        @if (s.estado === 'PENDIENTE' || s.estado === 'APROBADA') {
                          <button type="button" class="btn-sm ok" (click)="entregar(s.id)">Entregar</button>
                          <button type="button" class="btn-sm err" (click)="rechazar(s.id)">Rechazar</button>
                        } @else {
                          <small style="color:#94a3b8;">Cerrada</small>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 2: HISTORIAL DE NOTAS DE INGRESO -->
      @if (tab() === 'INGRESOS') {
        <div class="ops-body">
          @if (ingresos().length === 0) {
            <p class="empty-msg">Aún no se han registrado notas de ingreso a almacén.</p>
          } @else {
            <div class="table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>Nro / Fecha</th>
                    <th>Almacén</th>
                    <th>Tipo / Proveedor</th>
                    <th>Factura / C-31</th>
                    <th>Ítems</th>
                    <th style="text-align:right;">Total (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ing of ingresos(); track ing.id) {
                    <tr>
                      <td class="mono">#{{ ing.numero }}<br><small>{{ ing.fecha | date:'dd/MM/yyyy' }}</small></td>
                      <td>{{ ing.almacen?.nombre || 'Central' }}</td>
                      <td>
                        <span class="chip">{{ ing.tipoIngreso }}</span>
                        <small style="display:block;color:#475569;">{{ ing.proveedor?.razonSocial || ing.entidadDonante || '—' }}</small>
                      </td>
                      <td class="mono">F: {{ ing.facturaNumero || '—' }} · C31: {{ ing.nroC31 || '—' }}</td>
                      <td>{{ ing.detalles?.length || 0 }} suministro(s)</td>
                      <td style="text-align:right;" class="mono">Bs. {{ ing.total | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 3: CATÁLOGO GRUPO 30000 (MATERIALES Y SUBARTÍCULOS) -->
      @if (tab() === 'CATALOGO') {
        <div class="ops-body">
          <div class="ops-toolbar">
            <h3>Partidas Presupuestarias Grupo 30000 (Clasificador MEFP 2027)</h3>
            <div style="display:flex;gap:0.4rem;">
              <button type="button" class="btn-sm info" (click)="mostrarFormMat.set(!mostrarFormMat())">+ Nueva Partida 30000</button>
              <button type="button" class="btn-sm ok" (click)="mostrarFormSub.set(!mostrarFormSub())">+ Nuevo Suministro</button>
            </div>
          </div>

          @if (mostrarFormMat()) {
            <div class="inline-form">
              <input type="text" [(ngModel)]="matForm.codigo" placeholder="Partida (Ej: 34300)" />
              <input type="text" [(ngModel)]="matForm.descripcion" placeholder="Descripción (Ej: Llantas y Neumáticos)" />
              <button type="button" class="btn-sm ok" (click)="guardarMaterial()">Guardar Partida</button>
            </div>
          }

          @if (mostrarFormSub()) {
            <div class="inline-form">
              <select [(ngModel)]="subForm.materialId">
                <option value="">-- Partida Grupo 30000 --</option>
                @for (m of materiales(); track m.id) {
                  <option [value]="m.id">{{ m.codigo }} - {{ m.descripcion }}</option>
                }
              </select>
              <input type="number" [(ngModel)]="subForm.codigo" placeholder="Código Ítem (Ej: 34301)" />
              <input type="text" [(ngModel)]="subForm.descripcion" placeholder="Nombre del suministro" />
              <input type="text" [(ngModel)]="subForm.unidadMedida" placeholder="Unidad (PIEZA, CAJA, LITRO...)" />
              <button type="button" class="btn-sm ok" (click)="guardarSubarticulo()">Crear Suministro</button>
            </div>
          }

          <div class="table-scroll">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Partida</th>
                  <th>Descripción Oficial (Grupo 30000)</th>
                  <th>Suministros Asociados</th>
                </tr>
              </thead>
              <tbody>
                @for (m of materiales(); track m.id) {
                  <tr>
                    <td class="mono">{{ m.codigo }}</td>
                    <td><strong>{{ m.descripcion }}</strong></td>
                    <td>{{ m._count?.subarticulos || 0 }} ítem(s)</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .ops-wrapper { margin-top: 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .ops-tabs { display: flex; gap: 0.25rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.5rem; overflow-x: auto; align-items: center; }
    .ops-tabs button { display: inline-flex; align-items: center; gap: 0.4rem; border: none; background: transparent; padding: 0.55rem 0.9rem; border-radius: 8px; font-weight: 600; font-size: 0.84rem; color: #475569; cursor: pointer; white-space: nowrap; }
    .ops-tabs button.active { background: #0f172a; color: #fff; }
    .ops-tabs button.pdf-tab-btn { margin-left: auto; background: #be123c; color: #fff; }
    .ops-body { padding: 1rem 1.25rem; }
    .ops-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem; }
    .ops-toolbar h3 { margin: 0; font-size: 1rem; color: #0f172a; }
    .inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; background: #f8fafc; padding: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; }
    .inline-form input, .inline-form select { padding: 0.45rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.86rem; flex: 1; min-width: 160px; }
    .table-scroll { overflow-x: auto; }
    .ops-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .ops-table th { text-align: left; padding: 0.65rem 0.75rem; background: #f8fafc; color: #475569; font-size: 0.74rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .ops-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .mono { font-family: monospace; font-weight: 600; }
    .chip { display: inline-block; background: #fdf2f8; color: #be185d; padding: 0.15rem 0.45rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
    .item-line { font-size: 0.82rem; color: #334155; }
    .estado-pill { padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
    .estado-pill.pendiente { background: #fef3c7; color: #92400e; }
    .estado-pill.aprobada { background: #dbeafe; color: #1d4ed8; }
    .estado-pill.entregada { background: #dcfce7; color: #166534; }
    .estado-pill.rechazada { background: #fee2e2; color: #991b1b; }
    .btn-sm { border: none; border-radius: 7px; padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin-left: 0.25rem; color: #fff; }
    .btn-sm.ok { background: #059669; }
    .btn-sm.err { background: #dc2626; }
    .btn-sm.info { background: #0284c7; }
    .empty-msg { text-align: center; color: #64748b; padding: 1.5rem 0; margin: 0; }
  `],
})
export class AlmacenesOperacionesPanelComponent implements OnInit {
  @Output() datosActualizados = new EventEmitter<void>();

  tab = signal<'SOLICITUDES' | 'INGRESOS' | 'CATALOGO'>('SOLICITUDES');
  solicitudes = signal<any[]>([]);
  ingresos = signal<any[]>([]);
  materiales = signal<any[]>([]);

  mostrarFormMat = signal<boolean>(false);
  mostrarFormSub = signal<boolean>(false);

  matForm = { codigo: '', descripcion: '' };
  subForm = { materialId: '', codigo: null as any, descripcion: '', unidadMedida: 'PIEZA' };

  constructor(
    private almacenesService: AlmacenesClientService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  solicitudesPendientes(): number {
    return this.solicitudes().filter((s) => s.estado === 'PENDIENTE').length;
  }

  cambiarTab(t: 'SOLICITUDES' | 'INGRESOS' | 'CATALOGO'): void {
    this.tab.set(t);
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.almacenesService.listarSolicitudes().subscribe({ next: (res) => this.solicitudes.set(res?.data || res || []) });
    this.almacenesService.listarIngresos().subscribe({ next: (res) => this.ingresos.set(res?.data || res || []) });
    this.almacenesService.listarMateriales().subscribe({ next: (res) => this.materiales.set(res || []) });
  }

  entregar(id: string): void {
    this.almacenesService.entregarSolicitud(id).subscribe({
      next: () => {
        this.snackBar.open('Pedido entregado y descontado de Kardex', 'OK', { duration: 3000 });
        this.cargarTodo();
        this.datosActualizados.emit();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al entregar pedido', 'Cerrar', { duration: 3500 }),
    });
  }

  rechazar(id: string): void {
    const motivo = prompt('Motivo de rechazo (opcional):') || 'Rechazada por administración de almacenes';
    this.almacenesService.rechazarSolicitud(id, motivo).subscribe({
      next: () => {
        this.snackBar.open('Solicitud rechazada', 'OK', { duration: 2500 });
        this.cargarTodo();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al rechazar', 'Cerrar', { duration: 3000 }),
    });
  }

  guardarMaterial(): void {
    if (!this.matForm.codigo || !this.matForm.descripcion) return;
    this.almacenesService.crearMaterial(this.matForm).subscribe({
      next: () => {
        this.matForm = { codigo: '', descripcion: '' };
        this.mostrarFormMat.set(false);
        this.snackBar.open('Partida Grupo 30000 registrada', 'OK', { duration: 2500 });
        this.cargarTodo();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear material', 'Cerrar', { duration: 3500 }),
    });
  }

  guardarSubarticulo(): void {
    if (!this.subForm.materialId || !this.subForm.codigo || !this.subForm.descripcion) return;
    this.almacenesService
      .crearSubarticulo({
        materialId: this.subForm.materialId,
        codigo: Number(this.subForm.codigo),
        descripcion: this.subForm.descripcion,
        unidadMedida: this.subForm.unidadMedida || 'PIEZA',
      })
      .subscribe({
        next: () => {
          this.subForm = { materialId: '', codigo: null, descripcion: '', unidadMedida: 'PIEZA' };
          this.mostrarFormSub.set(false);
          this.snackBar.open('Suministro creado en el catálogo', 'OK', { duration: 2500 });
          this.cargarTodo();
          this.datosActualizados.emit();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear suministro', 'Cerrar', { duration: 3500 }),
      });
  }

  abrirInventarioValoradoPdf(): void {
    this.almacenesService.descargarInventarioValoradoPdf().subscribe({
      next: (blob) => {
        this.dialog.open(VisorPdfDialogComponent, {
          width: '92vw',
          maxWidth: '1100px',
          height: '88vh',
          data: { title: 'Inventario Físico Valorado de Almacenes (Grupo 30000)', pdfBlob: blob },
        });
      },
      error: () => this.snackBar.open('Error generando PDF de inventario valorado', 'Cerrar', { duration: 3000 }),
    });
  }
}
