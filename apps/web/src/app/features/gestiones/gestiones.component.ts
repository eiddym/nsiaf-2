import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GestionesService, Gestion, Ufv } from '../../core/services/gestiones.service';

@Component({
  selector: 'app-gestiones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="gestiones-container">
      <!-- Header -->
      <header class="header">
        <div class="header-titles">
          <h1>Gestiones Fiscales, Cierre Anual y Cotizaciones UFV</h1>
          <p>Administración de periodos fiscales según D.S. 24051, depreciación anual y registro diario de la Unidad de Fomento a la Vivienda.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="secondary-btn" (click)="cargarDatos()" aria-label="Actualizar datos">
            <span class="material-icons" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
          <button type="button" class="primary-btn" (click)="abrirModalApertura()" aria-label="Aperturar nueva gestión">
            <span class="material-icons" aria-hidden="true">calendar_today</span>
            <span>+ Aperturar Gestión</span>
          </button>
          <button type="button" class="accent-btn" (click)="abrirModalUfv()" aria-label="Registrar cotización UFV">
            <span class="material-icons" aria-hidden="true">trending_up</span>
            <span>+ Registrar UFV</span>
          </button>
        </div>
      </header>

      <!-- Main Layout: 2 Columns on desktop, 1 on mobile -->
      <div class="grid-two-cols">
        <!-- Section 1: Gestiones Fiscales -->
        <section class="card" aria-label="Historial de Gestiones Fiscales">
          <header class="card-header">
            <div class="card-title">
              <span class="material-icons title-icon" aria-hidden="true">account_balance</span>
              <h2>Gestiones Fiscales</h2>
            </div>
            <span class="card-subtitle">Cierres contables y saldos</span>
          </header>

          <div class="table-responsive-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Año / Gestión</th>
                  <th>Estado</th>
                  <th>Fecha de Cierre</th>
                  <th>Responsable</th>
                  <th>Activos Consolidados</th>
                  <th class="actions-col">Acción</th>
                </tr>
              </thead>
              <tbody>
                @if (cargando()) {
                  <tr>
                    <td colspan="6" class="empty-state">
                      <span class="material-icons spin" aria-hidden="true">sync</span>
                      <p>Cargando gestiones...</p>
                    </td>
                  </tr>
                } @else if (gestiones().length === 0) {
                  <tr>
                    <td colspan="6" class="empty-state">
                      <p>No hay gestiones registradas. Usa "+ Aperturar Gestión" para iniciar.</p>
                    </td>
                  </tr>
                } @else {
                  @for (g of gestiones(); track g.id) {
                    <tr>
                      <td class="col-year">
                        <strong>{{ g.anio }}</strong>
                      </td>
                      <td>
                        <span class="status-chip" [class.chip-open]="!g.cerrado" [class.chip-closed]="g.cerrado">
                          {{ g.cerrado ? 'Cerrada' : 'Abierta' }}
                        </span>
                      </td>
                      <td>
                        {{ g.fechaCierre ? (g.fechaCierre | date:'dd/MM/yyyy HH:mm') : '—' }}
                      </td>
                      <td>
                        {{ g.cerradoPor ? g.cerradoPor.nombres + ' ' + g.cerradoPor.apellidos : '—' }}
                      </td>
                      <td class="col-count">
                        <strong>{{ g._count?.cierreActivos || 0 }}</strong> bienes
                      </td>
                      <td class="actions-col">
                        @if (!g.cerrado) {
                          <button
                            type="button"
                            class="btn-close-gestion"
                            (click)="confirmarCierreGestion(g)"
                            title="Ejecutar cierre anual contable"
                          >
                            <span class="material-icons" aria-hidden="true">lock</span>
                            <span>Cerrar Gestión</span>
                          </button>
                        } @else {
                          <span class="locked-hint">
                            <span class="material-icons" aria-hidden="true">lock_outline</span>
                            Consolidado
                          </span>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Section 2: Cotizaciones UFV -->
        <section class="card" aria-label="Cotizaciones de la UFV">
          <header class="card-header">
            <div class="card-title">
              <span class="material-icons title-icon" aria-hidden="true">price_change</span>
              <h2>Cotizaciones UFV (Banco Central de Bolivia)</h2>
            </div>
            <button type="button" class="btn-small-add" (click)="abrirModalUfv()">
              <span class="material-icons" aria-hidden="true">add</span>
              <span>Añadir Valor</span>
            </button>
          </header>

          <div class="table-responsive-wrapper ufv-scroll-box">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha Cotización</th>
                  <th>Valor UFV (Bs.)</th>
                  <th>Variación</th>
                </tr>
              </thead>
              <tbody>
                @if (ufvs().length === 0) {
                  <tr>
                    <td colspan="3" class="empty-state">
                      <p>No se han registrado cotizaciones UFV recientes.</p>
                    </td>
                  </tr>
                } @else {
                  @for (u of ufvs(); track u.id) {
                    <tr>
                      <td>
                        <strong>{{ u.fecha | date:'dd/MM/yyyy' }}</strong>
                      </td>
                      <td class="col-ufv-val">
                        <span>{{ u.valor }}</span>
                      </td>
                      <td class="col-ufv-status">
                        <span class="badge-ufv-official">Oficial BCB</span>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Modal Aperturar Gestión -->
      @if (modalAperturaAbierto()) {
        <div class="modal-backdrop" (click)="cerrarModalApertura()">
          <div class="modal-panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-apertura-title">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">event</span>
                <h2 id="modal-apertura-title">Aperturar Gestión Fiscal</h2>
              </div>
              <button type="button" class="close-modal" (click)="cerrarModalApertura()">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="aperturaForm" (ngSubmit)="guardarApertura()" class="modal-form">
              <div class="form-group">
                <label for="anio">Año Fiscal *</label>
                <input id="anio" type="number" formControlName="anio" class="form-control" min="2000" max="2100" />
                <small class="field-hint">Al aperturar el año, se habilita el registro de operaciones e ingresos para el periodo.</small>
              </div>

              <footer class="modal-footer">
                <button type="button" class="secondary-btn" (click)="cerrarModalApertura()">Cancelar</button>
                <button type="submit" class="primary-btn" [disabled]="aperturaForm.invalid || guardando()">
                  <span class="material-icons" aria-hidden="true">check</span>
                  <span>{{ guardando() ? 'Aperturando...' : 'Confirmar Apertura' }}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal Registrar UFV -->
      @if (modalUfvAbierto()) {
        <div class="modal-backdrop" (click)="cerrarModalUfv()">
          <div class="modal-panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-ufv-title">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">trending_up</span>
                <h2 id="modal-ufv-title">Registrar Cotización UFV</h2>
              </div>
              <button type="button" class="close-modal" (click)="cerrarModalUfv()">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="ufvForm" (ngSubmit)="guardarUfv()" class="modal-form">
              <div class="form-group">
                <label for="fechaUfv">Fecha *</label>
                <input id="fechaUfv" type="date" formControlName="fecha" class="form-control" />
              </div>

              <div class="form-group">
                <label for="valorUfv">Valor de la UFV *</label>
                <input id="valorUfv" type="number" step="0.00001" formControlName="valor" class="form-control" placeholder="Ej: 2.39481" />
                <small class="field-hint">Cotización oficial con 5 decimales publicada por el BCB.</small>
              </div>

              <footer class="modal-footer">
                <button type="button" class="secondary-btn" (click)="cerrarModalUfv()">Cancelar</button>
                <button type="submit" class="accent-btn" [disabled]="ufvForm.invalid || guardando()">
                  <span class="material-icons" aria-hidden="true">save</span>
                  <span>{{ guardando() ? 'Guardando...' : 'Guardar UFV' }}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .gestiones-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      box-sizing: border-box;
      width: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .header-titles h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.3rem 0;
    }

    .header-titles p {
      color: #64748b;
      margin: 0;
      font-size: 0.92rem;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .primary-btn {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .primary-btn:hover:not(:disabled) {
      background: #172554;
    }

    .accent-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .accent-btn:hover:not(:disabled) {
      background: #0369a1;
    }

    .secondary-btn {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .secondary-btn:hover {
      background: #e2e8f0;
    }

    /* 2 Columns Grid */
    .grid-two-cols {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 1.5rem;
    }

    .card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .card-header {
      padding: 1.1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-title h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .title-icon {
      color: #1e3a8a;
    }

    .card-subtitle {
      font-size: 0.8rem;
      color: #64748b;
    }

    .btn-small-add {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-small-add:hover {
      background: #bae6fd;
    }

    .table-responsive-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
    }

    .ufv-scroll-box {
      max-height: 480px;
      overflow-y: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }

    .data-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .col-year strong {
      font-size: 1.05rem;
      color: #1e3a8a;
    }

    .status-chip {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      display: inline-block;
    }

    .chip-open {
      background: #dcfce7;
      color: #166534;
    }

    .chip-closed {
      background: #f1f5f9;
      color: #475569;
    }

    .col-count strong {
      color: #0369a1;
    }

    .btn-close-gestion {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-close-gestion:hover {
      background: #fee2e2;
    }

    .locked-hint {
      color: #94a3b8;
      font-size: 0.82rem;
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }

    .col-ufv-val span {
      font-family: monospace;
      font-weight: 700;
      font-size: 1rem;
      color: #0f172a;
    }

    .badge-ufv-official {
      background: #ecfdf5;
      color: #047857;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem !important;
      color: #94a3b8;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      box-sizing: border-box;
    }

    .modal-panel {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.1rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .modal-title h2 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .modal-icon {
      color: #1e3a8a;
    }

    .close-modal {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
    }

    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .form-control {
      padding: 0.65rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
      outline: none;
    }

    .form-control:focus {
      border-color: #1e3a8a;
    }

    .field-hint {
      color: #64748b;
      font-size: 0.78rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
      margin-top: 0.5rem;
    }

    @media (max-width: 900px) {
      .grid-two-cols {
        grid-template-columns: 1fr;
      }
      .gestiones-container {
        padding: 1rem;
      }
    }
  `],
})
export class GestionesComponent implements OnInit {
  gestiones = signal<Gestion[]>([]);
  ufvs = signal<Ufv[]>([]);
  cargando = signal(false);
  guardando = signal(false);

  // Modales
  modalAperturaAbierto = signal(false);
  modalUfvAbierto = signal(false);

  // Formularios
  aperturaForm!: FormGroup;
  ufvForm!: FormGroup;

  constructor(
    private gestionesService: GestionesService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.cargarDatos();
  }

  private initForms(): void {
    const proximoAnio = new Date().getFullYear();
    this.aperturaForm = this.fb.group({
      anio: [proximoAnio, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    });

    const hoy = new Date().toISOString().slice(0, 10);
    this.ufvForm = this.fb.group({
      fecha: [hoy, [Validators.required]],
      valor: [2.39481, [Validators.required, Validators.min(0.00001)]],
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.gestionesService.listarGestiones().subscribe({
      next: (data) => {
        this.gestiones.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });

    this.gestionesService.listarUfvs().subscribe({
      next: (ufvs) => this.ufvs.set(ufvs),
    });
  }

  // --- Apertura ---
  abrirModalApertura(): void {
    this.modalAperturaAbierto.set(true);
  }

  cerrarModalApertura(): void {
    this.modalAperturaAbierto.set(false);
  }

  guardarApertura(): void {
    if (this.aperturaForm.invalid) return;

    this.guardando.set(true);
    const anio = Number(this.aperturaForm.value.anio);

    this.gestionesService.crearGestion(anio).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModalApertura();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        alert(err.error?.message || 'Error al aperturar la gestión');
      },
    });
  }

  // --- Cierre Anual ---
  confirmarCierreGestion(g: Gestion): void {
    const msj = `¿Está seguro de ejecutar el CIERRE CONTABLE FISCAL de la gestión ${g.anio}?\n\nEsta operación calculará y congelará la depreciación acumulada de todos los activos fijos vigentes y registrará el saldo inicial para la gestión siguiente según norma boliviana D.S. 24051.`;

    if (!confirm(msj)) return;

    this.gestionesService.cerrarGestion(g.anio).subscribe({
      next: (res) => {
        alert(res.mensaje || `Gestión ${g.anio} cerrada exitosamente.`);
        this.cargarDatos();
      },
      error: (err) => alert(err.error?.message || 'Error al cerrar la gestión'),
    });
  }

  // --- UFV ---
  abrirModalUfv(): void {
    this.modalUfvAbierto.set(true);
  }

  cerrarModalUfv(): void {
    this.modalUfvAbierto.set(false);
  }

  guardarUfv(): void {
    if (this.ufvForm.invalid) return;

    this.guardando.set(true);
    const dto = {
      fecha: this.ufvForm.value.fecha,
      valor: Number(this.ufvForm.value.valor),
    };

    this.gestionesService.registrarUfv(dto).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModalUfv();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        alert(err.error?.message || 'Error al registrar la cotización UFV');
      },
    });
  }
}
