import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivosService } from '../../core/services/activos.service';
import { VisorPdfDialogComponent } from '../../shared/components/visor-pdf/visor-pdf-dialog.component';

@Component({
  selector: 'app-activos-operaciones-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <section class="ops-wrapper">
      <nav class="ops-tabs">
        <button type="button" [class.active]="tab() === 'SOLICITUDES'" (click)="cambiarTab('SOLICITUDES')">
          <span class="material-icons">inbox</span>
          <span>Solicitudes Funcionarios ({{ solicitudesPendientesCount() }})</span>
        </button>
        <button type="button" [class.active]="tab() === 'ACTAS'" (click)="cambiarTab('ACTAS')">
          <span class="material-icons">description</span>
          <span>Historial de Actas ({{ actas().length }})</span>
        </button>
        <button type="button" [class.active]="tab() === 'BAJAS'" (click)="cambiarTab('BAJAS')">
          <span class="material-icons">delete_sweep</span>
          <span>Bajas de Activos ({{ bajas().length }})</span>
        </button>
        <button type="button" [class.active]="tab() === 'CUENTAS'" (click)="cambiarTab('CUENTAS')">
          <span class="material-icons">account_balance_wallet</span>
          <span>Rubros / Cuentas 40000 ({{ cuentas().length }})</span>
        </button>
      </nav>

      <!-- TAB 1: SOLICITUDES DE FUNCIONARIOS -->
      @if (tab() === 'SOLICITUDES') {
        <div class="ops-body">
          @if (solicitudes().length === 0) {
            <p class="empty-msg">No existen solicitudes de asignación o devolución enviadas desde el Portal del Solicitante.</p>
          } @else {
            <div class="table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>Nro / Fecha</th>
                    <th>Tipo</th>
                    <th>Solicitante</th>
                    <th>Descripción / Justificación</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of solicitudes(); track s.id) {
                    <tr>
                      <td class="mono">#{{ s.numero }}<br><small>{{ s.fecha | date:'dd/MM/yyyy' }}</small></td>
                      <td><span class="chip">{{ s.tipo }}</span></td>
                      <td>
                        <strong>{{ s.solicitante?.nombres }} {{ s.solicitante?.apellidos }}</strong>
                        <small style="display:block;color:#64748b;">{{ s.solicitante?.unidad?.nombre || 'Sin unidad' }}</small>
                      </td>
                      <td>
                        <strong>{{ s.descripcion }}</strong>
                        <small style="display:block;color:#64748b;">{{ s.justificacion || '—' }}</small>
                      </td>
                      <td><span class="estado-pill" [ngClass]="s.estado.toLowerCase()">{{ s.estado }}</span></td>
                      <td style="text-align:right;">
                        @if (s.estado === 'PENDIENTE') {
                          <button type="button" class="btn-sm ok" (click)="resolverSolicitud(s.id, 'APROBADA')">Aprobar</button>
                          <button type="button" class="btn-sm err" (click)="resolverSolicitud(s.id, 'RECHAZADA')">Rechazar</button>
                        } @else if (s.estado === 'APROBADA') {
                          <button type="button" class="btn-sm info" (click)="resolverSolicitud(s.id, 'ENTREGADA')">Marcar Entregada</button>
                        } @else {
                          <small class="text-muted">Atendida</small>
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

      <!-- TAB 2: HISTORIAL DE ACTAS -->
      @if (tab() === 'ACTAS') {
        <div class="ops-body">
          @if (actas().length === 0) {
            <p class="empty-msg">Aún no se han emitido actas de entrega o devolución.</p>
          } @else {
            <div class="table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>Acta #</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Funcionario</th>
                    <th>CITE</th>
                    <th style="text-align:right;">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of actas(); track a.id) {
                    <tr>
                      <td class="mono">#{{ a.numero }}</td>
                      <td><span class="chip">{{ a.tipo }}</span></td>
                      <td>{{ a.fecha | date:'dd/MM/yyyy' }}</td>
                      <td>{{ a.usuarioFuncionario?.nombres }} {{ a.usuarioFuncionario?.apellidos }}</td>
                      <td class="mono">{{ a.documentoCite || 'S/CITE' }}</td>
                      <td style="text-align:right;">
                        <button type="button" class="btn-sm info" (click)="abrirActaPdf(a.id)">Ver PDF</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 3: BAJAS DE ACTIVOS -->
      @if (tab() === 'BAJAS') {
        <div class="ops-body">
          <div class="ops-toolbar">
            <h3>Registro de Bajas Definitivas</h3>
            <button type="button" class="btn-sm err" (click)="mostrarFormBaja.set(!mostrarFormBaja())">
              {{ mostrarFormBaja() ? 'Ocultar Formulario' : '+ Registrar Nueva Baja' }}
            </button>
          </div>

          @if (mostrarFormBaja()) {
            <div class="inline-form">
              <select [(ngModel)]="bajaForm.activoId">
                <option value="">-- Seleccionar Activo Vigente --</option>
                @for (act of activosDisponibles(); track act.id) {
                  <option [value]="act.id">{{ act.codigoBarras }} · {{ act.descripcion }}</option>
                }
              </select>
              <input type="text" [(ngModel)]="bajaForm.motivo" placeholder="Motivo de baja (Obsolescencia, Daño irreparable...)" />
              <input type="text" [(ngModel)]="bajaForm.documentoCite" placeholder="Documento CITE / Resolución" />
              <button type="button" class="btn-sm err" (click)="confirmarBaja()">Confirmar Baja</button>
            </div>
          }

          @if (bajas().length === 0) {
            <p class="empty-msg">No existen activos dados de baja registrados.</p>
          } @else {
            <div class="table-scroll">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>Nro / Fecha</th>
                    <th>Motivo</th>
                    <th>CITE</th>
                    <th>Activos Incluidos</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of bajas(); track b.id) {
                    <tr>
                      <td class="mono">#{{ b.numero }}<br><small>{{ b.fecha | date:'dd/MM/yyyy' }}</small></td>
                      <td><strong>{{ b.motivo }}</strong></td>
                      <td class="mono">{{ b.documentoCite || '—' }}</td>
                      <td>{{ b.activosDadosDeBaja?.length || 0 }} bien(es)</td>
                      <td>{{ b.usuario?.nombres }} {{ b.usuario?.apellidos }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 4: CUENTAS CONTABLES 40000 Y AUXILIARES -->
      @if (tab() === 'CUENTAS') {
        <div class="ops-body">
          <div class="ops-toolbar">
            <h3>Catálogo Contable Grupo 40000 (Clasificador Presupuestario 2027)</h3>
            <button type="button" class="btn-sm info" (click)="mostrarFormCuenta.set(!mostrarFormCuenta())">
              {{ mostrarFormCuenta() ? 'Cerrar' : '+ Nueva Cuenta Contable' }}
            </button>
          </div>

          @if (mostrarFormCuenta()) {
            <div class="inline-form">
              <input type="number" [(ngModel)]="cuentaForm.codigo" placeholder="Código (Ej: 43800)" />
              <input type="text" [(ngModel)]="cuentaForm.nombre" placeholder="Nombre del rubro contable" />
              <input type="number" [(ngModel)]="cuentaForm.vidaUtilMeses" placeholder="Vida útil (meses)" />
              <button type="button" class="btn-sm ok" (click)="crearCuenta()">Guardar Cuenta</button>
            </div>
          }

          <div class="table-scroll">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cuenta Contable / Rubro</th>
                  <th>Vida Útil</th>
                  <th>Auxiliares</th>
                  <th>Activos</th>
                </tr>
              </thead>
              <tbody>
                @for (c of cuentas(); track c.id) {
                  <tr>
                    <td class="mono">{{ c.codigo }}</td>
                    <td><strong>{{ c.nombre }}</strong></td>
                    <td>{{ c.vidaUtilMeses }} meses ({{ (c.vidaUtilMeses / 12) | number:'1.0-1' }} años)</td>
                    <td>
                      <div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                        @for (aux of c.auxiliares || []; track aux.id) {
                          <span class="chip">{{ aux.codigo }}-{{ aux.nombre }}</span>
                        }
                      </div>
                    </td>
                    <td><strong>{{ c._count?.activos || 0 }}</strong></td>
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
    .ops-tabs { display: flex; gap: 0.25rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.5rem; overflow-x: auto; }
    .ops-tabs button { display: inline-flex; align-items: center; gap: 0.4rem; border: none; background: transparent; padding: 0.55rem 0.9rem; border-radius: 8px; font-weight: 600; font-size: 0.84rem; color: #475569; cursor: pointer; white-space: nowrap; }
    .ops-tabs button.active { background: #0f172a; color: #fff; }
    .ops-body { padding: 1rem 1.25rem; }
    .ops-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem; }
    .ops-toolbar h3 { margin: 0; font-size: 1rem; color: #0f172a; }
    .inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; background: #f8fafc; padding: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; }
    .inline-form input, .inline-form select { padding: 0.45rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.86rem; flex: 1; min-width: 170px; }
    .table-scroll { overflow-x: auto; }
    .ops-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .ops-table th { text-align: left; padding: 0.65rem 0.75rem; background: #f8fafc; color: #475569; font-size: 0.74rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .ops-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .mono { font-family: monospace; font-weight: 600; }
    .chip { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 0.15rem 0.45rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
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
export class ActivosOperacionesPanelComponent implements OnInit {
  @Output() datosActualizados = new EventEmitter<void>();

  tab = signal<'SOLICITUDES' | 'ACTAS' | 'BAJAS' | 'CUENTAS'>('SOLICITUDES');
  solicitudes = signal<any[]>([]);
  actas = signal<any[]>([]);
  bajas = signal<any[]>([]);
  cuentas = signal<any[]>([]);
  activosDisponibles = signal<any[]>([]);

  mostrarFormBaja = signal<boolean>(false);
  mostrarFormCuenta = signal<boolean>(false);

  bajaForm = { activoId: '', motivo: '', documentoCite: '' };
  cuentaForm = { codigo: null as any, nombre: '', vidaUtilMeses: 48 };

  constructor(
    private activosService: ActivosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  solicitudesPendientesCount(): number {
    return this.solicitudes().filter((s) => s.estado === 'PENDIENTE').length;
  }

  cambiarTab(t: 'SOLICITUDES' | 'ACTAS' | 'BAJAS' | 'CUENTAS'): void {
    this.tab.set(t);
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.activosService.listarSolicitudes().subscribe({ next: (d) => this.solicitudes.set(d) });
    this.activosService.listarActas().subscribe({ next: (d) => this.actas.set(d?.data || d || []) });
    this.activosService.listarBajas().subscribe({ next: (d) => this.bajas.set(d) });
    this.activosService.listarCuentas().subscribe({ next: (d) => this.cuentas.set(d) });
    this.activosService.listar(1, 100).subscribe({
      next: (res) => this.activosDisponibles.set((res.data || []).filter((a: any) => !a.bajaId)),
    });
  }

  resolverSolicitud(id: string, estado: string): void {
    this.activosService.actualizarEstadoSolicitud(id, estado).subscribe({
      next: () => {
        this.snackBar.open(`Solicitud marcada como ${estado}`, 'OK', { duration: 2500 });
        this.cargarTodo();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al actualizar solicitud', 'Cerrar', { duration: 3000 }),
    });
  }

  abrirActaPdf(actaId: string): void {
    this.activosService.descargarActaPdf(actaId).subscribe({
      next: (blob) => {
        this.dialog.open(VisorPdfDialogComponent, {
          width: '92vw',
          maxWidth: '1100px',
          height: '88vh',
          data: { title: `Acta Oficial #${actaId.slice(0, 8)}`, pdfBlob: blob },
        });
      },
    });
  }

  confirmarBaja(): void {
    if (!this.bajaForm.activoId || !this.bajaForm.motivo) {
      this.snackBar.open('Selecciona un activo y especifica el motivo de baja.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.activosService
      .registrarBaja({
        activoIds: [this.bajaForm.activoId],
        motivo: this.bajaForm.motivo,
        documentoCite: this.bajaForm.documentoCite || undefined,
      })
      .subscribe({
        next: () => {
          this.bajaForm = { activoId: '', motivo: '', documentoCite: '' };
          this.mostrarFormBaja.set(false);
          this.snackBar.open('Baja de activo registrada correctamente', 'OK', { duration: 3000 });
          this.cargarTodo();
          this.datosActualizados.emit();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al registrar baja', 'Cerrar', { duration: 3500 }),
      });
  }

  crearCuenta(): void {
    if (!this.cuentaForm.codigo || !this.cuentaForm.nombre) {
      this.snackBar.open('Código y nombre de cuenta son obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.activosService.crearCuenta(this.cuentaForm).subscribe({
      next: () => {
        this.cuentaForm = { codigo: null, nombre: '', vidaUtilMeses: 48 };
        this.mostrarFormCuenta.set(false);
        this.snackBar.open('Cuenta contable creada', 'OK', { duration: 2500 });
        this.cargarTodo();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear cuenta', 'Cerrar', { duration: 3500 }),
    });
  }
}
