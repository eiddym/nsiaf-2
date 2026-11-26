import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { SolicitanteService, SolicitudSuministrosPayload, SolicitudActivoPayload } from '../../core/services/solicitante.service';

@Component({
  selector: 'app-portal-solicitante',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="portal-container">
      <header class="portal-header">
        <div class="header-titles">
          <div class="header-badge">
            <span class="material-icons">badge</span>
            <span>PORTAL DEL FUNCIONARIO Y SOLICITANTE</span>
          </div>
          <h1>Autoservicio de Bienes y Suministros</h1>
          <p>
            Consulta tu custodia activa, solicita insumos de almacén o requerimientos de activos fijos
            con trazabilidad oficial.
          </p>
        </div>
        <div class="user-summary-card">
          <div class="user-avatar">
            {{ authService.currentUser()?.nombres?.charAt(0) }}{{ authService.currentUser()?.apellidos?.charAt(0) }}
          </div>
          <div class="user-meta">
            <strong>{{ authService.currentUser()?.nombreCompleto }}</strong>
            <span>{{ authService.currentUser()?.cargo || 'Funcionario' }}</span>
            <small>{{ authService.currentUser()?.unidad || 'Unidad Institucional' }}</small>
          </div>
        </div>
      </header>

      <mat-tab-group class="portal-tabs" animationDuration="0ms">
        <!-- TAB 1: MI CUSTODIA ACTIVA -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span class="material-icons tab-icon">inventory</span>
            <span>Mi Custodia Activa ({{ custodia().length }})</span>
          </ng-template>

          <div class="tab-content">
            <div class="section-toolbar">
              <div class="info-note">
                <span class="material-icons note-icon">info</span>
                <span>
                  Estos son los bienes muebles, equipos o vehículos asignados formalmente a tu responsabilidad.
                </span>
              </div>
              <a mat-stroked-button color="primary" routerLink="/verificar/activo">
                <mat-icon>qr_code_scanner</mat-icon>
                <span>Escanear con Cámara</span>
              </a>
            </div>

            @if (custodia().length === 0) {
              <div class="empty-state">
                <span class="material-icons empty-icon">assignment_late</span>
                <h3>Sin bienes asignados actualmente</h3>
                <p>No tienes activos fijos asignados bajo tu custodia en este momento.</p>
              </div>
            } @else {
              <div class="cards-grid">
                @for (act of custodia(); track act.id) {
                  <div class="asset-card">
                    <div class="asset-header">
                      <span class="barcode-badge">{{ act.codigoBarras }}</span>
                      <span class="status-pill" [ngClass]="act.estado?.toLowerCase()">
                        {{ act.estado }}
                      </span>
                    </div>
                    <h4>{{ act.descripcion }}</h4>
                    <p class="asset-meta">
                      <strong>Rubro:</strong> {{ act.cuentaContable?.nombre || 'General' }}<br />
                      <strong>Marca/Modelo:</strong> {{ act.marca || 'S/M' }} {{ act.modelo || '' }}<br />
                      <strong>Serie:</strong> {{ act.serie || 'S/N' }}<br />
                      <strong>Ubicación:</strong> {{ act.ubicacion || 'Oficina asignada' }}
                    </p>
                    <div class="asset-actions">
                      <button
                        mat-stroked-button
                        color="warn"
                        (click)="abrirDevolucion(act)"
                      >
                        <mat-icon>assignment_return</mat-icon>
                        <span>Solicitar Devolución</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- TAB 2: PEDIR SUMINISTROS DE ALMACÉN -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span class="material-icons tab-icon">shopping_cart</span>
            <span>Pedir Suministros (SMS)</span>
          </ng-template>

          <div class="tab-content">
            <div class="request-grid">
              <div class="form-box">
                <h3>Nueva Solicitud de Materiales e Insumos</h3>
                <p class="form-sub">
                  Selecciona del catálogo institucional los suministros necesarios para tus funciones.
                </p>

                <div class="form-group">
                  <label>Justificación / Destino del Material:</label>
                  <textarea
                    rows="3"
                    [(ngModel)]="justificacionSuministros"
                    placeholder="Ej: Material necesario para la elaboración de expedientes y atención al público del mes en curso..."
                    class="form-control"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label>Agregar Ítems a la Solicitud:</label>
                  <div class="item-select-row">
                    <select [(ngModel)]="selectedSubarticuloId" class="form-control select-item">
                      <option value="">-- Seleccionar insumo disponible --</option>
                      @for (item of catalogoSuministros(); track item.id) {
                        <option [value]="item.id">
                          {{ item.descripcion }} ({{ item.unidadMedida }}) · Stock: {{ item.stockActual }}
                        </option>
                      }
                    </select>
                    <input
                      type="number"
                      [(ngModel)]="cantidadItem"
                      min="1"
                      placeholder="Cant."
                      class="form-control cant-input"
                    />
                    <button
                      type="button"
                      mat-flat-button
                      color="primary"
                      (click)="agregarItemSuministro()"
                      [disabled]="!selectedSubarticuloId || cantidadItem <= 0"
                    >
                      <mat-icon>add</mat-icon>
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>

                <!-- Lista de ítems añadidos -->
                <div class="added-items-card">
                  <h4>Materiales Solicitados ({{ itemsSuministros.length }})</h4>
                  @if (itemsSuministros.length === 0) {
                    <p class="empty-hint">Aún no has añadido ningún ítem a la lista.</p>
                  } @else {
                    <ul class="items-list">
                      @for (it of itemsSuministros; track it.subarticuloId; let idx = $index) {
                        <li>
                          <div class="it-desc">
                            <strong>{{ it.nombre }}</strong>
                            <span>{{ it.cantidad }} {{ it.unidadMedida }}</span>
                          </div>
                          <button
                            type="button"
                            mat-icon-button
                            color="warn"
                            (click)="removerItemSuministro(idx)"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </div>

                <button
                  mat-raised-button
                  color="primary"
                  class="btn-send-request"
                  (click)="enviarSolicitudSuministros()"
                  [disabled]="itemsSuministros.length === 0 || isSending"
                >
                  <mat-icon>send</mat-icon>
                  <span>Enviar Solicitud al Encargado de Almacenes</span>
                </button>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 3: SOLICITAR ACTIVO FIJO -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span class="material-icons tab-icon">post_add</span>
            <span>Solicitar Activo Fijo</span>
          </ng-template>

          <div class="tab-content">
            <div class="form-box max-w-700">
              <h3>Requerimiento de Asignación de Activo Fijo</h3>
              <p class="form-sub">
                Registra la solicitud formal para la asignación de un bien de uso institucional (computadora, mobiliario, maquinaria, vehículo, etc.).
              </p>

              <div class="form-group">
                <label>Tipo de Bien / Rubro Requerido:</label>
                <select [(ngModel)]="rubroActivo" class="form-control">
                  <option value="Equipo de Computación">Equipo de Computación (Laptop, PC, Monitor, Impresora)</option>
                  <option value="Muebles y Enseres">Muebles y Enseres (Escritorio, Silla Ergonómica, Gavetero)</option>
                  <option value="Maquinaria y Herramientas">Maquinaria, Equipos y Herramientas</option>
                  <option value="Vehículos Automotores">Vehículos Automotores y Transporte</option>
                  <option value="Equipos de Comunicación">Equipos de Comunicación y Redes</option>
                </select>
              </div>

              <div class="form-group">
                <label>Descripción detallada del activo requerido:</label>
                <input
                  type="text"
                  [(ngModel)]="descripcionActivo"
                  placeholder="Ej: Laptop Core i7 con 16GB RAM para labores de programación y soporte en campo"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label>Justificación técnica / de necesidad:</label>
                <textarea
                  rows="4"
                  [(ngModel)]="justificacionActivo"
                  placeholder="Indica las razones por las cuales se requiere la incorporación o asignación de este activo para el cumplimiento de tus objetivos laborales..."
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Documento de Respaldo / CITE (Opcional):</label>
                <input
                  type="text"
                  [(ngModel)]="citeActivo"
                  placeholder="Ej: CITE-TIC-2026-084"
                  class="form-control"
                />
              </div>

              <button
                mat-raised-button
                color="primary"
                class="btn-send-request"
                (click)="enviarSolicitudActivo()"
                [disabled]="!descripcionActivo || isSending"
              >
                <mat-icon>send</mat-icon>
                <span>Registrar Solicitud de Activo Fijo</span>
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 4: MIS SOLICITUDES Y TRÁMITES -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span class="material-icons tab-icon">history</span>
            <span>Historial de Solicitudes</span>
          </ng-template>

          <div class="tab-content">
            <div class="history-grid">
              <!-- Solicitudes de Almacén -->
              <div class="history-box">
                <h4>Solicitudes de Suministros (Almacenes)</h4>
                @if (misSolicitudesSuministros.length === 0) {
                  <p class="empty-hint">No has emitido solicitudes de suministros.</p>
                } @else {
                  <div class="requests-timeline">
                    @for (sol of misSolicitudesSuministros; track sol.id) {
                      <div class="req-card">
                        <div class="req-header">
                          <span class="req-num">SMS #{{ sol.numero }}</span>
                          <span class="status-badge" [ngClass]="sol.estado?.toLowerCase()">
                            {{ sol.estado }}
                          </span>
                        </div>
                        <p class="req-date"><strong>Fecha:</strong> {{ sol.fecha | date:'dd/MM/yyyy' }}</p>
                        <p class="req-note">{{ sol.observacion }}</p>
                        <small class="req-items-count">{{ sol.detalles?.length || 0 }} ítem(s) solicitados</small>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Solicitudes de Activos -->
              <div class="history-box">
                <h4>Solicitudes de Activos Fijos</h4>
                @if (misSolicitudesActivos.length === 0) {
                  <p class="empty-hint">No has emitido solicitudes de activos fijos.</p>
                } @else {
                  <div class="requests-timeline">
                    @for (act of misSolicitudesActivos; track act.id) {
                      <div class="req-card">
                        <div class="req-header">
                          <span class="req-num">ACT #{{ act.numero }} · {{ act.tipo }}</span>
                          <span class="status-badge" [ngClass]="act.estado?.toLowerCase()">
                            {{ act.estado }}
                          </span>
                        </div>
                        <p class="req-date"><strong>Fecha:</strong> {{ act.fecha | date:'dd/MM/yyyy' }}</p>
                        <p class="req-note"><strong>{{ act.rubro || 'Activo' }}:</strong> {{ act.descripcion }}</p>
                        @if (act.documentoCite) {
                          <span class="cite-tag">CITE: {{ act.documentoCite }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .portal-container {
      padding: 2rem;
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    .portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      gap: 1.5rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #e0f2fe;
      color: #0369a1;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .header-badge .material-icons {
      font-size: 1rem;
    }

    .header-titles h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .header-titles p {
      color: #64748b;
      margin-top: 0.35rem;
      font-size: 0.92rem;
    }

    .user-summary-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      background: #0284c7;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-meta strong {
      font-size: 0.95rem;
      color: #0f172a;
    }

    .user-meta span {
      font-size: 0.8rem;
      color: #0284c7;
      font-weight: 600;
    }

    .user-meta small {
      font-size: 0.72rem;
      color: #64748b;
    }

    .portal-tabs {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .tab-icon {
      font-size: 1.2rem;
      margin-right: 0.4rem;
      vertical-align: middle;
    }

    .tab-content {
      padding: 1.5rem;
      min-height: 400px;
    }

    .section-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .info-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.88rem;
    }

    .note-icon {
      color: #0284c7;
      font-size: 1.25rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #64748b;
    }

    .empty-icon {
      font-size: 3.5rem;
      color: #cbd5e1;
      margin-bottom: 1rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .asset-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }

    .asset-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .barcode-badge {
      font-family: monospace;
      font-weight: 700;
      background: #0f172a;
      color: #ffffff;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .status-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .status-pill.bueno {
      background: #dcfce7;
      color: #166534;
    }

    .status-pill.regular {
      background: #fef9c3;
      color: #854d0e;
    }

    .status-pill.malo {
      background: #fee2e2;
      color: #991b1b;
    }

    .asset-card h4 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .asset-meta {
      font-size: 0.84rem;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }

    .asset-actions {
      display: flex;
      justify-content: flex-end;
    }

    /* Form Styles */
    .form-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .max-w-700 {
      max-width: 700px;
    }

    .form-box h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .form-sub {
      font-size: 0.86rem;
      color: #64748b;
      margin: 0.25rem 0 1.25rem 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1.25rem;
    }

    .form-group label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #334155;
    }

    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }

    .item-select-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .select-item {
      flex: 1;
    }

    .cant-input {
      width: 90px;
    }

    .added-items-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .added-items-card h4 {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }

    .empty-hint {
      font-size: 0.84rem;
      color: #94a3b8;
      font-style: italic;
      margin: 0;
    }

    .items-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .items-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .it-desc strong {
      display: block;
      font-size: 0.88rem;
      color: #0f172a;
    }

    .it-desc span {
      font-size: 0.78rem;
      color: #0284c7;
      font-weight: 600;
    }

    .btn-send-request {
      width: 100%;
      height: 44px;
      font-weight: 600;
    }

    /* History Timeline */
    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.5rem;
    }

    .history-box h4 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
    }

    .requests-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .req-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
    }

    .req-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .req-num {
      font-weight: 700;
      font-size: 0.88rem;
      color: #0f172a;
    }

    .status-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .status-badge.pendiente {
      background: #fef9c3;
      color: #854d0e;
    }

    .status-badge.aprobada, .status-badge.entregada {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.rechazada {
      background: #fee2e2;
      color: #991b1b;
    }

    .req-date {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0 0 0.35rem 0;
    }

    .req-note {
      font-size: 0.85rem;
      color: #334155;
      margin: 0;
    }

    .req-items-count {
      font-size: 0.75rem;
      color: #0284c7;
      font-weight: 600;
      margin-top: 0.35rem;
      display: inline-block;
    }

    .cite-tag {
      display: inline-block;
      margin-top: 0.35rem;
      font-size: 0.72rem;
      background: #e2e8f0;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      color: #0f172a;
    }

    @media (max-width: 768px) {
      .portal-container {
        padding: 1rem 0.65rem;
      }
      .portal-header {
        flex-direction: column;
        align-items: stretch;
      }
      .user-summary-card {
        width: 100%;
        box-sizing: border-box;
      }
      .item-select-row {
        flex-direction: column;
        align-items: stretch;
      }
      .cant-input {
        width: 100%;
      }
      .history-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class PortalSolicitanteComponent implements OnInit {
  custodia = signal<any[]>([]);
  catalogoSuministros = signal<any[]>([]);

  // Form Suministros
  justificacionSuministros = '';
  selectedSubarticuloId = '';
  cantidadItem = 1;
  itemsSuministros: Array<{ subarticuloId: string; nombre: string; unidadMedida: string; cantidad: number }> = [];

  // Form Activo
  rubroActivo = 'Equipo de Computación';
  descripcionActivo = '';
  justificacionActivo = '';
  citeActivo = '';

  // Historial
  misSolicitudesSuministros: any[] = [];
  misSolicitudesActivos: any[] = [];

  isSending = false;

  constructor(
    public authService: AuthService,
    private solicitanteService: SolicitanteService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.solicitanteService.getMiCustodia().subscribe({
      next: (data) => this.custodia.set(data),
      error: (err) => console.error('Error al cargar custodia', err),
    });

    this.solicitanteService.getCatalogoSuministros().subscribe({
      next: (data) => this.catalogoSuministros.set(data),
      error: (err) => console.error('Error al cargar catálogo suministros', err),
    });

    this.solicitanteService.getMisSolicitudes().subscribe({
      next: (data) => {
        this.misSolicitudesSuministros = data.suministros || [];
        this.misSolicitudesActivos = data.activos || [];
      },
      error: (err) => console.error('Error al cargar historial', err),
    });
  }

  agregarItemSuministro(): void {
    if (!this.selectedSubarticuloId || this.cantidadItem <= 0) return;

    const item = this.catalogoSuministros().find((s) => s.id === this.selectedSubarticuloId);
    if (!item) return;

    const existing = this.itemsSuministros.find((i) => i.subarticuloId === item.id);
    if (existing) {
      existing.cantidad += this.cantidadItem;
    } else {
      this.itemsSuministros.push({
        subarticuloId: item.id,
        nombre: item.descripcion,
        unidadMedida: item.unidadMedida,
        cantidad: this.cantidadItem,
      });
    }

    this.selectedSubarticuloId = '';
    this.cantidadItem = 1;
  }

  removerItemSuministro(idx: number): void {
    this.itemsSuministros.splice(idx, 1);
  }

  enviarSolicitudSuministros(): void {
    if (this.itemsSuministros.length === 0) return;

    this.isSending = true;
    const payload: SolicitudSuministrosPayload = {
      justificacion: this.justificacionSuministros,
      items: this.itemsSuministros.map((i) => ({
        subarticuloId: i.subarticuloId,
        cantidad: i.cantidad,
      })),
    };

    this.solicitanteService.solicitarSuministros(payload).subscribe({
      next: () => {
        this.isSending = false;
        this.snackBar.open('¡Solicitud de suministros enviada con éxito al Encargado de Almacenes!', 'Cerrar', { duration: 4000 });
        this.itemsSuministros = [];
        this.justificacionSuministros = '';
        this.cargarDatos();
      },
      error: () => {
        this.isSending = false;
        this.snackBar.open('Error al registrar la solicitud', 'Cerrar', { duration: 3000 });
      },
    });
  }

  enviarSolicitudActivo(): void {
    if (!this.descripcionActivo) return;

    this.isSending = true;
    const payload: SolicitudActivoPayload = {
      tipo: 'ASIGNACION',
      rubro: this.rubroActivo,
      descripcion: this.descripcionActivo,
      justificacion: this.justificacionActivo,
      documentoCite: this.citeActivo,
    };

    this.solicitanteService.solicitarActivo(payload).subscribe({
      next: () => {
        this.isSending = false;
        this.snackBar.open('¡Solicitud de activo registrada correctamente!', 'Cerrar', { duration: 4000 });
        this.descripcionActivo = '';
        this.justificacionActivo = '';
        this.citeActivo = '';
        this.cargarDatos();
      },
      error: () => {
        this.isSending = false;
        this.snackBar.open('Error al registrar solicitud de activo', 'Cerrar', { duration: 3000 });
      },
    });
  }

  abrirDevolucion(activo: any): void {
    const motivo = prompt(`Ingresa el motivo de devolución para ${activo.descripcion} (Código ${activo.codigoBarras}):`);
    if (motivo === null) return;

    const payload: SolicitudActivoPayload = {
      tipo: 'DEVOLUCION',
      activoId: activo.id,
      rubro: activo.cuentaContable?.nombre,
      descripcion: `Devolución de ${activo.descripcion}`,
      justificacion: motivo || 'Devolución de bien a almacén / custodia general',
    };

    this.solicitanteService.solicitarActivo(payload).subscribe({
      next: () => {
        this.snackBar.open('Solicitud de devolución registrada en el sistema', 'Cerrar', { duration: 4000 });
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al procesar devolución', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
