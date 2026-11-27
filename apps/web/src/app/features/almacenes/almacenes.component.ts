import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  AlmacenesClientService,
  AlmacenItem,
  StockAlmacenItem,
  KardexResponse,
} from '../../core/services/almacenes-client.service';
import { ProveedoresService, Proveedor } from '../../core/services/proveedores.service';
import { VisorPdfDialogComponent } from '../../shared/components/visor-pdf/visor-pdf-dialog.component';
import { AlmacenesOperacionesPanelComponent } from './almacenes-operaciones-panel.component';

@Component({
  selector: 'app-almacenes',
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
    AlmacenesOperacionesPanelComponent,
  ],
  template: `
    <div class="almacenes-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <h1>Almacén Central y Sub-Almacenes</h1>
          <p>Control jerárquico de existencias, suministros y dotación a sucursales dependientes</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="secondary-btn"
            (click)="abrirModalIngreso()"
            aria-label="Registrar nueva nota de ingreso o compra"
          >
            <span class="material-icons" aria-hidden="true">input</span>
            <span>+ Nota de Ingreso</span>
          </button>
          <button
            type="button"
            class="secondary-btn"
            (click)="abrirModalSolicitud()"
            aria-label="Registrar solicitud o salida de suministros"
          >
            <span class="material-icons" aria-hidden="true">shopping_cart</span>
            <span>+ Solicitar Pedido</span>
          </button>
          <button
            type="button"
            class="secondary-btn"
            (click)="abrirModalCrearSubalmacen()"
            aria-label="Crear nueva sucursal o subalmacén"
          >
            <span class="material-icons" aria-hidden="true">domain_add</span>
            <span>+ Sub-Almacén</span>
          </button>
          <button
            type="button"
            class="primary-btn"
            (click)="abrirModalTraspaso()"
            aria-label="Dotar o traspasar suministros a sucursal"
          >
            <span class="material-icons" aria-hidden="true">send</span>
            <span>Dotar a Sucursal</span>
          </button>
        </div>
      </header>

      <!-- Admin Role Notice Banner -->
      <section class="admin-notice-banner" aria-label="Aviso de administración de almacenes">
        <span class="material-icons banner-icon" aria-hidden="true">admin_panel_settings</span>
        <div class="banner-body">
          <strong>Consola Administrativa de Almacenes:</strong>
          <span>
            Exclusivo para encargados de inventario y suministros. Los funcionarios de la entidad efectúan sus solicitudes de material mediante el sistema <strong>Plantillas</strong> con CITE oficial, las cuales se recepcionan y atienden en esta bandeja.
          </span>
        </div>
      </section>

      <!-- Warehouse Selection Tabs / Pills -->
      <nav class="warehouse-tabs" aria-label="Selección de almacén o sucursal">
        @for (alm of almacenes(); track alm.id) {
          <button
            type="button"
            class="tab-btn"
            [class.active]="alm.id === almacenActivo()?.id"
            (click)="seleccionarAlmacen(alm)"
            [attr.aria-label]="'Seleccionar ' + alm.nombre + (alm.esCentral ? ' (Almacén Principal)' : ' (Sucursal)')"
          >
            <span class="material-icons tab-icon" aria-hidden="true">{{ alm.esCentral ? 'account_balance' : 'domain' }}</span>
            <div class="tab-label">
              <span class="tab-title">{{ alm.nombre }}</span>
              <span class="tab-sub">{{ alm.esCentral ? 'Almacén Principal' : 'Sucursal Dependiente' }}</span>
            </div>
          </button>
        }
      </nav>

      <!-- Active Warehouse Info & KPIs -->
      @if (almacenActivo(); as sel) {
        <section class="warehouse-info-card" aria-label="Información del almacén seleccionado">
          <div class="info-meta">
            <div class="meta-row">
              <span class="code-badge">{{ sel.codigo }}</span>
              <h2>{{ sel.nombre }}</h2>
              @if (sel.esCentral) {
                <span class="badge-central">Almacén Central</span>
              } @else {
                <span class="badge-sucursal">Sub-Almacén Dependiente</span>
              }
            </div>
            <p class="address-text">
              <span class="material-icons" aria-hidden="true">place</span>
              <span>{{ sel.direccion || 'Dirección no registrada' }}</span>
            </p>
          </div>

          <div class="info-stats">
            <div class="stat-pill">
              <span class="stat-title">Responsable</span>
              <strong class="stat-value">{{ sel.responsable?.nombres || 'Por asignar' }} {{ sel.responsable?.apellidos || '' }}</strong>
            </div>
            @if (sel.esCentral) {
              <div class="stat-pill">
                <span class="stat-title">Sub-Almacenes Hijos</span>
                <strong class="stat-value">{{ sel.subalmacenes.length || 0 }} Sucursales</strong>
              </div>
            } @else {
              <div class="stat-pill">
                <span class="stat-title">Depende de</span>
                <strong class="stat-value">{{ sel.almacenPadre?.nombre || 'Almacén Central' }}</strong>
              </div>
            }
          </div>
        </section>

        <!-- Stocks Table in Selected Warehouse -->
        <section class="table-card" aria-label="Inventario de suministros en almacén">
          <header class="table-header">
            <h3>Existencias Físicas en este Almacén</h3>
            <span class="item-count">{{ stocks().length }} ítems registrados</span>
          </header>

          @if (isLoading()) {
            <div class="loading-state" role="status">
              <div class="spinner" aria-hidden="true"></div>
              <span>Consultando existencias de almacén...</span>
            </div>
          } @else if (stocks().length === 0) {
            <div class="empty-state">
              <span class="material-icons empty-icon" aria-hidden="true">inventory</span>
              <h4>Sin existencias registradas</h4>
              <p>Este sub-almacén aún no tiene ítems dotados desde el Almacén Central.</p>
              <button
                type="button"
                class="secondary-btn"
                (click)="abrirModalTraspaso()"
                aria-label="Asignar inventario inicial ahora"
              >
                <span>Asignar inventario inicial ahora</span>
              </button>
            </div>
          } @else {
            <div class="table-responsive-wrapper">
              <table class="stocks-table">
                <caption class="sr-only">Existencias y saldos de suministros en el almacén</caption>
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Descripción del Suministro</th>
                    <th scope="col">Grupo / Material</th>
                    <th scope="col" class="text-right">Stock Disponible</th>
                    <th scope="col" class="text-right">Costo Unit. Promedio</th>
                    <th scope="col">Ubicación Estante</th>
                    <th scope="col" class="text-center">Kardex / PDF</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of stocks(); track item.id) {
                    <tr class="stock-row">
                      <td>
                        <span class="code-tag">{{ item.subarticulo.codigo }}</span>
                      </td>
                      <td>
                        <strong class="desc-text">{{ item.subarticulo.descripcion }}</strong>
                      </td>
                      <td>
                        <span class="group-text">{{ item.subarticulo.material.descripcion || 'Material General' }}</span>
                      </td>
                      <td class="text-right">
                        <span
                          class="stock-badge"
                          [class.low-stock]="Number(item.stockActual) <= Number(item.stockMinimo)"
                        >
                          {{ item.stockActual }} {{ item.subarticulo.unidadMedida }}
                        </span>
                      </td>
                      <td class="text-right font-mono">
                        Bs. {{ Number(item.costoPromedio) | number:'1.2-2' }}
                      </td>
                      <td>
                        <span class="shelf-tag">{{ item.ubicacionEstante || 'Depósito General' }}</span>
                      </td>
                      <td class="text-center">
                        <div class="table-actions">
                          <button
                            type="button"
                            class="kardex-btn"
                            (click)="abrirKardex(item.subarticulo.id)"
                            [attr.aria-label]="'Consultar kardex de ' + item.subarticulo.descripcion"
                            matTooltip="Ver Kardex en pantalla"
                          >
                            <span class="material-icons" aria-hidden="true">receipt_long</span>
                          </button>
                          <button
                            type="button"
                            class="kardex-btn pdf-kardex-btn"
                            (click)="abrirPdfKardexDirecto(item.subarticulo.id, item.subarticulo.descripcion)"
                            [attr.aria-label]="'Ver o descargar kardex oficial en PDF de ' + item.subarticulo.descripcion"
                            matTooltip="Ver Kardex PDF Oficial"
                          >
                            <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- Transfer Modal -->
      @if (mostrarModalTraspaso()) {
        <div class="modal-backdrop" (click)="cerrarModalTraspaso()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-traspaso-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">move_to_inbox</span>
                <h2 id="modal-traspaso-title">Dotar / Traspasar Suministros a Sucursal</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalTraspaso()"
                aria-label="Cerrar modal de dotación"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form (ngSubmit)="confirmarTraspaso()" class="modal-form">
              <div class="form-group">
                <label for="origenInput">Almacén de Origen (Principal)</label>
                <input
                  id="origenInput"
                  type="text"
                  [value]="almacenCentral()?.nombre || 'Almacén Central - Sede La Paz'"
                  disabled
                  class="disabled-input"
                />
              </div>

              <div class="form-group">
                <label for="destinoSelect">Sub-Almacén de Destino (Sucursal)</label>
                <select
                  id="destinoSelect"
                  [(ngModel)]="traspasoForm.destinoId"
                  name="destinoId"
                  required
                >
                  <option value="" disabled>Selecciona la sucursal de destino...</option>
                  @for (sub of subalmacenesDisponibles(); track sub.id) {
                    <option [value]="sub.id">{{ sub.nombre }} ({{ sub.direccion }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label for="itemSelect">Suministro a Transferir</label>
                <select
                  id="itemSelect"
                  [(ngModel)]="traspasoForm.subarticuloId"
                  name="subarticuloId"
                  required
                >
                  <option value="" disabled>Selecciona el suministro...</option>
                  @for (st of stocksCentral(); track st.id) {
                    <option [value]="st.subarticulo.id">
                      {{ st.subarticulo.descripcion }} (Disponible en Central: {{ st.stockActual }})
                    </option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label for="cantidadInput">Cantidad a Asignar</label>
                <input
                  id="cantidadInput"
                  type="number"
                  min="1"
                  [(ngModel)]="traspasoForm.cantidad"
                  name="cantidad"
                  required
                  placeholder="Ej: 10"
                />
              </div>

              <div class="form-group">
                <label for="citeInput">Documento CITE Oficial</label>
                <input
                  id="citeInput"
                  type="text"
                  [(ngModel)]="traspasoForm.documentoCite"
                  name="documentoCite"
                  placeholder="Ej: ADSIB-TRASP-2026-0010"
                />
              </div>

              <div class="form-group">
                <label for="motivoInput">Motivo de la Dotación</label>
                <textarea
                  id="motivoInput"
                  rows="2"
                  [(ngModel)]="traspasoForm.motivo"
                  name="motivo"
                  placeholder="Justificación de asignación de material para la sucursal..."
                ></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalTraspaso()">Cancelar</button>
                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="isSubmittingTransfer"
                  aria-label="Confirmar dotación a sucursal"
                >
                  {{ isSubmittingTransfer ? 'Registrando...' : 'Confirmar Dotación' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Form Modal: Nueva Nota de Ingreso (Compra, Reingreso, Donación) -->
      @if (mostrarModalIngreso()) {
        <div class="modal-backdrop" (click)="cerrarModalIngreso()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-ingreso-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">inventory_2</span>
                <h2 id="modal-ingreso-title">Nota de Ingreso de Suministros</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalIngreso()"
                aria-label="Cerrar modal de ingreso"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="ingresoForm" (ngSubmit)="guardarIngreso()" class="modal-form">
              <!-- Selector de Modalidad / Tipo de Ingreso -->
              <div class="form-group">
                <label for="tipoIngresoSelect">Modalidad de Ingreso</label>
                <select id="tipoIngresoSelect" formControlName="tipoIngreso" class="tipo-ingreso-select">
                  <option value="COMPRA">Compra Regular (Adquisición con Proveedor / Factura)</option>
                  <option value="REINGRESO">Reingreso (Devolución interna de material no utilizado)</option>
                  <option value="DONACION">Donación / Transferencia (Entidad Donante Externa)</option>
                </select>
              </div>

              <!-- Campos condicionales según Tipo de Ingreso -->
              @if (ingresoForm.get('tipoIngreso')?.value === 'COMPRA') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="ingresoProveedorSelect">Proveedor Registrado</label>
                    <select
                      id="ingresoProveedorSelect"
                      formControlName="proveedorId"
                      (change)="alSeleccionarProveedor($event)"
                    >
                      <option value="">-- Seleccionar Proveedor del Catálogo --</option>
                      @for (p of proveedores(); track p.id) {
                        <option [value]="p.id">{{ p.razonSocial }} (NIT: {{ p.nit }})</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="ingresoProveedorManual">Razón Social Proveedor</label>
                    <input
                      id="ingresoProveedorManual"
                      type="text"
                      formControlName="proveedorNombre"
                      placeholder="Ej: Papelería Líder S.R.L."
                      required
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="ingresoFactura">Nº de Factura</label>
                    <input
                      id="ingresoFactura"
                      type="text"
                      formControlName="facturaNumero"
                      placeholder="Ej: FAC-98402"
                    />
                  </div>
                  <div class="form-group">
                    <label for="ingresoC31">Preventivo / C-31 SIGEP</label>
                    <input
                      id="ingresoC31"
                      type="text"
                      formControlName="documentoC31"
                      placeholder="Ej: C31-2026-1049"
                    />
                  </div>
                </div>
              }

              @if (ingresoForm.get('tipoIngreso')?.value === 'DONACION') {
                <div class="form-group">
                  <label for="ingresoEntidadDonante">Entidad Donante / Cooperación Externa</label>
                  <input
                    id="ingresoEntidadDonante"
                    type="text"
                    formControlName="entidadDonante"
                    placeholder="Ej: PNUD Bolivia, Embajada de Japón, Cooperación JICA, Ministerio X"
                    required
                  />
                </div>
              }

              @if (ingresoForm.get('tipoIngreso')?.value === 'REINGRESO') {
                <div class="form-group">
                  <label for="ingresoMotivoReingreso">Motivo de Reingreso / Procedencia</label>
                  <input
                    id="ingresoMotivoReingreso"
                    type="text"
                    formControlName="motivoReingreso"
                    placeholder="Ej: Devolución por excedente de taller, reposición por unidad..."
                  />
                </div>
              }

              <div class="form-row">
                <div class="form-group">
                  <label for="ingresoCite">CITE Oficial / Documento Respaldo</label>
                  <input
                    id="ingresoCite"
                    type="text"
                    formControlName="documentoCite"
                    placeholder="Ej: ADSIB-CITE-2026-081"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="ingresoArticulo">Suministro o Material</label>
                  <select id="ingresoArticulo" formControlName="subarticuloId" required>
                    <option value="" disabled>Seleccionar suministro a ingresar...</option>
                    @for (st of stocks(); track st.id) {
                      <option [value]="st.subarticulo.id">
                        {{ st.subarticulo.codigo }} - {{ st.subarticulo.descripcion }} ({{ st.subarticulo.unidadMedida }})
                      </option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="ingresoCantidad">Cantidad Ingresada</label>
                  <input id="ingresoCantidad" type="number" min="1" formControlName="cantidad" required />
                </div>
                <div class="form-group">
                  <label for="ingresoCosto">Costo Unitario (Bs.)</label>
                  <input id="ingresoCosto" type="number" step="0.01" min="0.01" formControlName="costoUnitario" required />
                </div>
              </div>

              <div class="form-group">
                <label for="ingresoObs">Observaciones y Constancia</label>
                <textarea
                  id="ingresoObs"
                  rows="2"
                  formControlName="observaciones"
                  placeholder="Recepción conforme en almacén central."
                ></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalIngreso()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="ingresoForm.invalid || isSaving()">
                  {{ isSaving() ? 'Registrando...' : 'Registrar Ingreso' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Form Modal: Nueva Solicitud de Pedido -->
      @if (mostrarModalSolicitud()) {
        <div class="modal-backdrop" (click)="cerrarModalSolicitud()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-solicitud-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">shopping_basket</span>
                <h2 id="modal-solicitud-title">Solicitud de Materiales de Almacén</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalSolicitud()"
                aria-label="Cerrar modal de solicitud"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="solicitudForm" (ngSubmit)="guardarSolicitud()" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="solicitudFuncionario">Funcionario Solicitante</label>
                  <input
                    id="solicitudFuncionario"
                    type="text"
                    formControlName="solicitante"
                    placeholder="Lic. María Gonzales (Sistemas)"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="solicitudCite">CITE Solicitud</label>
                  <input
                    id="solicitudCite"
                    type="text"
                    formControlName="documentoCite"
                    placeholder="ADSIB-SOL-2026-0045"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="solicitudArticulo">Material Requerido</label>
                <select id="solicitudArticulo" formControlName="subarticuloId" required>
                  <option value="" disabled>Seleccione material...</option>
                  @for (st of stocks(); track st.id) {
                    <option [value]="st.subarticulo.id">
                      {{ st.subarticulo.descripcion }} (En stock: {{ st.stockActual }})
                    </option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label for="solicitudCantidad">Cantidad Requerida</label>
                <input id="solicitudCantidad" type="number" min="1" formControlName="cantidad" required />
              </div>

              <div class="form-group">
                <label for="solicitudMotivo">Justificación</label>
                <textarea id="solicitudMotivo" rows="2" formControlName="motivo" placeholder="Para atención de requerimientos de la unidad técnica."></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalSolicitud()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="solicitudForm.invalid || isSaving()">
                  {{ isSaving() ? 'Enviando...' : 'Enviar Solicitud' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Form Modal: Crear Sub-Almacén -->
      @if (mostrarModalSubalmacen()) {
        <div class="modal-backdrop" (click)="cerrarModalCrearSubalmacen()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-subalmacen-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">domain</span>
                <h2 id="modal-subalmacen-title">Crear Nueva Sucursal / Sub-Almacén</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalCrearSubalmacen()"
                aria-label="Cerrar modal de creación de subalmacén"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="subalmacenForm" (ngSubmit)="guardarSubalmacen()" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="subCodigo">Código Sucursal</label>
                  <input id="subCodigo" type="text" formControlName="codigo" placeholder="ALM-SCZ-01" required />
                </div>
                <div class="form-group">
                  <label for="subNombre">Nombre de la Sucursal</label>
                  <input id="subNombre" type="text" formControlName="nombre" placeholder="Sub-Almacén Regional Santa Cruz" required />
                </div>
              </div>

              <div class="form-group">
                <label for="subDireccion">Dirección Física</label>
                <input id="subDireccion" type="text" formControlName="direccion" placeholder="Av. Monseñor Rivero #420" required />
              </div>

              <div class="form-group">
                <label for="subResponsable">Responsable Encargado</label>
                <input id="subResponsable" type="text" formControlName="responsableNombre" placeholder="Ing. Carlos Vaca - Administrador Regional" />
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalCrearSubalmacen()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="subalmacenForm.invalid || isSaving()">
                  {{ isSaving() ? 'Creando...' : 'Crear Sub-Almacén' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- Kardex Modal -->
      @if (kardexData()) {
        <div class="modal-backdrop" (click)="cerrarKardex()">
          <div
            class="modal-panel large"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-kardex-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div>
                <span class="code-badge">Kardex Físico-Valorado</span>
                <h2 id="modal-kardex-title">{{ kardexData()?.subarticulo?.descripcion }}</h2>
              </div>
              <div class="header-actions">
                <button
                  type="button"
                  class="pdf-action-btn"
                  (click)="imprimirKardexPdf(kardexData()!)"
                  aria-label="Descargar o ver este Kardex en PDF oficial"
                >
                  <span class="material-icons" aria-hidden="true">picture_as_pdf</span>
                  <span>Ver Kardex PDF</span>
                </button>
                <button
                  type="button"
                  class="close-modal"
                  (click)="cerrarKardex()"
                  aria-label="Cerrar modal de kardex"
                >
                  <span class="material-icons" aria-hidden="true">close</span>
                </button>
              </div>
            </header>

            <div class="modal-body-scroll">
              @if (kardexData()?.movimientos?.length === 0) {
                <p class="text-muted text-center p-4">Sin movimientos registrados para este suministro.</p>
              } @else {
                <table class="kardex-table">
                  <caption class="sr-only">Detalle de movimientos físico-valorados del artículo</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Tipo Movimiento</th>
                      <th scope="col">Almacén / Ubicación</th>
                      <th scope="col">CITE</th>
                      <th scope="col" class="text-right">Cantidad</th>
                      <th scope="col" class="text-right">Costo Unit.</th>
                      <th scope="col" class="text-right">Saldo Físico</th>
                      <th scope="col" class="text-right">Saldo Valorado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of kardexData()?.movimientos; track m.id) {
                      <tr>
                        <td>{{ m.fecha | date:'short' }}</td>
                        <td>
                          <span class="mov-badge" [ngClass]="m.tipoMovimiento.toLowerCase()">
                            {{ m.tipoMovimiento }}
                          </span>
                        </td>
                        <td>{{ m.almacen?.nombre || 'Almacén Central' }}</td>
                        <td class="font-mono">{{ m.documentoCite || 'S/N' }}</td>
                        <td class="text-right font-mono">{{ m.cantidad }}</td>
                        <td class="text-right font-mono">Bs. {{ Number(m.costoUnitario) | number:'1.2-2' }}</td>
                        <td class="text-right font-mono font-bold">{{ m.saldoCantidad }}</td>
                        <td class="text-right font-mono font-bold">Bs. {{ Number(m.saldoCostoTotal) | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <footer class="modal-footer">
              <button type="button" class="cancel-btn" (click)="cerrarKardex()">Cerrar</button>
            </footer>
          </div>
        </div>
      }

      <!-- Panel Operativo Integral: Solicitudes, Ingresos, Catálogo Grupo 30000 y PDF Valorado -->
      <app-almacenes-operaciones-panel (datosActualizados)="cargarAlmacenes()"></app-almacenes-operaciones-panel>
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

    .almacenes-page {
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
      gap: 0.6rem;
      flex-wrap: wrap;
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

    .primary-btn:hover { background: #164e96; }

    .secondary-btn {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.6rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .secondary-btn:hover { background: #e2e8f0; }

    .pdf-action-btn {
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.84rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
    }

    .pdf-action-btn:hover { background: #b91c1c; }

    /* Tabs */
    .warehouse-tabs {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      min-width: 210px;
    }

    .tab-btn:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }

    .tab-btn.active {
      border-color: #0d3269;
      background: #f0f4f9;
      box-shadow: 0 0 0 2px rgba(13, 50, 105, 0.15);
    }

    .tab-icon {
      font-size: 24px;
      color: #64748b;
    }

    .tab-btn.active .tab-icon {
      color: #0d3269;
    }

    .tab-btn.active .tab-sub {
      color: #0d3269;
      font-weight: 600;
    }

    .tab-label {
      display: flex;
      flex-direction: column;
    }

    .tab-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0f172a;
    }

    .tab-sub {
      font-size: 0.75rem;
      color: #475569;
    }

    /* Warehouse Info Card */
    .warehouse-info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .meta-row h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .code-badge {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      color: #334155;
    }

    .badge-central {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
    }

    .badge-sucursal {
      background: #fef3c7;
      color: #b45309;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
    }

    .address-text {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #64748b;
      font-size: 0.85rem;
      margin-top: 0.4rem;
    }

    .address-text .material-icons {
      font-size: 1.1rem;
      color: #94a3b8;
    }

    .info-stats {
      display: flex;
      gap: 1.25rem;
    }

    .stat-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      display: flex;
      flex-direction: column;
    }

    .stat-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      color: #475569;
      font-weight: 700;
    }

    .stat-value {
      font-size: 0.95rem;
      color: #0f172a;
      margin-top: 0.15rem;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .table-responsive-wrapper {
      display: block;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }

    .table-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .item-count {
      font-size: 0.8rem;
      color: #475569;
    }

    .stocks-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .stocks-table th {
      background: #f8fafc;
      padding: 0.85rem 1.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }

    .stocks-table td {
      padding: 0.95rem 1.25rem;
      font-size: 0.88rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .stock-row:hover { background: #f8fafc; }

    .code-tag {
      font-family: monospace;
      font-weight: 700;
      color: #0369a1;
    }

    .desc-text { color: #0f172a; }
    .group-text { font-size: 0.8rem; color: #64748b; }

    .stock-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      background: #f1f5f9;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
      color: #0f172a;
    }

    .stock-badge.low-stock {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .shelf-tag {
      font-size: 0.78rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      color: #64748b;
    }

    .table-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .kardex-btn {
      width: 32px;
      height: 32px;
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

    .kardex-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .kardex-btn.pdf-kardex-btn {
      color: #dc2626;
      border-color: #fca5a5;
    }

    .kardex-btn.pdf-kardex-btn:hover {
      background: #fef2f2;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-panel {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .modal-panel.large {
      max-width: 980px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .modal-title h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-icon {
      color: #0d3269;
      font-size: 26px;
    }

    .close-modal {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }

    .close-modal:hover {
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

    .disabled-input {
      background: #f1f5f9 !important;
      color: #64748b !important;
      cursor: not-allowed;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
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
    }

    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .modal-body-scroll {
      flex: 1;
      overflow-y: auto;
      max-height: 60vh;
      padding: 1rem;
    }

    .kardex-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }

    .kardex-table th {
      background: #f8fafc;
      padding: 0.65rem 0.9rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }

    .kardex-table td {
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .mov-badge {
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .mov-badge.ingreso { background: #dcfce7; color: #15803d; }
    .mov-badge.salida { background: #fee2e2; color: #b91c1c; }
    .mov-badge.traspaso { background: #e0f2fe; color: #0369a1; }

    .loading-state, .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748b;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #0d3269;
      border-radius: 50%;
      margin: 0 auto 1rem auto;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .almacenes-page {
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
        margin-bottom: 1.25rem;
      }

      .page-header h1 {
        font-size: 1.45rem;
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
        padding: 0.65rem 0.4rem;
        font-size: 0.78rem;
        min-height: 44px;
      }

      .warehouse-tabs {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .warehouse-info-card {
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: 1rem;
      }

      .info-stats {
        width: 100%;
        flex-wrap: wrap;
      }

      .table-responsive-wrapper {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .stocks-table {
        min-width: 650px;
      }

      .modal-panel, .modal-panel.large {
        width: calc(100vw - 1rem) !important;
        max-width: calc(100vw - 1rem) !important;
        max-height: 90vh;
        margin: 0.5rem auto;
        padding: 1.25rem 1rem;
        box-sizing: border-box;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .header-actions {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AlmacenesComponent implements OnInit {
  almacenes = signal<AlmacenItem[]>([]);
  almacenActivo = signal<AlmacenItem | null>(null);
  stocks = signal<StockAlmacenItem[]>([]);
  stocksCentral = signal<StockAlmacenItem[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  mostrarModalTraspaso = signal<boolean>(false);
  mostrarModalIngreso = signal<boolean>(false);
  mostrarModalSolicitud = signal<boolean>(false);
  mostrarModalSubalmacen = signal<boolean>(false);
  proveedores = signal<Proveedor[]>([]);

  kardexData = signal<KardexResponse | null>(null);

  isSubmittingTransfer = false;
  traspasoForm = {
    destinoId: '',
    subarticuloId: '',
    cantidad: 1,
    documentoCite: '',
    motivo: '',
  };

  ingresoForm: FormGroup;
  solicitudForm: FormGroup;
  subalmacenForm: FormGroup;

  Number = Number;

  constructor(
    private fb: FormBuilder,
    private almacenesService: AlmacenesClientService,
    private proveedoresService: ProveedoresService,
    private dialog: MatDialog,
  ) {
    this.ingresoForm = this.fb.group({
      tipoIngreso: ['COMPRA', Validators.required],
      proveedorId: [''],
      proveedorNombre: [''],
      facturaNumero: [''],
      documentoC31: [''],
      entidadDonante: [''],
      motivoReingreso: [''],
      documentoCite: ['', Validators.required],
      subarticuloId: ['', Validators.required],
      cantidad: [100, [Validators.required, Validators.min(1)]],
      costoUnitario: [25.5, [Validators.required, Validators.min(0.01)]],
      observaciones: ['Ingreso regular registrado por Administración de Almacenes.'],
    });

    this.solicitudForm = this.fb.group({
      solicitante: ['', Validators.required],
      documentoCite: ['ADSIB-SOL-2026-0045'],
      subarticuloId: ['', Validators.required],
      cantidad: [5, [Validators.required, Validators.min(1)]],
      motivo: ['Dotación de insumos para tareas operativas.'],
    });

    this.subalmacenForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      responsableNombre: [''],
    });
  }

  ngOnInit(): void {
    this.cargarAlmacenes();
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.proveedoresService.listar().subscribe({
      next: (res) => this.proveedores.set(res.data || []),
      error: (err) => console.error('Error al cargar proveedores', err),
    });
  }

  alSeleccionarProveedor(event: any): void {
    const pId = event?.target?.value;
    const prov = this.proveedores().find((p) => p.id === pId);
    if (prov) {
      this.ingresoForm.patchValue({ proveedorNombre: prov.razonSocial });
    }
  }

  cargarAlmacenes(): void {
    this.almacenesService.listarAlmacenes().subscribe({
      next: (list) => {
        this.almacenes.set(list);
        if (list.length > 0 && !this.almacenActivo()) {
          this.seleccionarAlmacen(list[0]);
        }
      },
      error: (err) => console.error('Error al listar almacenes', err),
    });
  }

  seleccionarAlmacen(alm: AlmacenItem): void {
    this.almacenActivo.set(alm);
    this.isLoading.set(true);
    this.almacenesService.obtenerStocksPorAlmacen(alm.id).subscribe({
      next: (res) => {
        this.stocks.set(res.stocks);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener stocks', err);
        this.isLoading.set(false);
      },
    });
  }

  almacenCentral(): AlmacenItem | undefined {
    return this.almacenes().find((a) => a.esCentral);
  }

  subalmacenesDisponibles(): AlmacenItem[] {
    return this.almacenes().filter((a) => !a.esCentral);
  }

  // Traspasos
  abrirModalTraspaso(): void {
    const central = this.almacenCentral();
    if (central) {
      this.almacenesService.obtenerStocksPorAlmacen(central.id).subscribe({
        next: (res) => this.stocksCentral.set(res.stocks),
      });
    }
    this.traspasoForm = {
      destinoId: '',
      subarticuloId: '',
      cantidad: 1,
      documentoCite: `ADSIB-TRASP-2026-000${Math.floor(Math.random() * 90 + 10)}`,
      motivo: 'Dotación periódica de suministros para sucursal',
    };
    this.mostrarModalTraspaso.set(true);
  }

  cerrarModalTraspaso(): void {
    this.mostrarModalTraspaso.set(false);
  }

  confirmarTraspaso(): void {
    const central = this.almacenCentral();
    if (!central || !this.traspasoForm.destinoId || !this.traspasoForm.subarticuloId) return;

    this.isSubmittingTransfer = true;
    this.almacenesService
      .realizarTraspaso({
        almacenOrigenId: central.id,
        almacenDestinoId: this.traspasoForm.destinoId,
        documentoCite: this.traspasoForm.documentoCite,
        motivo: this.traspasoForm.motivo,
        items: [
          {
            subarticuloId: this.traspasoForm.subarticuloId,
            cantidad: Number(this.traspasoForm.cantidad),
          },
        ],
      })
      .subscribe({
        next: () => {
          this.isSubmittingTransfer = false;
          this.cerrarModalTraspaso();
          if (this.almacenActivo()) {
            this.seleccionarAlmacen(this.almacenActivo()!);
          }
        },
        error: (err) => {
          this.isSubmittingTransfer = false;
          alert(err.error?.message || 'Error al ejecutar el traspaso');
        },
      });
  }

  // Ingreso
  abrirModalIngreso(): void {
    this.mostrarModalIngreso.set(true);
  }

  cerrarModalIngreso(): void {
    this.mostrarModalIngreso.set(false);
  }

  guardarIngreso(): void {
    if (this.ingresoForm.invalid) return;
    this.isSaving.set(true);
    const val = this.ingresoForm.value;

    const central = this.almacenCentral();
    const payload: any = {
      almacenId: central?.id || this.almacenActivo()?.id,
      tipoIngreso: val.tipoIngreso,
      documentoCite: val.documentoCite,
      observaciones: val.observaciones,
      items: [
        {
          subarticuloId: val.subarticuloId,
          cantidad: Number(val.cantidad),
          costoUnitario: Number(val.costoUnitario),
        },
      ],
    };

    if (val.tipoIngreso === 'COMPRA') {
      payload.proveedorId = val.proveedorId || undefined;
      payload.proveedorNombre = val.proveedorNombre || undefined;
      payload.facturaNumero = val.facturaNumero || undefined;
      payload.documentoC31 = val.documentoC31 || undefined;
    } else if (val.tipoIngreso === 'DONACION') {
      payload.entidadDonante = val.entidadDonante;
      payload.observaciones = `[DONACIÓN: ${val.entidadDonante}] ${val.observaciones || ''}`;
    } else if (val.tipoIngreso === 'REINGRESO') {
      payload.observaciones = `[REINGRESO: ${val.motivoReingreso || 'Devolución'}] ${val.observaciones || ''}`;
    }

    this.almacenesService.crearIngreso(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cerrarModalIngreso();
        if (this.almacenActivo()) {
          this.seleccionarAlmacen(this.almacenActivo()!);
        }
      },
      error: (err) => {
        console.error('Error al registrar ingreso', err);
        this.isSaving.set(false);
      },
    });
  }

  // Solicitud
  abrirModalSolicitud(): void {
    this.mostrarModalSolicitud.set(true);
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud.set(false);
  }

  guardarSolicitud(): void {
    if (this.solicitudForm.invalid) return;
    this.isSaving.set(true);
    const val = this.solicitudForm.value;

    this.almacenesService.crearSolicitud({
      almacenId: this.almacenActivo()?.id,
      documentoCite: val.documentoCite,
      motivo: val.motivo,
      items: [
        {
          subarticuloId: val.subarticuloId,
          cantidadSolicitada: Number(val.cantidad),
        },
      ],
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cerrarModalSolicitud();
      },
      error: (err) => {
        console.error('Error al registrar solicitud', err);
        this.isSaving.set(false);
      },
    });
  }

  // Sub-almacén
  abrirModalCrearSubalmacen(): void {
    this.mostrarModalSubalmacen.set(true);
  }

  cerrarModalCrearSubalmacen(): void {
    this.mostrarModalSubalmacen.set(false);
  }

  guardarSubalmacen(): void {
    if (this.subalmacenForm.invalid) return;
    this.isSaving.set(true);
    const val = this.subalmacenForm.value;
    const central = this.almacenCentral();

    this.almacenesService.crearAlmacen({
      codigo: val.codigo,
      nombre: val.nombre,
      direccion: val.direccion,
      esCentral: false,
      almacenPadreId: central?.id,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cerrarModalCrearSubalmacen();
        this.cargarAlmacenes();
      },
      error: (err) => {
        console.error('Error al crear sub-almacén', err);
        this.isSaving.set(false);
      },
    });
  }

  // Kardex
  abrirKardex(subarticuloId: string): void {
    const almId = this.almacenActivo()?.id;
    this.almacenesService.obtenerKardex(subarticuloId, almId).subscribe({
      next: (k) => this.kardexData.set(k),
      error: (err) => console.error('Error al obtener kardex', err),
    });
  }

  cerrarKardex(): void {
    this.kardexData.set(null);
  }

  imprimirKardexPdf(kardex: KardexResponse): void {
    const subId = kardex.subarticulo.id;
    this.abrirPdfKardexDirecto(subId, kardex.subarticulo.descripcion);
  }

  abrirPdfKardexDirecto(subarticuloId: string, descripcion: string): void {
    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      height: '88vh',
      data: {
        titulo: `Kardex Físico-Valorado: ${descripcion}`,
        docCite: `KARDEX-${subarticuloId.slice(0, 8).toUpperCase()}`,
        pdfUrl: `/api/v1/pdf/kardex/${subarticuloId}`,
      },
    });
  }
}
