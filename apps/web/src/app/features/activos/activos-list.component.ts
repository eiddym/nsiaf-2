import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivosService } from '../../core/services/activos.service';
import { ActivoFijo, ActivosEstadisticas } from '../../core/models/activo.models';
import { ProveedoresService, Proveedor } from '../../core/services/proveedores.service';
import { VisorPdfDialogComponent } from '../../shared/components/visor-pdf/visor-pdf-dialog.component';
import { ActivosOperacionesPanelComponent } from './activos-operaciones-panel.component';
import jsQR from 'jsqr';

@Component({
  selector: 'app-activos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    ActivosOperacionesPanelComponent,
  ],
  template: `
    <div class="activos-container">
      <!-- Header with Action -->
      <header class="page-header">
        <div>
          <h1>Gestión de Activos Fijos</h1>
          <p>Inventario general de bienes de uso, custodios asignados y valuación contable</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="secondary-btn"
            (click)="cargarDatos()"
            aria-label="Actualizar listado de activos"
          >
            <span class="material-icons" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            class="qr-scan-btn"
            (click)="abrirModalEscanear()"
            aria-label="Verificar o escanear activo mediante código QR"
          >
            <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
            <span>Verificar QR</span>
          </button>
          <button
            type="button"
            class="report-btn"
            (click)="abrirVisorReporteDepreciacion()"
            aria-label="Generar Reporte 10 oficial de depreciación de activos fijos con UFV"
          >
            <span class="material-icons" aria-hidden="true">analytics</span>
            <span>Rep. 10 (Depreciación)</span>
          </button>
          <button
            type="button"
            class="report-btn report-btn-secondary"
            (click)="abrirVisorReporteResumen()"
            aria-label="Generar Reporte 6 oficial de resumen de activos fijos"
          >
            <span class="material-icons" aria-hidden="true">assessment</span>
            <span>Rep. 6 (Resumen)</span>
          </button>
          <button
            type="button"
            class="report-btn report-btn-danger"
            (click)="abrirVisorReporteBajas()"
            aria-label="Generar Reporte 9 oficial de bajas de activos fijos"
          >
            <span class="material-icons" aria-hidden="true">remove_circle_outline</span>
            <span>Rep. 9 (Bajas)</span>
          </button>
          <button
            type="button"
            class="primary-btn"
            (click)="abrirModalNuevoActivo()"
            aria-label="Registrar nuevo bien de uso o activo fijo"
          >
            <span class="material-icons" aria-hidden="true">add_circle</span>
            <span>+ Nuevo Activo</span>
          </button>
          <button
            type="button"
            class="accent-btn"
            (click)="abrirModalAsignacion()"
            aria-label="Generar acta oficial de entrega o asignación"
          >
            <span class="material-icons" aria-hidden="true">assignment</span>
            <span>Asignar / Acta</span>
          </button>
        </div>
      </header>

      <!-- Admin Role Notice Banner -->
      <section class="admin-notice-banner" aria-label="Aviso de administración de activos fijos">
        <span class="material-icons banner-icon" aria-hidden="true">admin_panel_settings</span>
        <div class="banner-body">
          <strong>Consola Administrativa de Activos Fijos:</strong>
          <span>
            Exclusivo para la administración y custodia de bienes institucionales. Las solicitudes de asignación, traspaso y propuestas de baja de funcionarios se canalizan a través de las plantillas oficiales del sistema <strong>Plantillas</strong> con CITE oficial.
          </span>
        </div>
      </section>

      <!-- KPI Summary Cards -->
      @if (stats()) {
        <section class="kpi-grid" aria-label="Métricas globales de activos fijos">
          <div class="kpi-card">
            <div class="kpi-icon-wrap blue" aria-hidden="true">
              <span class="material-icons">inventory_2</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Total Activos Fijos</span>
              <strong class="kpi-value">{{ stats()?.totalActivos || 0 }}</strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-wrap emerald" aria-hidden="true">
              <span class="material-icons">payments</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Valor Histórico Total</span>
              <strong class="kpi-value">Bs. {{ (stats()?.valorTotal || 0) | number:'1.2-2' }}</strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-wrap indigo" aria-hidden="true">
              <span class="material-icons">account_tree</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">Cuentas Contables</span>
              <strong class="kpi-value">{{ stats()?.porCuenta?.length || 0 }} Rubros</strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-wrap amber" aria-hidden="true">
              <span class="material-icons">thumb_up</span>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">En Buen Estado</span>
              <strong class="kpi-value">{{ getCantidadBuenEstado() }}</strong>
            </div>
          </div>
        </section>
      }

      <!-- Filter & Search Toolbar -->
      <section class="toolbar-card" aria-label="Herramientas de filtrado y búsqueda">
        <div class="search-box">
          <label for="search-activos-input" class="sr-only">Buscar activos fijos</label>
          <span class="material-icons search-icon" aria-hidden="true">search</span>
          <input
            id="search-activos-input"
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="cargarActivos()"
            placeholder="Buscar por código de barras, descripción, marca o serie..."
            aria-label="Buscar por código de barras, descripción o serie"
          />
          @if (searchQuery) {
            <button
              type="button"
              class="clear-search"
              (click)="searchQuery = ''; cargarActivos()"
              aria-label="Limpiar término de búsqueda"
            >
              <span class="material-icons" aria-hidden="true">close</span>
            </button>
          }
        </div>
        <button type="button" class="filter-btn" (click)="cargarActivos()" aria-label="Ejecutar búsqueda">
          <span>Buscar</span>
        </button>
      </section>

      <!-- Assets Table -->
      <section class="table-container" aria-label="Tabla de inventario de activos fijos">
        @if (isLoading()) {
          <div class="loading-state" role="status">
            <div class="spinner" aria-hidden="true"></div>
            <span>Cargando inventario de bienes...</span>
          </div>
        } @else if (activos().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon" aria-hidden="true">content_paste_off</span>
            <h3>No se encontraron activos</h3>
            <p>No existen registros que coincidan con el término de búsqueda ingresado.</p>
          </div>
        } @else {
          <table class="data-table">
            <caption class="sr-only">Inventario de activos fijos institucionales</caption>
            <thead>
              <tr>
                <th scope="col">Identificación QR</th>
                <th scope="col">Descripción y Especificaciones</th>
                <th scope="col">Rubro Contable</th>
                <th scope="col">Custodio Actual</th>
                <th scope="col">Estado</th>
                <th scope="col" class="text-right">Valor Inicial</th>
                <th scope="col" class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (activo of activos(); track activo.id) {
                <tr class="table-row">
                  <td>
                    <button
                      type="button"
                      class="qr-code-chip"
                      (click)="abrirModalQr(activo)"
                      [attr.aria-label]="'Ver código QR e identificación de ' + activo.codigoBarras"
                      matTooltip="Clic para ver QR y verificación rápida"
                    >
                      <span class="material-icons qr-chip-icon" aria-hidden="true">qr_code_2</span>
                      <span class="qr-chip-code">{{ activo.codigoBarras }}</span>
                    </button>
                  </td>
                  <td>
                    <div class="item-desc">
                      <strong class="desc-title">{{ activo.descripcion }}</strong>
                      <span class="desc-meta">
                        {{ activo.marca || 'S/M' }} · {{ activo.modelo || 'S/M' }}
                        @if (activo.serie) {
                          · S/N: {{ activo.serie }}
                        }
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="cuenta-info">
                      <span class="cuenta-name">{{ activo.cuentaContable?.nombre }}</span>
                      <small class="aux-name">{{ activo.auxiliar?.nombre }}</small>
                    </div>
                  </td>
                  <td>
                    @if (activo.usuarioCustodio) {
                      <div class="custodio-badge">
                        <span class="material-icons" aria-hidden="true">person</span>
                        <span>{{ activo.usuarioCustodio.nombres }} {{ activo.usuarioCustodio.apellidos }}</span>
                      </div>
                    } @else {
                      <span class="unassigned-badge">En Depósito / Sin Asignar</span>
                    }
                  </td>
                  <td>
                    <span class="status-chip" [ngClass]="activo.estado.toLowerCase()">
                      {{ activo.estado }}
                    </span>
                  </td>
                  <td class="text-right font-mono">
                    Bs. {{ activo.precioInicial | number:'1.2-2' }}
                  </td>
                  <td class="text-center">
                    <div class="action-buttons">
                      <button
                        type="button"
                        class="action-btn"
                        (click)="verDetalle(activo)"
                        [attr.aria-label]="'Ver ficha técnica de ' + activo.descripcion"
                        matTooltip="Ver Ficha Técnica"
                      >
                        <span class="material-icons" aria-hidden="true">visibility</span>
                      </button>
                      <button
                        type="button"
                        class="action-btn pdf-btn"
                        (click)="verActaPdf(activo)"
                        [attr.aria-label]="'Ver o imprimir acta oficial en PDF de ' + activo.descripcion"
                        matTooltip="Ver Acta PDF Oficial"
                      >
                        <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <!-- Asset Detail Drawer / Modal -->
      @if (activoSeleccionado()) {
        <div class="drawer-backdrop" (click)="cerrarDetalle()">
          <aside
            class="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-detail-title"
            (click)="$event.stopPropagation()"
          >
            <header class="drawer-header">
              <div class="drawer-title">
                <span class="barcode-tag">{{ activoSeleccionado()?.codigoBarras }}</span>
                <h2 id="drawer-detail-title">Ficha Técnica del Activo</h2>
              </div>
              <button
                type="button"
                class="close-drawer"
                (click)="cerrarDetalle()"
                aria-label="Cerrar ficha técnica"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <div class="drawer-body">
              <section class="detail-section">
                <h3>Información General</h3>
                <div class="detail-grid">
                  <div class="detail-item full-width">
                    <label>Descripción</label>
                    <p>{{ activoSeleccionado()?.descripcion }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Marca</label>
                    <p>{{ activoSeleccionado()?.marca || 'N/A' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Modelo</label>
                    <p>{{ activoSeleccionado()?.modelo || 'N/A' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Número de Serie</label>
                    <p>{{ activoSeleccionado()?.serie || 'N/A' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Color</label>
                    <p>{{ activoSeleccionado()?.color || 'N/A' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Material</label>
                    <p>{{ activoSeleccionado()?.material || 'N/A' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Medidas</label>
                    <p>{{ activoSeleccionado()?.medidas || 'N/A' }}</p>
                  </div>
                </div>
              </section>

              <section class="detail-section">
                <h3>Clasificación Contable</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <label>Cuenta Contable</label>
                    <p>{{ activoSeleccionado()?.cuentaContable?.codigo }} - {{ activoSeleccionado()?.cuentaContable?.nombre }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Auxiliar</label>
                    <p>{{ activoSeleccionado()?.auxiliar?.codigo }} - {{ activoSeleccionado()?.auxiliar?.nombre }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Precio Histórico Inicial</label>
                    <p class="price-highlight">Bs. {{ activoSeleccionado()?.precioInicial | number:'1.2-2' }}</p>
                  </div>
                  <div class="detail-item">
                    <label>Vida Útil Restante</label>
                    <p>{{ activoSeleccionado()?.vidaUtilRestanteMeses }} meses</p>
                  </div>
                </div>
              </section>

              <section class="detail-section">
                <h3>Asignación y Custodia</h3>
                <div class="detail-grid">
                  <div class="detail-item full-width">
                    <label>Funcionario Responsable</label>
                    @if (activoSeleccionado()?.usuarioCustodio; as cust) {
                      <p><strong>{{ cust.nombres }} {{ cust.apellidos }}</strong> (C.I. {{ cust.ci }}) - {{ cust.cargo || 'Funcionario' }}</p>
                    } @else {
                      <p class="text-muted">Actualmente sin asignación en almacén central.</p>
                    }
                  </div>
                  <div class="detail-item full-width">
                    <label>Ubicación Física</label>
                    <p>{{ activoSeleccionado()?.ubicacion || 'Oficina Central' }}</p>
                  </div>
                </div>
              </section>
            </div>

            <footer class="drawer-footer">
              <button
                type="button"
                class="pdf-action-btn"
                (click)="verActaPdf(activoSeleccionado()!)"
                aria-label="Ver acta oficial de este bien en PDF"
              >
                <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                <span>Generar / Ver Acta Oficial</span>
              </button>
              <button
                type="button"
                class="close-btn"
                (click)="cerrarDetalle()"
                aria-label="Cerrar panel de ficha técnica"
              >
                Cerrar Ficha
              </button>
            </footer>
          </aside>
        </div>
      }

      <!-- Form Modal: Nuevo Activo -->
      @if (mostrarModalNuevo()) {
        <div class="modal-backdrop" (click)="cerrarModalNuevo()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nuevo-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">add_box</span>
                <h2 id="modal-nuevo-title">Registro de Nuevo Activo Fijo</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalNuevo()"
                aria-label="Cerrar formulario de nuevo activo"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="nuevoActivoForm" (ngSubmit)="guardarNuevoActivo()" class="modal-form">
              <!-- Selector Modalidad de Ingreso -->
              <div class="form-group">
                <label for="tipoIngresoActivoSelect">Modalidad de Ingreso / Origen</label>
                <select id="tipoIngresoActivoSelect" formControlName="tipoIngreso" class="tipo-ingreso-select">
                  <option value="COMPRA">Compra Regular (Adquisición institucional con Factura / Proveedor)</option>
                  <option value="REINGRESO">Reingreso (Reincorporación / Devolución a custodia de almacén)</option>
                  <option value="DONACION">Donación / Transferencia (Entidad u organismo donante externo)</option>
                </select>
              </div>

              <!-- Campos condicionales según tipoIngreso -->
              @if (nuevoActivoForm.get('tipoIngreso')?.value === 'COMPRA') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="activoProveedorSelect">Proveedor Registrado</label>
                    <select
                      id="activoProveedorSelect"
                      formControlName="proveedorId"
                      (change)="alSeleccionarProveedorActivo($event)"
                    >
                      <option value="">-- Seleccionar Proveedor del Catálogo --</option>
                      @for (p of proveedores(); track p.id) {
                        <option [value]="p.id">{{ p.razonSocial }} (NIT: {{ p.nit }})</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="activoProveedorManual">Razón Social Proveedor</label>
                    <input
                      id="activoProveedorManual"
                      type="text"
                      formControlName="proveedorNombre"
                      placeholder="Ej: Quipus Bolivia S.A."
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="activoFactura">Nº de Factura Comercial</label>
                    <input
                      id="activoFactura"
                      type="text"
                      formControlName="facturaNumero"
                      placeholder="Ej: FAC-49201"
                    />
                  </div>
                  <div class="form-group">
                    <label for="activoC31">Preventivo / C-31 SIGEP</label>
                    <input
                      id="activoC31"
                      type="text"
                      formControlName="documentoC31"
                      placeholder="Ej: C31-2026-0812"
                    />
                  </div>
                </div>
              }

              @if (nuevoActivoForm.get('tipoIngreso')?.value === 'DONACION') {
                <div class="form-group">
                  <label for="activoEntidadDonante">Entidad Donante / Cooperación Externa</label>
                  <input
                    id="activoEntidadDonante"
                    type="text"
                    formControlName="entidadDonante"
                    placeholder="Ej: PNUD Bolivia, Embajada de Japón, Cooperación JICA, Ministerio X"
                    required
                  />
                </div>
              }

              @if (nuevoActivoForm.get('tipoIngreso')?.value === 'REINGRESO') {
                <div class="form-group">
                  <label for="activoMotivoReingreso">Motivo de Reincorporación / Antecedente</label>
                  <input
                    id="activoMotivoReingreso"
                    type="text"
                    formControlName="motivoReingreso"
                    placeholder="Ej: Devolución por conclusión de proyecto, cese de funciones..."
                  />
                </div>
              }

              <div class="form-row">
                <div class="form-group">
                  <label for="activoCite">CITE Oficial / Documento Respaldo</label>
                  <input
                    id="activoCite"
                    type="text"
                    formControlName="documentoCite"
                    placeholder="Ej: ENT-CITE-ACT-2026-015"
                  />
                </div>
                <div class="form-group">
                  <label for="codigoBarras">Código de Barras / QR</label>
                  <input
                    id="codigoBarras"
                    type="text"
                    formControlName="codigoBarras"
                    placeholder="Ej: ACT-2026-9001"
                    aria-required="true"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="precioInicial">Valor Inicial (Bs.)</label>
                  <input
                    id="precioInicial"
                    type="number"
                    step="0.01"
                    formControlName="precioInicial"
                    placeholder="Ej: 4500.00"
                    aria-required="true"
                  />
                </div>
                <div class="form-group">
                  <label for="vidaUtil">Vida Útil (Meses)</label>
                  <input id="vidaUtil" type="number" formControlName="vidaUtil" placeholder="48" />
                </div>
              </div>

              <div class="form-group">
                <label for="descripcion">Descripción del Bien</label>
                <textarea
                  id="descripcion"
                  rows="2"
                  formControlName="descripcion"
                  placeholder="Detalle técnico completo, color, capacidad, etc."
                  aria-required="true"
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="marca">Marca</label>
                  <input id="marca" type="text" formControlName="marca" placeholder="Ej: Lenovo, Dell" />
                </div>
                <div class="form-group">
                  <label for="modelo">Modelo</label>
                  <input id="modelo" type="text" formControlName="modelo" placeholder="Ej: ThinkPad T14" />
                </div>
                <div class="form-group">
                  <label for="serie">Número de Serie</label>
                  <input id="serie" type="text" formControlName="serie" placeholder="Ej: SN-4920491" />
                </div>
              </div>

              <div class="form-group">
                <label for="ubicacion">Ubicación Física Inicial</label>
                <input id="ubicacion" type="text" formControlName="ubicacion" placeholder="Piso 3 - Sistemas" />
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalNuevo()">
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="nuevoActivoForm.invalid || isSaving()"
                  aria-label="Guardar registro de activo"
                >
                  {{ isSaving() ? 'Guardando...' : 'Guardar Activo' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Form Modal: Asignación y Acta Oficial -->
      @if (mostrarModalAsignacion()) {
        <div class="modal-backdrop" (click)="cerrarModalAsignacion()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-acta-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">assignment_ind</span>
                <h2 id="modal-acta-title">Asignación de Custodia y Acta Oficial</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalAsignacion()"
                aria-label="Cerrar formulario de asignación"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="asignacionForm" (ngSubmit)="guardarAsignacion()" class="modal-form">
              <div class="form-group">
                <label for="activoIdSelect">Activo Fijo a Asignar</label>
                <select id="activoIdSelect" formControlName="activoId" required>
                  <option value="" disabled>Seleccione el bien a entregar...</option>
                  @for (act of activos(); track act.id) {
                    <option [value]="act.id">
                      [{{ act.codigoBarras }}] {{ act.descripcion }} ({{ act.marca }} - S/N: {{ act.serie || 'S/N' }})
                    </option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label for="funcionarioSelect">Funcionario Receptor (Custodio)</label>
                <input
                  id="funcionarioSelect"
                  type="text"
                  formControlName="funcionarioNombre"
                  placeholder="Ej: Lic. Juan Perez Flores - C.I. 4839201 LP"
                  required
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="citeDoc">Documento CITE Oficial</label>
                  <input id="citeDoc" type="text" formControlName="documentoCite" placeholder="ENT-ACTA-2026-0042" />
                </div>
                <div class="form-group">
                  <label for="nuevaUbicacion">Nueva Ubicación Física</label>
                  <input id="nuevaUbicacion" type="text" formControlName="ubicacion" placeholder="Piso 2 - Dirección Ejecutiva" />
                </div>
              </div>

              <div class="form-group">
                <label for="motivoAsignacion">Observaciones / Motivo de Entrega</label>
                <textarea
                  id="motivoAsignacion"
                  rows="2"
                  formControlName="observaciones"
                  placeholder="Dotación de equipo de computación para funciones técnicas institucionales."
                ></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalAsignacion()">
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="asignacionForm.invalid || isSaving()"
                  aria-label="Generar acta oficial de entrega"
                >
                  <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                  <span>{{ isSaving() ? 'Generando...' : 'Asignar y Ver Acta PDF' }}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- QR Verification & Inspection Modal -->
      @if (activoQrModal()) {
        <div class="modal-backdrop" (click)="cerrarModalQr()">
          <div
            class="modal-panel qr-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-qr-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">qr_code_2</span>
                <h2 id="modal-qr-title">Identificación Global del Activo (QR)</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalQr()"
                aria-label="Cerrar ventana de QR"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <div class="qr-modal-content">
              @if (cargandoQrModal()) {
                <div class="loading-state" role="status">
                  <div class="spinner" aria-hidden="true"></div>
                  <span>Generando código QR y verificando custodio...</span>
                </div>
              } @else {
                <div class="qr-inspect-grid">
                  <div class="qr-visual-card">
                    <img
                      [src]="activoQrModal()?.qrDataUrl"
                      alt="Código QR de Verificación Global"
                      class="qr-modal-img"
                    />
                    <strong class="qr-code-text">{{ activoQrModal()?.activo?.codigoBarras }}</strong>
                    <span class="qr-sub-label">Escanee con cualquier cámara o lector móvil</span>
                  </div>

                  <div class="qr-details-card">
                    <div class="qr-detail-header">
                      <h3>{{ activoQrModal()?.activo?.descripcion }}</h3>
                      <span class="status-chip" [ngClass]="(activoQrModal()?.activo?.estado || 'BUENO').toLowerCase()">
                        {{ activoQrModal()?.activo?.estado }}
                      </span>
                    </div>

                    <div class="qr-spec-list">
                      <div class="qr-spec-row">
                        <span class="qr-spec-k">Marca / Modelo:</span>
                        <span class="qr-spec-v">{{ activoQrModal()?.activo?.marca || 'S/M' }} {{ activoQrModal()?.activo?.modelo || 'S/M' }}</span>
                      </div>
                      <div class="qr-spec-row">
                        <span class="qr-spec-k">Número de Serie:</span>
                        <span class="qr-spec-v font-mono">{{ activoQrModal()?.activo?.serie || 'S/N' }}</span>
                      </div>
                      <div class="qr-spec-row">
                        <span class="qr-spec-k">Rubro Contable:</span>
                        <span class="qr-spec-v">{{ activoQrModal()?.activo?.cuentaContable }}</span>
                      </div>
                      <div class="qr-spec-row">
                        <span class="qr-spec-k">Ubicación Física:</span>
                        <span class="qr-spec-v">{{ activoQrModal()?.activo?.ubicacion || 'Edificio Central' }}</span>
                      </div>
                    </div>

                    <!-- Asociación a Empleado -->
                    <div class="qr-custodio-section">
                      <div class="section-badge-label">
                        <span class="material-icons" aria-hidden="true">badge</span>
                        <strong>Empleado Asignado (Custodio)</strong>
                      </div>
                      @if (activoQrModal()?.asociacionEmpleado?.asignado) {
                        <p class="custodio-name">{{ activoQrModal()?.asociacionEmpleado?.custodioNombre }}</p>
                        <p class="custodio-meta">
                          C.I. {{ activoQrModal()?.asociacionEmpleado?.ci }} · {{ activoQrModal()?.asociacionEmpleado?.cargo }}
                        </p>
                      } @else {
                        <p class="custodio-unassigned">En Depósito Central (Sin Custodio Asignado)</p>
                      }
                    </div>
                  </div>
                </div>

                <div class="qr-actions-bar">
                  <button
                    type="button"
                    class="secondary-btn"
                    (click)="copiarEnlaceVerificacion(activoQrModal()?.activo?.codigoBarras)"
                    aria-label="Copiar enlace público de verificación"
                  >
                    <span class="material-icons" aria-hidden="true">{{ copiadoFeedback() ? 'check' : 'content_copy' }}</span>
                    <span>{{ copiadoFeedback() ? '¡Copiado!' : 'Copiar Enlace' }}</span>
                  </button>

                  <button
                    type="button"
                    class="accent-btn"
                    (click)="irAVerificacionPublica(activoQrModal()?.activo?.codigoBarras)"
                    aria-label="Abrir pantalla completa de verificación de activo"
                  >
                    <span class="material-icons" aria-hidden="true">open_in_new</span>
                    <span>Ver Ficha Pública</span>
                  </button>

                  <button
                    type="button"
                    class="close-btn"
                    (click)="cerrarModalQr()"
                    aria-label="Cerrar modal"
                  >
                    Cerrar
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- QR Quick Scan / Input Modal -->
      @if (mostrarModalEscanear()) {
        <div class="modal-backdrop" (click)="cerrarModalEscanear()">
          <div
            class="modal-panel scan-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-scan-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">qr_code_scanner</span>
                <h2 id="modal-scan-title">Escanear o Verificar Código QR</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalEscanear()"
                aria-label="Cerrar lector QR"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <!-- Input invisible para captura nativa de cámara móvil -->
            <input
              #modalFileInput
              type="file"
              accept="image/*"
              capture="environment"
              (change)="onModalFotoCapturada($event)"
              style="display: none;"
            />

            <div class="modal-form">
              <!-- Live Video Viewfinder (Si está activo) -->
              @if (camaraActivaModal()) {
                <div class="modal-cam-container">
                  <video #modalVideo playsinline autoplay muted class="modal-cam-feed"></video>
                  <canvas #modalCanvas class="scanner-canvas-hidden"></canvas>
                  <div class="modal-cam-hud">
                    <div class="modal-hud-laser"></div>
                    <span class="modal-hud-text">Enfoque el código QR institucional</span>
                  </div>
                </div>
              }

              @if (errorCamaraModal()) {
                <div class="modal-cam-error" role="alert">
                  <span class="material-icons" aria-hidden="true">info</span>
                  <small>{{ errorCamaraModal() }}</small>
                </div>
              }

              <div class="cam-action-buttons">
                <button
                  type="button"
                  class="btn-snap-mobile"
                  (click)="modalFileInput.click()"
                  aria-label="Tomar foto directa del código QR con la cámara del dispositivo"
                >
                  <span class="material-icons" aria-hidden="true">photo_camera</span>
                  <span>Tomar Foto con Cámara Móvil</span>
                </button>

                <button
                  type="button"
                  class="btn-toggle-livecam"
                  (click)="toggleModalCamara()"
                  aria-label="Alternar video de cámara en vivo en navegador"
                >
                  <span class="material-icons" aria-hidden="true">{{ camaraActivaModal() ? 'videocam_off' : 'videocam' }}</span>
                  <span>{{ camaraActivaModal() ? 'Pausar Cámara' : 'Activar Video en Vivo' }}</span>
                </button>
              </div>

              <div class="scan-divider">
                <span>o ingrese el código manualmente / pistola láser</span>
              </div>

              <div class="form-group">
                <label for="codigoQrEscaneado">Identificador QR / Código del Activo</label>
                <div class="input-with-action">
                  <input
                    id="codigoQrEscaneado"
                    type="text"
                    [(ngModel)]="inputQrEscaneo"
                    (keyup.enter)="procesarEscaneoQr()"
                    placeholder="Ej: ENT-12400-0001"
                  />
                  <button
                    type="button"
                    class="quick-submit-btn"
                    (click)="procesarEscaneoQr()"
                    [disabled]="!inputQrEscaneo.trim()"
                    aria-label="Buscar código"
                  >
                    <span class="material-icons" aria-hidden="true">search</span>
                  </button>
                </div>
              </div>

              <div class="scan-shortcuts">
                <span class="shortcut-title">Accesos rápidos de demostración:</span>
                <div class="shortcut-pills">
                  @for (act of activos().slice(0, 3); track act.id) {
                    <button
                      type="button"
                      class="shortcut-pill"
                      (click)="inputQrEscaneo = act.codigoBarras; procesarEscaneoQr()"
                    >
                      {{ act.codigoBarras }}
                    </button>
                  }
                </div>
              </div>

              <footer class="modal-footer">
                <a routerLink="/verificar/activo" (click)="cerrarModalEscanear()" class="full-screen-cam-link">
                  <span class="material-icons" aria-hidden="true">fullscreen</span>
                  <span>Abrir Pantalla Completa de Inspección</span>
                </a>
                <button type="button" class="cancel-btn" (click)="cerrarModalEscanear()">
                  Cerrar
                </button>
              </footer>
            </div>
          </div>
        </div>
      }

      <!-- Panel Operativo Integral: Solicitudes, Actas, Bajas y Rubros Grupo 40000 -->
      <app-activos-operaciones-panel (datosActualizados)="cargarActivos()"></app-activos-operaciones-panel>
    </div>
  `,
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    .activos-container {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 2.5rem;
      box-sizing: border-box;
      min-width: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .page-header p {
      color: #64748b;
      font-size: 0.92rem;
      margin-top: 0.25rem;
    }

    .admin-notice-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #1d4ed8;
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #1e3a8a;
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .admin-notice-banner .banner-icon {
      color: #1d4ed8;
      font-size: 1.35rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .tipo-ingreso-select {
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      border: 1.5px solid #0284c7 !important;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .primary-btn {
      background: #0d3269;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .primary-btn:hover {
      background: #164e96;
    }

    .qr-scan-btn {
      background: #0369a1;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.15rem;
      font-size: 0.88rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .qr-scan-btn:hover {
      background: #075985;
    }

    .secondary-btn {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .secondary-btn:hover {
      background: #e2e8f0;
    }

    .accent-btn {
      background: #047857;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .accent-btn:hover {
      background: #065f46;
    }

    .report-btn {
      background: #7c2d12;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .report-btn:hover {
      background: #9a3412;
    }

    .report-btn-secondary {
      background: #0e7490;
    }

    .report-btn-secondary:hover {
      background: #0891b2;
    }

    .report-btn-danger {
      background: #991b1b;
    }

    .report-btn-danger:hover {
      background: #b91c1c;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kpi-icon-wrap.blue { background: #eff6ff; color: #2563eb; }
    .kpi-icon-wrap.emerald { background: #ecfdf5; color: #059669; }
    .kpi-icon-wrap.indigo { background: #eef2ff; color: #4f46e5; }
    .kpi-icon-wrap.amber { background: #fffbeb; color: #d97706; }

    .kpi-content {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .kpi-value {
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0.2rem;
    }

    /* Toolbar */
    .toolbar-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-box input {
      width: 100%;
      height: 42px;
      padding: 0 2.5rem 0 2.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
      transition: all 0.2s;
    }

    .search-box input:focus {
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .clear-search {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0.25rem;
    }

    .filter-btn {
      height: 42px;
      padding: 0 1.25rem;
      background: #0d3269;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .filter-btn:hover {
      background: #164e96;
    }

    /* Table */
    .table-container {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 1rem 1.25rem;
      font-size: 0.88rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .table-row:hover {
      background: #f8fafc;
    }

    .qr-code-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .qr-code-chip:hover {
      background: #e0f2fe;
      border-color: #0284c7;
      box-shadow: 0 1px 3px rgba(2, 132, 199, 0.15);
    }

    .qr-chip-icon {
      font-size: 18px;
      color: #0284c7;
    }

    .qr-chip-code {
      font-family: monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
    }

    .barcode-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      font-family: monospace;
      font-size: 0.82rem;
      font-weight: 600;
      color: #0f172a;
    }

    .item-desc {
      display: flex;
      flex-direction: column;
    }

    .desc-title {
      font-size: 0.9rem;
      color: #0f172a;
    }

    .desc-meta {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    .cuenta-info {
      display: flex;
      flex-direction: column;
    }

    .cuenta-name {
      font-weight: 600;
      color: #1e293b;
    }

    .aux-name {
      font-size: 0.75rem;
      color: #64748b;
    }

    .custodio-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #0369a1;
      font-weight: 500;
    }

    .unassigned-badge {
      font-size: 0.75rem;
      color: #334155;
      font-weight: 600;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .status-chip {
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-chip.bueno { background: #dcfce7; color: #15803d; }
    .status-chip.regular { background: #fef3c7; color: #b45309; }
    .status-chip.malo { background: #fee2e2; color: #b91c1c; }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .action-btn {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .action-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .action-btn.pdf-btn {
      color: #dc2626;
      border-color: #fca5a5;
    }

    .action-btn.pdf-btn:hover {
      background: #fef2f2;
    }

    /* Modal Backdrop and Panels */
    .modal-backdrop, .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-backdrop {
      justify-content: flex-end;
    }

    .modal-panel {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .modal-header, .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .modal-title h2, .drawer-title h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-icon {
      color: #0d3269;
      font-size: 26px;
    }

    .close-modal, .close-drawer {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }

    .close-modal:hover, .close-drawer:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
      overflow-y: auto;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }

    .form-group input, .form-group select, .form-group textarea {
      padding: 0.6rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
    }

    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    .cancel-btn {
      padding: 0.6rem 1.2rem;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      color: #475569;
      font-weight: 600;
      cursor: pointer;
    }

    .submit-btn {
      padding: 0.6rem 1.5rem;
      background: #0d3269;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    /* Drawer Styles */
    .drawer-panel {
      width: 100%;
      max-width: 540px;
      height: 100vh;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.2);
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .detail-section h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    .detail-item label {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      display: block;
    }

    .detail-item p {
      font-size: 0.88rem;
      color: #1e293b;
      margin-top: 0.15rem;
    }

    .drawer-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .pdf-action-btn {
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.55rem 1.1rem;
      font-size: 0.84rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
    }

    .pdf-action-btn:hover {
      background: #b91c1c;
    }

    .close-btn {
      padding: 0.55rem 1.1rem;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      border-radius: 6px;
      color: #334155;
      font-weight: 600;
      cursor: pointer;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #0d3269;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* QR Inspection & Scan Modals */
    .qr-modal-panel {
      max-width: 720px;
    }

    .qr-modal-content {
      padding: 1.5rem;
    }

    .qr-inspect-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .qr-visual-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .qr-modal-img {
      width: 170px;
      height: 170px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }

    .qr-code-text {
      font-family: monospace;
      font-size: 0.9rem;
      color: #0d3269;
      margin-top: 0.6rem;
    }

    .qr-sub-label {
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 0.25rem;
    }

    .qr-details-card {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .qr-detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .qr-detail-header h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.3;
    }

    .qr-spec-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.86rem;
    }

    .qr-spec-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 0.25rem;
    }

    .qr-spec-k {
      color: #64748b;
      font-weight: 600;
      font-size: 0.78rem;
    }

    .qr-spec-v {
      color: #0f172a;
      font-weight: 600;
    }

    .qr-custodio-section {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.35rem;
      border: 1px solid #e2e8f0;
    }

    .section-badge-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #0d3269;
      margin-bottom: 0.35rem;
    }

    .custodio-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .custodio-meta {
      font-size: 0.8rem;
      color: #475569;
      margin-top: 0.15rem;
    }

    .custodio-unassigned {
      font-size: 0.82rem;
      color: #64748b;
      font-style: italic;
      margin: 0;
    }

    .qr-actions-bar {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
      margin-top: 1.25rem;
    }

    .scan-modal-panel {
      max-width: 520px;
    }

    .scan-instructions {
      font-size: 0.88rem;
      color: #475569;
      margin-bottom: 0.25rem;
      line-height: 1.4;
    }

    .scan-shortcuts {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }

    .shortcut-title {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .shortcut-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .shortcut-pill {
      background: #e2e8f0;
      color: #1e293b;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.6rem;
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .shortcut-pill:hover {
      background: #cbd5e1;
    }

    .modal-cam-container {
      position: relative;
      width: 100%;
      height: 220px;
      background: #000000;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 0.85rem;
    }

    .modal-cam-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scanner-canvas-hidden {
      display: none;
    }

    .modal-cam-hud {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(56, 189, 248, 0.5);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding: 0.5rem;
      pointer-events: none;
    }

    .modal-hud-laser {
      position: absolute;
      top: 10%;
      left: 10%;
      right: 10%;
      height: 2px;
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: laserScan 2s infinite ease-in-out;
    }

    @keyframes laserScan {
      0%, 100% { top: 15%; opacity: 0.6; }
      50% { top: 80%; opacity: 1; }
    }

    .modal-hud-text {
      font-size: 0.72rem;
      color: #ffffff;
      background: rgba(15, 23, 42, 0.75);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }

    .modal-cam-error {
      background: #fef3c7;
      border: 1px solid #fde047;
      color: #854d0e;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      margin-bottom: 0.75rem;
    }

    .cam-action-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }

    .btn-snap-mobile {
      width: 100%;
      height: 46px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.92rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
      transition: background 0.2s;
    }

    .btn-snap-mobile:hover {
      background: #0369a1;
    }

    .btn-toggle-livecam {
      width: 100%;
      height: 40px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      cursor: pointer;
    }

    .scan-divider {
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 0.5rem 0 0.85rem 0;
      position: relative;
    }

    .input-with-action {
      display: flex;
      gap: 0.4rem;
    }

    .quick-submit-btn {
      background: #0d3269;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .quick-submit-btn:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }

    .full-screen-cam-link {
      font-size: 0.8rem;
      color: #0284c7;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 600;
      text-decoration: none;
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 768px) {
      .activos-container {
        padding: 1rem 0.65rem;
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.85rem;
      }

      .header-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .header-actions button {
        width: 100%;
        min-width: 0;
        justify-content: center;
        font-size: 0.78rem;
        padding: 0.65rem 0.4rem;
        min-height: 44px;
      }

      .kpi-grid {
        grid-template-columns: 1fr !important;
        gap: 0.75rem;
      }

      .kpi-card {
        padding: 0.85rem 1rem;
        gap: 0.75rem;
      }

      .toolbar-card {
        flex-direction: column;
        padding: 0.75rem;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .toolbar-card .filter-btn {
        width: 100%;
      }

      .qr-inspect-grid {
        grid-template-columns: 1fr;
      }

      .qr-visual-card {
        margin: 0 auto;
        max-width: 220px;
      }

      .modal-panel, .scan-modal-panel {
        width: calc(100vw - 1rem) !important;
        max-width: calc(100vw - 1rem) !important;
        margin: 0.5rem auto;
        padding: 1.25rem 1rem;
        box-sizing: border-box;
      }

      .table-container {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .data-table {
        min-width: 650px;
      }
    }

    @media (max-width: 480px) {
      .header-actions {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ActivosListComponent implements OnInit, OnDestroy {
  @ViewChild('modalVideo') modalVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('modalCanvas') modalCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('modalFileInput') modalFileInputRef?: ElementRef<HTMLInputElement>;

  activos = signal<ActivoFijo[]>([]);
  stats = signal<ActivosEstadisticas | null>(null);
  activoSeleccionado = signal<ActivoFijo | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  searchQuery = '';

  mostrarModalNuevo = signal<boolean>(false);
  mostrarModalAsignacion = signal<boolean>(false);
  proveedores = signal<Proveedor[]>([]);

  // Estados del Sistema de Identificación Global QR y Cámara
  activoQrModal = signal<any | null>(null);
  cargandoQrModal = signal<boolean>(false);
  mostrarModalEscanear = signal<boolean>(false);
  copiadoFeedback = signal<boolean>(false);
  inputQrEscaneo = '';

  camaraActivaModal = signal<boolean>(false);
  errorCamaraModal = signal<string | null>(null);
  private modalMediaStream: MediaStream | null = null;
  private modalAnimFrameId: number | null = null;

  nuevoActivoForm: FormGroup;
  asignacionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private activosService: ActivosService,
    private proveedoresService: ProveedoresService,
    private dialog: MatDialog,
    private router: Router,
  ) {
    this.nuevoActivoForm = this.fb.group({
      tipoIngreso: ['COMPRA', Validators.required],
      proveedorId: [''],
      proveedorNombre: [''],
      facturaNumero: [''],
      documentoC31: [''],
      entidadDonante: [''],
      motivoReingreso: [''],
      documentoCite: ['ENT-ING-ACT-2026-001'],
      codigoBarras: ['', Validators.required],
      descripcion: ['', Validators.required],
      precioInicial: [1000, [Validators.required, Validators.min(1)]],
      marca: [''],
      modelo: [''],
      serie: [''],
      vidaUtil: [48],
      ubicacion: ['Edificio Central'],
    });

    this.asignacionForm = this.fb.group({
      activoId: ['', Validators.required],
      funcionarioNombre: ['', Validators.required],
      documentoCite: ['ENT-ACTA-2026-001'],
      ubicacion: ['Piso 2 - Dirección Ejecutiva'],
      observaciones: ['Asignación oficial para cumplimiento de funciones institucionales.'],
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.proveedoresService.listar().subscribe({
      next: (res) => this.proveedores.set(res.data || []),
      error: (err) => console.error('Error al cargar proveedores', err),
    });
  }

  alSeleccionarProveedorActivo(event: any): void {
    const pId = event?.target?.value;
    const prov = this.proveedores().find((p) => p.id === pId);
    if (prov) {
      this.nuevoActivoForm.patchValue({ proveedorNombre: prov.razonSocial });
    }
  }

  cargarDatos(): void {
    this.cargarEstadisticas();
    this.cargarActivos();
  }

  cargarEstadisticas(): void {
    this.activosService.obtenerEstadisticas().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Error al cargar estadísticas', err),
    });
  }

  cargarActivos(): void {
    this.isLoading.set(true);
    this.activosService.listar(1, 50, this.searchQuery).subscribe({
      next: (res) => {
        this.activos.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar activos', err);
        this.isLoading.set(false);
      },
    });
  }

  getCantidadBuenEstado(): number {
    const s = this.stats();
    if (!s) return 0;
    const buenEstado = s.porEstado?.find((e) => e.estado === 'BUENO');
    return buenEstado ? buenEstado.cantidad : 0;
  }

  verDetalle(activo: ActivoFijo): void {
    this.activoSeleccionado.set(activo);
  }

  cerrarDetalle(): void {
    this.activoSeleccionado.set(null);
  }

  abrirModalNuevoActivo(): void {
    this.mostrarModalNuevo.set(true);
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo.set(false);
  }

  guardarNuevoActivo(): void {
    if (this.nuevoActivoForm.invalid) return;
    this.isSaving.set(true);

    const val = this.nuevoActivoForm.value;
    const cuentaId = 'seed-cta-equipos';
    const auxiliarId = 'seed-aux-laptops';

    let descFinal = val.descripcion;
    if (val.tipoIngreso === 'DONACION' && val.entidadDonante) {
      descFinal = `[DONACIÓN: ${val.entidadDonante}] ${descFinal}`;
    } else if (val.tipoIngreso === 'REINGRESO') {
      descFinal = `[REINGRESO: ${val.motivoReingreso || 'Custodia'}] ${descFinal}`;
    } else if (val.tipoIngreso === 'COMPRA' && (val.facturaNumero || val.proveedorNombre)) {
      descFinal = `[COMPRA: ${val.proveedorNombre || ''} FAC: ${val.facturaNumero || ''}] ${descFinal}`;
    }

    this.activosService.crearActivo({
      codigoBarras: val.codigoBarras,
      descripcion: descFinal,
      precioInicial: Number(val.precioInicial),
      cuentaContableId: cuentaId,
      auxiliarId: auxiliarId,
      marca: val.marca,
      modelo: val.modelo,
      serie: val.serie,
      vidaUtilMeses: Number(val.vidaUtil) || 48,
      ubicacion: val.ubicacion,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cerrarModalNuevo();
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al crear activo', err);
        this.isSaving.set(false);
      },
    });
  }

  abrirModalAsignacion(): void {
    this.mostrarModalAsignacion.set(true);
  }

  cerrarModalAsignacion(): void {
    this.mostrarModalAsignacion.set(false);
  }

  guardarAsignacion(): void {
    if (this.asignacionForm.invalid) return;
    this.isSaving.set(true);

    const val = this.asignacionForm.value;
    this.activosService.crearActa({
      tipo: 'ENTREGA',
      activoIds: [val.activoId],
      funcionarioId: 'seed-user-funcionario-1',
      documentoCite: val.documentoCite,
      ubicacion: val.ubicacion,
      observaciones: val.observaciones,
    }).subscribe({
      next: (acta) => {
        this.isSaving.set(false);
        this.cerrarModalAsignacion();
        this.cargarDatos();

        // Abrir visor PDF inmediatamente
        this.abrirVisorActaId(acta.id, val.documentoCite);
      },
      error: (err) => {
        console.error('Error al crear acta', err);
        this.isSaving.set(false);
      },
    });
  }

  verActaPdf(activo: ActivoFijo): void {
    // Si el activo tiene un acta vinculada o generamos un visor oficial
    this.activosService.listarActas().subscribe({
      next: (res) => {
        const acta = res.data?.[0];
        if (acta) {
          this.abrirVisorActaId(acta.id, acta.documentoCite || 'ENT-ACTA-OFICIAL');
        } else {
          // Generar acta previa
          this.abrirVisorActaId('seed-acta-entrega-001', 'ENT-ACTA-2026-0001');
        }
      },
      error: () => {
        this.abrirVisorActaId('seed-acta-entrega-001', 'ENT-ACTA-2026-0001');
      },
    });
  }

  abrirVisorActaId(actaId: string, cite: string): void {
    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      height: '88vh',
      data: {
        titulo: 'Acta Oficial de Entrega de Activos Fijos',
        docCite: cite,
        pdfUrl: `/api/v1/pdf/acta/${actaId}`,
      },
    });
  }

  abrirVisorReporteDepreciacion(): void {
    this.dialog.open(VisorPdfDialogComponent, {
      width: '90vw',
      maxWidth: '1300px',
      height: '90vh',
      data: {
        titulo: 'Reporte 10: Inventario y Depreciación de Activos Fijos (D.S. 0181 / UFV)',
        docCite: 'REP-10-UFV-2026',
        pdfUrl: '/api/v1/pdf/reportes/depreciacion',
      },
    });
  }

  abrirVisorReporteResumen(): void {
    this.dialog.open(VisorPdfDialogComponent, {
      width: '90vw',
      maxWidth: '1300px',
      height: '90vh',
      data: {
        titulo: 'Reporte 6: Resumen de Activos Fijos por Cuenta Contable',
        docCite: 'REP-6-RESUMEN-2026',
        pdfUrl: '/api/v1/pdf/reportes/resumen',
      },
    });
  }

  abrirVisorReporteBajas(): void {
    this.dialog.open(VisorPdfDialogComponent, {
      width: '90vw',
      maxWidth: '1300px',
      height: '90vh',
      data: {
        titulo: 'Reporte 9: Histórico de Bajas de Activos Fijos',
        docCite: 'REP-9-BAJAS-2026',
        pdfUrl: '/api/v1/pdf/reportes/bajas',
      },
    });
  }

  // --- Funcionalidades de Identificación Global QR ---

  abrirModalQr(activo: ActivoFijo): void {
    this.cargandoQrModal.set(true);
    this.activoQrModal.set({
      activo,
      asociacionEmpleado: {
        asignado: !!activo.usuarioCustodio,
        custodioNombre: activo.usuarioCustodio ? `${activo.usuarioCustodio.nombres} ${activo.usuarioCustodio.apellidos}` : null,
        ci: activo.usuarioCustodio?.ci || null,
        cargo: activo.usuarioCustodio?.cargo || null,
      },
      qrDataUrl: '',
    });

    this.activosService.verificarActivo(activo.codigoBarras).subscribe({
      next: (verifData) => {
        this.activoQrModal.set(verifData);
        this.cargandoQrModal.set(false);
      },
      error: () => {
        // Fallback al endpoint directo de QR
        this.activosService.obtenerQr(activo.id).subscribe({
          next: (qrRes) => {
            this.activoQrModal.update((prev) => prev ? { ...prev, qrDataUrl: qrRes.qrDataUrl } : null);
            this.cargandoQrModal.set(false);
          },
          error: () => this.cargandoQrModal.set(false),
        });
      },
    });
  }

  cerrarModalQr(): void {
    this.activoQrModal.set(null);
    this.copiadoFeedback.set(false);
  }

  ngOnDestroy(): void {
    this.detenerCamaraModal();
  }

  abrirModalEscanear(): void {
    this.inputQrEscaneo = '';
    this.errorCamaraModal.set(null);
    this.mostrarModalEscanear.set(true);

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setTimeout(() => this.iniciarCamaraModal(), 100);
    }
  }

  cerrarModalEscanear(): void {
    this.detenerCamaraModal();
    this.mostrarModalEscanear.set(false);
  }

  toggleModalCamara(): void {
    if (this.camaraActivaModal()) {
      this.detenerCamaraModal();
    } else {
      this.iniciarCamaraModal();
    }
  }

  async iniciarCamaraModal(): Promise<void> {
    this.errorCamaraModal.set(null);
    this.camaraActivaModal.set(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.errorCamaraModal.set(
        'El navegador no permite video continuo en contextos no seguros (HTTP). ¡Usa el botón "Tomar Foto con Cámara Móvil"!'
      );
      return;
    }

    try {
      this.detenerCamaraModal();
      this.camaraActivaModal.set(true);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (firstErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      this.modalMediaStream = stream;

      let retries = 0;
      const bindFeed = async () => {
        const video = this.modalVideoRef?.nativeElement;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          try {
            await video.play();
          } catch (playErr) {
            console.warn('Error al iniciar video en modal:', playErr);
          }
          this.loopModalScanner();
        } else if (retries < 15) {
          retries++;
          setTimeout(bindFeed, 100);
        }
      };

      await bindFeed();
    } catch (err: any) {
      console.warn('Error en cámara de modal:', err);
      this.errorCamaraModal.set('Cámara en vivo no disponible. Puedes usar el botón "Tomar Foto con Cámara Móvil".');
    }
  }

  detenerCamaraModal(): void {
    if (this.modalAnimFrameId) {
      cancelAnimationFrame(this.modalAnimFrameId);
      this.modalAnimFrameId = null;
    }
    if (this.modalMediaStream) {
      this.modalMediaStream.getTracks().forEach((track) => track.stop());
      this.modalMediaStream = null;
    }
    this.camaraActivaModal.set(false);
  }

  loopModalScanner(): void {
    if (!this.camaraActivaModal()) return;

    const video = this.modalVideoRef?.nativeElement;
    const canvas = this.modalCanvasRef?.nativeElement;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          this.inputQrEscaneo = code.data;
          this.detenerCamaraModal();
          this.procesarEscaneoQr();
          return;
        }
      }
    }

    this.modalAnimFrameId = requestAnimationFrame(() => this.loopModalScanner());
  }

  onModalFotoCapturada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          this.inputQrEscaneo = code.data;
          this.detenerCamaraModal();
          this.procesarEscaneoQr();
        } else {
          alert('No se detectó un código QR legible en la foto. Intente tomar la foto enfocando de cerca con buena iluminación.');
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  procesarEscaneoQr(): void {
    let cleanCode = this.inputQrEscaneo.trim();
    if (!cleanCode) return;

    // Si el usuario o pistola escaneó la URL completa, extraer el código
    if (cleanCode.includes('/verificar/activo/')) {
      const parts = cleanCode.split('/verificar/activo/');
      cleanCode = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    this.cerrarModalEscanear();
    this.router.navigate(['/verificar/activo', cleanCode]);
  }

  irAVerificacionPublica(codigo?: string): void {
    if (!codigo) return;
    window.open(`/verificar/activo/${encodeURIComponent(codigo)}`, '_blank');
  }

  copiarEnlaceVerificacion(codigo?: string): void {
    if (!codigo) return;
    const url = `${window.location.origin}/verificar/activo/${encodeURIComponent(codigo)}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copiadoFeedback.set(true);
      setTimeout(() => this.copiadoFeedback.set(false), 2500);
    });
  }

  activarCamaraMovilDirecta(): void {
    this.cerrarModalEscanear();
    this.router.navigate(['/verificar/activo']);
  }
}
