import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { SegurosService, Seguro, AlertasSegurosResumen } from '../../core/services/seguros.service';
import { ActivosService } from '../../core/services/activos.service';
import { ActivoFijo } from '../../core/models/activo.models';

@Component({
  selector: 'app-seguros',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
  ],
  template: `
    <div class="seguros-container">
      <!-- Header -->
      <header class="header">
        <div class="header-titles">
          <h1>Pólizas de Seguro y Cobertura de Activos Fijos</h1>
          <p>Control de vigencia, contratos de aseguramiento y alertas preventivas de vencimiento (90, 30 y 7 días).</p>
        </div>
        <div class="header-actions">
          <button type="button" class="secondary-btn" (click)="cargarDatos()" aria-label="Actualizar pólizas">
            <span class="material-icons" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
          <button type="button" class="primary-btn" (click)="abrirModalNuevaPoliza()" aria-label="Registrar nueva póliza">
            <span class="material-icons" aria-hidden="true">add_moderator</span>
            <span>+ Nueva Póliza</span>
          </button>
        </div>
      </header>

      <!-- KPI Summary Cards -->
      <section class="kpi-grid" aria-label="Resumen de alertas de seguros">
        <div class="kpi-card total">
          <span class="kpi-label">Total Pólizas</span>
          <span class="kpi-value">{{ totalPolizas() }}</span>
          <span class="kpi-desc">Contratos registrados</span>
        </div>
        <div class="kpi-card vigentes">
          <span class="kpi-label">Vigentes</span>
          <span class="kpi-value">{{ resumenAlertas()?.vigentesNormales || 0 }}</span>
          <span class="kpi-desc">Cobertura normal activa</span>
        </div>
        <div class="kpi-card aviso">
          <span class="kpi-label">Aviso (≤90 días)</span>
          <span class="kpi-value">{{ resumenAlertas()?.aviso90Dias || 0 }}</span>
          <span class="kpi-desc">Planificar renovación</span>
        </div>
        <div class="kpi-card alerta">
          <span class="kpi-label">Alerta (≤30 días)</span>
          <span class="kpi-value">{{ resumenAlertas()?.alerta30Dias || 0 }}</span>
          <span class="kpi-desc">En proceso de licitación</span>
        </div>
        <div class="kpi-card urgente" [class.pulse]="(resumenAlertas()?.urgente7Dias || 0) > 0">
          <span class="kpi-label">Urgente (≤7 días)</span>
          <span class="kpi-value">{{ resumenAlertas()?.urgente7Dias || 0 }}</span>
          <span class="kpi-desc">Vencimiento inminente</span>
        </div>
        <div class="kpi-card vencidos">
          <span class="kpi-label">Vencidas</span>
          <span class="kpi-value">{{ resumenAlertas()?.vencidos || 0 }}</span>
          <span class="kpi-desc">Sin cobertura legal</span>
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="filters-card">
        <div class="search-input-group">
          <span class="material-icons search-icon" aria-hidden="true">search</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por número de póliza, aseguradora o cobertura..."
            [value]="filtroTexto()"
            (input)="onFiltroInput($event)"
            aria-label="Filtrar pólizas"
          />
          @if (filtroTexto()) {
            <button type="button" class="clear-search-btn" (click)="limpiarFiltro()" aria-label="Limpiar búsqueda">
              <span class="material-icons" aria-hidden="true">close</span>
            </button>
          }
        </div>
      </section>

      <!-- Table of Policies -->
      <section class="table-card" aria-label="Listado de pólizas de seguros">
        <header class="table-header">
          <div class="table-title">
            <span class="material-icons" aria-hidden="true">verified_user</span>
            <h2>Pólizas Registradas</h2>
            <span class="count-badge">{{ segurosFiltrados().length }}</span>
          </div>
        </header>

        <div class="table-responsive-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nº Póliza / Contrato</th>
                <th>Compañía Aseguradora</th>
                <th>Vigencia</th>
                <th>Días Restantes</th>
                <th>Estado / Alerta</th>
                <th>Activos Asegurados</th>
                <th>Valor Asegurado</th>
                <th class="actions-col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td colspan="8" class="empty-state">
                    <span class="material-icons spin" aria-hidden="true">sync</span>
                    <p>Cargando pólizas de seguro...</p>
                  </td>
                </tr>
              } @else if (segurosFiltrados().length === 0) {
                <tr>
                  <td colspan="8" class="empty-state">
                    <span class="material-icons" aria-hidden="true">policy</span>
                    <p>No se encontraron pólizas de seguro con el criterio de búsqueda.</p>
                  </td>
                </tr>
              } @else {
                @for (s of segurosFiltrados(); track s.id) {
                  <tr [class.row-urgent]="s.nivelAlerta === 'URGENTE_7_DIAS'" [class.row-expired]="s.nivelAlerta === 'VENCIDO'">
                    <td class="col-code">
                      <strong>{{ s.numeroPoliza }}</strong>
                      @if (s.cobertura) {
                        <small class="cobertura-hint">{{ s.cobertura | slice:0:45 }}...</small>
                      }
                    </td>
                    <td>
                      <span class="company-name">{{ s.aseguradora }}</span>
                    </td>
                    <td class="col-date">
                      <div>{{ s.fechaInicio | date:'dd/MM/yyyy' }} al</div>
                      <strong>{{ s.fechaFin | date:'dd/MM/yyyy' }}</strong>
                    </td>
                    <td class="col-days">
                      <span class="days-num" [class.negative]="s.diasRestantes < 0">
                        {{ s.diasRestantes < 0 ? 'Vencida' : s.diasRestantes + ' d' }}
                      </span>
                    </td>
                    <td>
                      <span class="alert-chip" [ngClass]="getChipClass(s.nivelAlerta)" [class.blink]="s.parpadeo">
                        {{ getAlertaLabel(s) }}
                      </span>
                    </td>
                    <td class="col-activos">
                      <button type="button" class="btn-assets-count" (click)="verDetallePoliza(s)" title="Ver activos incluidos">
                        <span class="material-icons" aria-hidden="true">inventory_2</span>
                        <strong>{{ s.totalActivos }}</strong> activos
                      </button>
                    </td>
                    <td class="col-val">
                      Bs. {{ s.valorAsegurado | number:'1.2-2' }}
                    </td>
                    <td class="actions-col">
                      <div class="row-actions">
                        <button type="button" class="icon-action-btn" (click)="verDetallePoliza(s)" title="Ver detalle de bienes asegurados">
                          <span class="material-icons" aria-hidden="true">visibility</span>
                        </button>
                        <button type="button" class="icon-action-btn" (click)="abrirModalVincular(s)" title="Vincular más activos">
                          <span class="material-icons" aria-hidden="true">playlist_add</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal: Nueva Póliza -->
      @if (modalNuevaPolizaAbierto()) {
        <div class="modal-backdrop" (click)="cerrarModalNuevaPoliza()">
          <div class="modal-panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-poliza-title">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">shield</span>
                <h2 id="modal-poliza-title">Registrar Nueva Póliza de Seguro</h2>
              </div>
              <button type="button" class="close-modal" (click)="cerrarModalNuevaPoliza()" aria-label="Cerrar modal">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="polizaForm" (ngSubmit)="guardarPoliza()" class="modal-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="numeroPoliza">Nº de Póliza / Contrato *</label>
                  <input id="numeroPoliza" type="text" formControlName="numeroPoliza" class="form-control" placeholder="Ej: POL-2026-BISA-094" />
                </div>

                <div class="form-group">
                  <label for="aseguradora">Compañía Aseguradora *</label>
                  <input id="aseguradora" type="text" formControlName="aseguradora" class="form-control" placeholder="Ej: BISA Seguros y Reaseguros S.A." />
                </div>

                <div class="form-group">
                  <label for="fechaInicio">Fecha de Inicio de Vigencia *</label>
                  <input id="fechaInicio" type="date" formControlName="fechaInicio" class="form-control" />
                </div>

                <div class="form-group">
                  <label for="fechaFin">Fecha de Fin de Vigencia *</label>
                  <input id="fechaFin" type="date" formControlName="fechaFin" class="form-control" />
                </div>

                <div class="form-group full-width">
                  <label for="cobertura">Cobertura y Condiciones Generales</label>
                  <textarea id="cobertura" formControlName="cobertura" rows="3" class="form-control" placeholder="Describa el alcance de la cobertura: todo riesgo, daño por agua, siniestros, robo, etc."></textarea>
                </div>
              </div>

              <footer class="modal-footer">
                <button type="button" class="secondary-btn" (click)="cerrarModalNuevaPoliza()">Cancelar</button>
                <button type="submit" class="primary-btn" [disabled]="polizaForm.invalid || guardando()">
                  <span class="material-icons" aria-hidden="true">save</span>
                  <span>{{ guardando() ? 'Guardando...' : 'Guardar Póliza' }}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Modal: Detalle de Bienes Asegurados -->
      @if (modalDetalleAbierto() && polizaSeleccionada(); as p) {
        <div class="modal-backdrop" (click)="cerrarModalDetalle()">
          <div class="modal-panel modal-panel-large" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-det-title">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">list_alt</span>
                <h2 id="modal-det-title">Activos en Póliza: {{ p.numeroPoliza }}</h2>
              </div>
              <button type="button" class="close-modal" (click)="cerrarModalDetalle()" aria-label="Cerrar modal">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <div class="detail-summary-bar">
              <div><strong>Aseguradora:</strong> {{ p.aseguradora }}</div>
              <div><strong>Vigencia:</strong> {{ p.fechaInicio | date:'dd/MM/yyyy' }} al {{ p.fechaFin | date:'dd/MM/yyyy' }}</div>
              <div><strong>Activos Cubiertos:</strong> {{ p.totalActivos }}</div>
              <div><strong>Valor Asegurado Total:</strong> Bs. {{ p.valorAsegurado | number:'1.2-2' }}</div>
            </div>

            <div class="table-responsive-wrapper detail-table-box">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción del Activo</th>
                    <th>Rubro Contable</th>
                    <th>Custodio</th>
                    <th>Valor Inicial (Bs)</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @if (!p.activos || p.activos.length === 0) {
                    <tr>
                      <td colspan="6" class="empty-state">
                        <p>No hay activos asignados a esta póliza todavía. Usa la opción "Vincular Activos" para agregar bienes.</p>
                      </td>
                    </tr>
                  } @else {
                    @for (item of p.activos; track item.activoId) {
                      <tr>
                        <td><strong>{{ item.activo.codigoBarras }}</strong></td>
                        <td>{{ item.activo.descripcion }}</td>
                        <td>{{ item.activo.cuentaContable?.nombre || 'General' }}</td>
                        <td>{{ item.activo.usuarioCustodio ? item.activo.usuarioCustodio.nombres + ' ' + item.activo.usuarioCustodio.apellidos : 'Sin Asignar' }}</td>
                        <td>Bs. {{ item.activo.precioInicial | number:'1.2-2' }}</td>
                        <td>
                          <button type="button" class="btn-remove" (click)="desvincularActivo(p.id, item.activoId)" title="Quitar de póliza">
                            <span class="material-icons" aria-hidden="true">remove_circle</span>
                          </button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <footer class="modal-footer">
              <button type="button" class="primary-btn" (click)="abrirModalVincular(p)">
                <span class="material-icons" aria-hidden="true">add</span>
                <span>+ Agregar Activos a esta Póliza</span>
              </button>
              <button type="button" class="secondary-btn" (click)="cerrarModalDetalle()">Cerrar</button>
            </footer>
          </div>
        </div>
      }

      <!-- Modal: Vincular Activos -->
      @if (modalVincularAbierto() && polizaSeleccionada(); as p) {
        <div class="modal-backdrop" (click)="cerrarModalVincular()">
          <div class="modal-panel modal-panel-large" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-vinc-title">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">add_task</span>
                <h2 id="modal-vinc-title">Vincular Activos Fijos a Póliza {{ p.numeroPoliza }}</h2>
              </div>
              <button type="button" class="close-modal" (click)="cerrarModalVincular()" aria-label="Cerrar modal">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <div class="vincular-instruction">
              <p>Seleccione los activos que desea incorporar a la cobertura de seguros actual:</p>
            </div>

            <div class="table-responsive-wrapper detail-table-box">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 40px;"></th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Rubro Contable</th>
                    <th>Valor (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of activosDisponibles(); track a.id) {
                    <tr>
                      <td>
                        <input type="checkbox" [checked]="isActivoSeleccionado(a.id)" (change)="toggleSeleccionActivo(a.id)" />
                      </td>
                      <td><strong>{{ a.codigoBarras }}</strong></td>
                      <td>{{ a.descripcion }}</td>
                      <td>{{ a.cuentaContable?.nombre }}</td>
                      <td>Bs. {{ a.precioInicial | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <footer class="modal-footer">
              <div class="selected-count">
                <strong>{{ activosSeleccionadosIds().length }}</strong> activos seleccionados
              </div>
              <button type="button" class="secondary-btn" (click)="cerrarModalVincular()">Cancelar</button>
              <button type="button" class="primary-btn" [disabled]="activosSeleccionadosIds().length === 0 || guardando()" (click)="confirmarVinculacion(p.id)">
                <span class="material-icons" aria-hidden="true">check_circle</span>
                <span>{{ guardando() ? 'Guardando...' : 'Confirmar Cobertura' }}</span>
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .seguros-container {
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
      background: #0f766e;
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
      background: #115e59;
    }

    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .kpi-value {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 0.2rem 0;
      color: #0f172a;
    }

    .kpi-desc {
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .kpi-card.vigentes .kpi-value { color: #15803d; }
    .kpi-card.aviso .kpi-value { color: #b45309; }
    .kpi-card.alerta .kpi-value { color: #c2410c; }
    .kpi-card.urgente .kpi-value { color: #b91c1c; }
    .kpi-card.vencidos .kpi-value { color: #475569; }

    .pulse {
      animation: pulseAlert 1.5s infinite;
      border-color: #ef4444 !important;
    }

    @keyframes pulseAlert {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Filters */
    .filters-card {
      margin-bottom: 1.25rem;
    }

    .search-input-group {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 600px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.8rem 0.75rem 2.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #ffffff;
      outline: none;
      transition: border 0.2s;
    }

    .search-input:focus {
      border-color: #0f766e;
    }

    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }

    /* Table */
    .table-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }

    .table-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table-title h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .count-badge {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
    }

    .table-responsive-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
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

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .row-urgent {
      background: #fff1f2 !important;
    }

    .row-expired {
      background: #f8fafc !important;
      opacity: 0.75;
    }

    .col-code strong {
      color: #0f766e;
      display: block;
    }

    .cobertura-hint {
      display: block;
      color: #64748b;
      font-size: 0.75rem;
      margin-top: 0.15rem;
    }

    .company-name {
      font-weight: 600;
    }

    .col-date {
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .col-days .days-num {
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: #f1f5f9;
      display: inline-block;
    }

    .col-days .days-num.negative {
      background: #fee2e2;
      color: #991b1b;
    }

    .alert-chip {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      display: inline-block;
      white-space: nowrap;
    }

    .chip-normal { background: #dcfce7; color: #166534; }
    .chip-aviso { background: #fef3c7; color: #92400e; }
    .chip-alerta { background: #ffedd5; color: #9a3412; }
    .chip-urgente { background: #fee2e2; color: #991b1b; font-weight: 800; }
    .chip-vencido { background: #e2e8f0; color: #475569; }

    .blink {
      animation: blinkAnimation 1s infinite alternate;
    }

    @keyframes blinkAnimation {
      from { opacity: 1; }
      to { opacity: 0.4; }
    }

    .btn-assets-count {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      font-size: 0.82rem;
      color: #0f766e;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-assets-count:hover {
      background: #e0f2fe;
      border-color: #38bdf8;
    }

    .row-actions {
      display: flex;
      gap: 0.4rem;
    }

    .icon-action-btn {
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s;
    }

    .icon-action-btn:hover {
      background: #f1f5f9;
      color: #0f766e;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem !important;
      color: #94a3b8;
    }

    .empty-state .material-icons {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
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
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    .modal-panel-large {
      max-width: 900px;
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
      color: #0f766e;
    }

    .close-modal {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
    }

    .close-modal:hover {
      color: #0f172a;
    }

    .modal-form {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
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
      font-size: 0.9rem;
      outline: none;
    }

    .form-control:focus {
      border-color: #0f766e;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
    }

    .detail-summary-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding: 0.9rem 1.5rem;
      background: #f1f5f9;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }

    .detail-table-box {
      max-height: 400px;
      overflow-y: auto;
      padding: 0.5rem 1.5rem;
    }

    .btn-remove {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
    }

    .btn-remove:hover {
      color: #b91c1c;
    }

    .vincular-instruction {
      padding: 1rem 1.5rem 0.2rem;
      color: #475569;
      font-size: 0.9rem;
    }

    .selected-count {
      margin-right: auto;
      font-size: 0.88rem;
      color: #0f766e;
    }

    @media (max-width: 768px) {
      .seguros-container {
        padding: 1rem;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class SegurosComponent implements OnInit {
  seguros = signal<Seguro[]>([]);
  resumenAlertas = signal<AlertasSegurosResumen['resumen'] | null>(null);
  cargando = signal(false);
  guardando = signal(false);
  filtroTexto = signal('');

  // Modales
  modalNuevaPolizaAbierto = signal(false);
  modalDetalleAbierto = signal(false);
  modalVincularAbierto = signal(false);
  polizaSeleccionada = signal<Seguro | null>(null);

  // Formulario
  polizaForm!: FormGroup;

  // Activos disponibles para vincular
  activosDisponibles = signal<ActivoFijo[]>([]);
  activosSeleccionadosIds = signal<string[]>([]);

  totalPolizas = computed(() => this.seguros().length);

  segurosFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.seguros();
    return this.seguros().filter(
      (s) =>
        s.numeroPoliza.toLowerCase().includes(q) ||
        s.aseguradora.toLowerCase().includes(q) ||
        (s.cobertura && s.cobertura.toLowerCase().includes(q))
    );
  });

  constructor(
    private segurosService: SegurosService,
    private activosService: ActivosService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarDatos();
  }

  private initForm(): void {
    this.polizaForm = this.fb.group({
      numeroPoliza: ['', [Validators.required]],
      aseguradora: ['', [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      cobertura: [''],
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.segurosService.listar().subscribe({
      next: (data) => {
        this.seguros.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });

    this.segurosService.obtenerAlertas().subscribe({
      next: (res) => {
        this.resumenAlertas.set(res.resumen);
      },
    });
  }

  onFiltroInput(e: Event): void {
    this.filtroTexto.set((e.target as HTMLInputElement).value);
  }

  limpiarFiltro(): void {
    this.filtroTexto.set('');
  }

  getChipClass(nivel: string): string {
    switch (nivel) {
      case 'URGENTE_7_DIAS': return 'chip-urgente';
      case 'ALERTA_30_DIAS': return 'chip-alerta';
      case 'AVISO_90_DIAS': return 'chip-aviso';
      case 'VENCIDO': return 'chip-vencido';
      default: return 'chip-normal';
    }
  }

  getAlertaLabel(s: Seguro): string {
    if (s.nivelAlerta === 'URGENTE_7_DIAS') return 'URGENTE (≤7 días)';
    if (s.nivelAlerta === 'ALERTA_30_DIAS') return 'Alerta (≤30 días)';
    if (s.nivelAlerta === 'AVISO_90_DIAS') return 'Aviso (≤90 días)';
    if (s.nivelAlerta === 'VENCIDO') return 'Vencida';
    return 'Vigente';
  }

  // --- Modal Nueva Póliza ---
  abrirModalNuevaPoliza(): void {
    this.polizaForm.reset();
    this.modalNuevaPolizaAbierto.set(true);
  }

  cerrarModalNuevaPoliza(): void {
    this.modalNuevaPolizaAbierto.set(false);
  }

  guardarPoliza(): void {
    if (this.polizaForm.invalid) return;

    this.guardando.set(true);
    const dto = this.polizaForm.value;

    this.segurosService.crear(dto).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModalNuevaPoliza();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        alert(err.error?.message || 'Error al guardar la póliza');
      },
    });
  }

  // --- Modal Detalle Activos ---
  verDetallePoliza(s: Seguro): void {
    this.segurosService.obtenerPorId(s.id).subscribe({
      next: (detalle) => {
        this.polizaSeleccionada.set(detalle);
        this.modalDetalleAbierto.set(true);
      },
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.polizaSeleccionada.set(null);
  }

  desvincularActivo(seguroId: string, activoId: string): void {
    if (!confirm('¿Confirma que desea retirar este activo de la póliza de seguros?')) return;

    this.segurosService.desvincularActivo(seguroId, activoId).subscribe({
      next: (actualizado) => {
        this.polizaSeleccionada.set(actualizado);
        this.cargarDatos();
      },
      error: (err) => alert(err.error?.message || 'Error al desvincular activo'),
    });
  }

  // --- Modal Vincular Activos ---
  abrirModalVincular(p: Seguro): void {
    this.polizaSeleccionada.set(p);
    this.activosSeleccionadosIds.set([]);
    this.activosService.listar(1, 100).subscribe({
      next: (res) => {
        // Filtrar activos que ya están vinculados a esta póliza
        const idsYaEnPoliza = new Set((p.activos || []).map((x: any) => x.activoId));
        const disponibles = res.data.filter((a) => !idsYaEnPoliza.has(a.id));
        this.activosDisponibles.set(disponibles);
        this.modalVincularAbierto.set(true);
      },
    });
  }

  cerrarModalVincular(): void {
    this.modalVincularAbierto.set(false);
    this.activosSeleccionadosIds.set([]);
  }

  isActivoSeleccionado(id: string): boolean {
    return this.activosSeleccionadosIds().includes(id);
  }

  toggleSeleccionActivo(id: string): void {
    const seleccionados = [...this.activosSeleccionadosIds()];
    const index = seleccionados.indexOf(id);
    if (index >= 0) {
      seleccionados.splice(index, 1);
    } else {
      seleccionados.push(id);
    }
    this.activosSeleccionadosIds.set(seleccionados);
  }

  confirmarVinculacion(seguroId: string): void {
    const ids = this.activosSeleccionadosIds();
    if (ids.length === 0) return;

    this.guardando.set(true);
    this.segurosService.vincularActivos(seguroId, ids).subscribe({
      next: (actualizado) => {
        this.guardando.set(false);
        this.cerrarModalVincular();
        if (this.modalDetalleAbierto()) {
          this.polizaSeleccionada.set(actualizado);
        }
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        alert(err.error?.message || 'Error al vincular los activos');
      },
    });
  }
}
