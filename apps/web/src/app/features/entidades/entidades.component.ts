import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EntidadesService, Entidad, InstitucionHija } from '../../core/services/entidades.service';

@Component({
  selector: 'app-entidades',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="entidades-container">
      <!-- Header con Clarificación de Rol Administrativo -->
      <header class="page-header">
        <div>
          <div class="header-badge-scope">
            <span class="material-icons" aria-hidden="true">admin_panel_settings</span>
            <span>Módulo de Configuración · Administrador de Activos y Almacenes</span>
          </div>
          <h1>Estructura Organizacional: Entidades e Instituciones</h1>
          <p>Gestión de la Entidad Matriz y sus Instituciones / Sucursales dependientes conforme a vSIAF original</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="secondary-btn"
            (click)="cargarEntidades()"
            aria-label="Actualizar listado de entidades"
          >
            <span class="material-icons" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            class="primary-btn"
            (click)="abrirModalNuevaEntidad()"
            aria-label="Registrar nueva entidad institucional"
          >
            <span class="material-icons" aria-hidden="true">domain_add</span>
            <span>+ Nueva Entidad</span>
          </button>
        </div>
      </header>

      <!-- Nota Informativa de Interoperabilidad con Plantillas -->
      <aside class="notice-card" role="region" aria-label="Información de Flujo Institucional">
        <span class="material-icons notice-icon" aria-hidden="true">info</span>
        <div class="notice-content">
          <strong>Arquitectura de Roles NSIAF v2 & Plantillas:</strong>
          <p>
            NSIAF v2 es exclusivo para la administración de activos y almacenes. Los funcionarios de las unidades institucionales
            no interactúan directamente con esta consola; sus solicitudes de activos y suministros se canalizan y despachan desde la plataforma
            <strong>Plantillas</strong> a través de CITEs oficiales.
          </p>
        </div>
      </aside>

      <!-- Grid de Entidades e Instituciones Hijas -->
      @if (isLoading()) {
        <div class="loading-state" role="status">
          <div class="spinner" aria-hidden="true"></div>
          <span>Cargando estructura institucional...</span>
        </div>
      } @else if (entidades().length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon" aria-hidden="true">domain_disabled</span>
          <h3>No existen entidades registradas</h3>
          <p>Registre la entidad pública principal para estructurar las instituciones y almacenes.</p>
        </div>
      } @else {
        <div class="entidades-grid">
          @for (entidad of entidades(); track entidad.id) {
            <article class="entidad-card">
              <!-- Cabecera de la Entidad Matriz -->
              <header class="entidad-header">
                <div class="entidad-info">
                  <div class="entidad-tag">{{ entidad.sigla }} · Cód: {{ entidad.codigo }}</div>
                  <h2>{{ entidad.nombre }}</h2>
                  @if (entidad.encabezado) {
                    <small class="entidad-sub">{{ entidad.encabezado }}</small>
                  }
                  @if (entidad.piePagina) {
                    <p class="entidad-address">
                      <span class="material-icons" aria-hidden="true">place</span>
                      <span>{{ entidad.piePagina }}</span>
                    </p>
                  }
                </div>
                <div class="entidad-actions">
                  <button
                    type="button"
                    class="action-btn"
                    (click)="abrirModalEditarEntidad(entidad)"
                    [attr.aria-label]="'Editar entidad ' + entidad.nombre"
                    matTooltip="Editar Datos de Entidad"
                  >
                    <span class="material-icons" aria-hidden="true">edit</span>
                  </button>
                  <button
                    type="button"
                    class="btn-add-inst"
                    (click)="abrirModalNuevaInstitucion(entidad)"
                    [attr.aria-label]="'Agregar institución hija a ' + entidad.sigla"
                  >
                    <span class="material-icons" aria-hidden="true">add_location_alt</span>
                    <span>+ Agregar Institución Hija</span>
                  </button>
                </div>
              </header>

              <!-- Sección: Instituciones / Edificios Hijas -->
              <section class="hijos-section" aria-label="Instituciones y Sucursales dependientes">
                <div class="hijos-header">
                  <div class="hijos-title">
                    <span class="material-icons tree-icon" aria-hidden="true">account_tree</span>
                    <h3>Instituciones / Sucursales Hijas ({{ entidad.edificios?.length || 0 }})</h3>
                  </div>
                  <span class="hijos-subtitle">Edificios y sedes dependientes donde operan almacenes y unidades</span>
                </div>

                @if (!entidad.edificios || entidad.edificios.length === 0) {
                  <p class="no-hijos-msg">Sin instituciones hijas registradas bajo esta entidad matriz.</p>
                } @else {
                  <div class="instituciones-table-wrap">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Código</th>
                          <th scope="col">Nombre Institución / Edificio</th>
                          <th scope="col">Dirección Física</th>
                          <th scope="col">Unidades / Departamentos</th>
                          <th scope="col">Almacenes Asignados</th>
                          <th scope="col" class="text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (inst of entidad.edificios; track inst.id) {
                          <tr>
                            <td class="font-mono font-bold">{{ inst.codigo }}</td>
                            <td>
                              <strong class="inst-name">{{ inst.nombre }}</strong>
                            </td>
                            <td>{{ inst.direccion || 'Sede Central' }}</td>
                            <td>
                              <span class="badge-count blue">
                                {{ inst.unidades?.length || 0 }} Unidades
                              </span>
                            </td>
                            <td>
                              @if (inst.almacenes && inst.almacenes.length > 0) {
                                <div class="almacen-tags">
                                  @for (alm of inst.almacenes; track alm.id) {
                                    <span class="alm-chip" [class.central]="alm.esCentral">
                                      {{ alm.nombre }} {{ alm.esCentral ? '(Central)' : '' }}
                                    </span>
                                  }
                                </div>
                              } @else {
                                <span class="text-muted">Sin almacén</span>
                              }
                            </td>
                            <td class="text-center">
                              <div class="row-actions">
                                <button
                                  type="button"
                                  class="action-btn small"
                                  (click)="abrirModalEditarInstitucion(inst, entidad)"
                                  [attr.aria-label]="'Editar institución ' + inst.nombre"
                                  matTooltip="Editar Institución"
                                >
                                  <span class="material-icons" aria-hidden="true">edit</span>
                                </button>
                                <button
                                  type="button"
                                  class="action-btn small delete"
                                  (click)="eliminarInstitucion(inst)"
                                  [attr.aria-label]="'Eliminar institución ' + inst.nombre"
                                  matTooltip="Eliminar"
                                >
                                  <span class="material-icons" aria-hidden="true">delete</span>
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
            </article>
          }
        </div>
      }

      <!-- MODAL: CREAR / EDITAR ENTIDAD -->
      @if (mostrarModalEntidad()) {
        <div class="modal-backdrop" (click)="cerrarModalEntidad()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-entidad-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">domain</span>
                <h2 id="modal-entidad-title">{{ entidadSeleccionada() ? 'Editar Entidad' : 'Nueva Entidad Institucional' }}</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalEntidad()"
                aria-label="Cerrar modal de entidad"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="entidadForm" (ngSubmit)="guardarEntidad()" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="entCodigo">Código Oficial</label>
                  <input id="entCodigo" type="text" formControlName="codigo" placeholder="Ej: ADSIB" />
                </div>
                <div class="form-group">
                  <label for="entSigla">Sigla Institucional</label>
                  <input id="entSigla" type="text" formControlName="sigla" placeholder="Ej: ADSIB, AGETIC" />
                </div>
              </div>

              <div class="form-group">
                <label for="entNombre">Nombre Oficial de la Entidad</label>
                <input id="entNombre" type="text" formControlName="nombre" placeholder="Ej: Agencia para el Desarrollo de la Sociedad de la Información" />
              </div>

              <div class="form-group">
                <label for="entEncabezado">Encabezado para Actas y Documentos</label>
                <input id="entEncabezado" type="text" formControlName="encabezado" placeholder="ESTADO PLURINACIONAL DE BOLIVIA - ..." />
              </div>

              <div class="form-group">
                <label for="entPiePagina">Dirección / Pie de Página Institucional</label>
                <textarea id="entPiePagina" rows="2" formControlName="piePagina" placeholder="Calle, Edificio, Ciudad - Bolivia"></textarea>
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalEntidad()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="entidadForm.invalid || isSaving()">
                  {{ isSaving() ? 'Guardando...' : 'Guardar Entidad' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- MODAL: CREAR / EDITAR INSTITUCIÓN HIJA -->
      @if (mostrarModalInstitucion()) {
        <div class="modal-backdrop" (click)="cerrarModalInstitucion()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-inst-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">account_tree</span>
                <h2 id="modal-inst-title">{{ institucionSeleccionada() ? 'Editar Institución / Sucursal' : 'Nueva Institución Hija' }}</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModalInstitucion()"
                aria-label="Cerrar modal de institución"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="institucionForm" (ngSubmit)="guardarInstitucion()" class="modal-form">
              <div class="parent-banner">
                <span class="material-icons" aria-hidden="true">corporate_fare</span>
                <span>Dependiente de: <strong>{{ entidadPadre()?.nombre }} ({{ entidadPadre()?.sigla }})</strong></span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="instCodigo">Código Institución / Edificio</label>
                  <input id="instCodigo" type="text" formControlName="codigo" placeholder="Ej: EDIF-LPZ-01" />
                </div>
                <div class="form-group">
                  <label for="instNombre">Nombre Institución / Sede</label>
                  <input id="instNombre" type="text" formControlName="nombre" placeholder="Ej: Sede Telecomunicaciones La Paz" />
                </div>
              </div>

              <div class="form-group">
                <label for="instDireccion">Dirección Física</label>
                <input id="instDireccion" type="text" formControlName="direccion" placeholder="Ej: Calle Ayacucho esq. Potosí" />
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModalInstitucion()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="institucionForm.invalid || isSaving()">
                  {{ isSaving() ? 'Guardando...' : 'Guardar Institución' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }

      <!-- SECCIÓN ORGANIGRAMA PROPIO Y ABSORCIÓN DEL ECOSISTEMA -->
      <section class="org-section">
        <div class="org-header">
          <div>
            <h2>Organigrama Institucional (Unidades y Subunidades)</h2>
            <p>Construye tu estructura organizacional propia o absorbe el organigrama automáticamente desde Plantillas u otro sistema del ecosistema.</p>
          </div>
          <div class="org-actions">
            <button type="button" class="btn-org-sync" (click)="abrirModalImportarOrg()">
              <span class="material-icons">cloud_download</span>
              <span>Absorber Organigrama (Plantillas / JSON)</span>
            </button>
            <button type="button" class="btn-org-add" (click)="abrirModalNuevaUnidad()">
              <span class="material-icons">add_business</span>
              <span>Nueva Unidad</span>
            </button>
          </div>
        </div>

        @if (unidades().length === 0) {
          <div class="org-empty">No hay unidades organizacionales registradas aún.</div>
        } @else {
          <div class="org-table-wrap">
            <table class="org-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Unidad / Departamento</th>
                  <th>Sigla</th>
                  <th>Depende de (Padre)</th>
                  <th>Edificio / Sede</th>
                  <th>Personal</th>
                  <th style="text-align:right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (un of unidades(); track un.id) {
                  <tr>
                    <td class="mono">{{ un.codigo }}</td>
                    <td><strong>{{ un.nombre }}</strong></td>
                    <td><span class="sigla-pill">{{ un.sigla || '—' }}</span></td>
                    <td>{{ un.unidadPadre ? un.unidadPadre.nombre : 'Nivel Raíz' }}</td>
                    <td>{{ un.edificio?.nombre || '—' }}</td>
                    <td>{{ un._count?.usuarios || 0 }} func.</td>
                    <td style="text-align:right;">
                      <button type="button" class="org-icon-btn" (click)="abrirModalEditarUnidad(un)" title="Editar unidad">
                        <span class="material-icons">edit</span>
                      </button>
                      <button type="button" class="org-icon-btn danger" (click)="eliminarUnidad(un)" title="Eliminar unidad">
                        <span class="material-icons">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- MODAL CREAR / EDITAR UNIDAD ORGANIGRAMA -->
      @if (mostrarModalUnidad()) {
        <div class="modal-backdrop" (click)="mostrarModalUnidad.set(false)">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon">account_tree</span>
                <h2>{{ unidadEditandoId() ? 'Editar Unidad del Organigrama' : 'Nueva Unidad Organizacional' }}</h2>
              </div>
              <button type="button" class="close-modal" (click)="mostrarModalUnidad.set(false)">
                <span class="material-icons">close</span>
              </button>
            </header>
            <div class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Código Numérico (opcional)</label>
                  <input type="number" [(ngModel)]="unidadFormModel.codigo" placeholder="Auto" />
                </div>
                <div class="form-group">
                  <label>Sigla</label>
                  <input type="text" [(ngModel)]="unidadFormModel.sigla" placeholder="Ej: UAF, TIC, GER" />
                </div>
              </div>
              <div class="form-group">
                <label>Nombre de la Unidad / Departamento *</label>
                <input type="text" [(ngModel)]="unidadFormModel.nombre" placeholder="Ej: Unidad de Activos Fijos y Almacenes" />
              </div>
              <div class="form-group">
                <label>Sede / Edificio *</label>
                <select [(ngModel)]="unidadFormModel.edificioId">
                  <option value="">-- Seleccionar Sede --</option>
                  @for (ed of todosEdificios(); track ed.id) {
                    <option [value]="ed.id">{{ ed.entidadSigla }} · {{ ed.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Unidad Padre (Dependencia Jerárquica)</label>
                <select [(ngModel)]="unidadFormModel.unidadPadreId">
                  <option value="">-- Ninguna (Nivel Raíz) --</option>
                  @for (u of unidades(); track u.id) {
                    @if (u.id !== unidadEditandoId()) {
                      <option [value]="u.id">[{{ u.codigo }}] {{ u.nombre }}</option>
                    }
                  }
                </select>
              </div>
              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="mostrarModalUnidad.set(false)">Cancelar</button>
                <button type="button" class="submit-btn" (click)="guardarUnidad()">Guardar Unidad</button>
              </footer>
            </div>
          </div>
        </div>
      }

      <!-- MODAL ABSORBER ORGANIGRAMA DEL ECOSISTEMA -->
      @if (mostrarModalImportarOrg()) {
        <div class="modal-backdrop" (click)="mostrarModalImportarOrg.set(false)">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon">cloud_sync</span>
                <h2>Absorber Organigrama del Ecosistema</h2>
              </div>
              <button type="button" class="close-modal" (click)="mostrarModalImportarOrg.set(false)">
                <span class="material-icons">close</span>
              </button>
            </header>
            <div class="modal-form">
              <div class="form-group">
                <label>Edificio / Sede Destino *</label>
                <select [(ngModel)]="importOrgModel.edificioId">
                  <option value="">-- Seleccionar Sede --</option>
                  @for (ed of todosEdificios(); track ed.id) {
                    <option [value]="ed.id">{{ ed.entidadSigla }} · {{ ed.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>URL de API Externa (Plantillas / Intranet)</label>
                <input type="text" [(ngModel)]="importOrgModel.origenUrl" placeholder="http://192.168.1.10:3000/api/v1/seguridad/unidad_arbol" />
              </div>
              <div class="form-group">
                <label>Token Bearer (Opcional si el endpoint requiere autenticación)</label>
                <input type="password" [(ngModel)]="importOrgModel.tokenBearer" placeholder="eyJhbGciOi..." />
              </div>
              <div class="form-group">
                <label>O pegar arreglo JSON de unidades (si no se usa URL)</label>
                <textarea rows="4" [(ngModel)]="importOrgModel.jsonManual" placeholder='[{"codigo": 1, "nombre": "Gerencia General", "sigla": "GG"}, {"codigo": 2, "nombre": "Unidad Administrativa", "sigla": "UA", "codigoPadre": 1}]'></textarea>
              </div>
              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="mostrarModalImportarOrg.set(false)">Cancelar</button>
                <button type="button" class="submit-btn" [disabled]="importandoOrg()" (click)="ejecutarImportacionOrg()">
                  {{ importandoOrg() ? 'Sincronizando...' : 'Absorber Organigrama' }}
                </button>
              </footer>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .entidades-container {
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
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .header-badge-scope {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      padding: 0.2rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.4rem;
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

    .header-actions {
      display: flex;
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
    .primary-btn:hover { background: #164e96; }

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
    }
    .secondary-btn:hover { background: #e2e8f0; }

    /* Notice Card */
    .notice-card {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 10px;
      padding: 0.9rem 1.25rem;
      margin-bottom: 2rem;
    }

    .notice-icon { color: #16a34a; font-size: 1.5rem; margin-top: 0.1rem; }
    .notice-content strong { color: #14532d; font-size: 0.9rem; font-weight: 800; display: block; }
    .notice-content p { color: #166534; font-size: 0.84rem; margin-top: 0.2rem; line-height: 1.4; }

    /* Entidades Grid */
    .entidades-grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .entidad-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .entidad-header {
      background: #f8fafc;
      padding: 1.5rem 1.75rem;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .entidad-tag {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .entidad-header h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0.25rem 0;
    }

    .entidad-sub {
      color: #64748b;
      font-size: 0.84rem;
      font-weight: 600;
    }

    .entidad-address {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #475569;
      font-size: 0.82rem;
      margin-top: 0.4rem;
    }

    .entidad-address .material-icons { font-size: 1rem; color: #0284c7; }

    .entidad-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-add-inst {
      background: #047857;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.1rem;
      font-size: 0.84rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-add-inst:hover { background: #065f46; }

    /* Hijos Section */
    .hijos-section {
      padding: 1.5rem 1.75rem;
    }

    .hijos-header {
      margin-bottom: 1.25rem;
    }

    .hijos-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tree-icon { color: #0284c7; }

    .hijos-title h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .hijos-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      display: block;
      margin-top: 0.15rem;
    }

    .no-hijos-msg {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.88rem;
      padding: 1rem 0;
    }

    .instituciones-table-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 0.85rem 1rem;
      font-size: 0.86rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .inst-name { color: #0f172a; font-size: 0.9rem; }

    .badge-count.blue {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .almacen-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .alm-chip {
      background: #f1f5f9;
      color: #334155;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .alm-chip.central {
      background: #dbeafe;
      color: #1e40af;
      font-weight: 700;
    }

    .row-actions {
      display: flex;
      justify-content: center;
      gap: 0.35rem;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .action-btn:hover { background: #f1f5f9; color: #0f172a; }
    .action-btn.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

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
      padding: 1rem;
    }

    .modal-panel {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
      overflow: hidden;
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

    .modal-title h2 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0; }
    .modal-icon { color: #0d3269; font-size: 24px; }

    .close-modal {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 6px;
    }
    .close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .parent-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #eff6ff;
      color: #1e40af;
      padding: 0.65rem 0.85rem;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }

    .form-group input, .form-group textarea {
      padding: 0.6rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
    }

    .form-group input:focus, .form-group textarea:focus {
      border-color: #0d3269;
      box-shadow: 0 0 0 3px rgba(13, 50, 105, 0.15);
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
    }
    .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }

    /* States */
    .loading-state, .empty-state {
      padding: 3rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0d3269;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .entidades-container {
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
        font-size: 0.8rem;
        padding: 0.65rem 0.5rem;
      }
      .entidad-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.85rem;
        padding: 1rem;
      }
      .entidad-actions {
        width: 100%;
        flex-wrap: wrap;
      }
      .btn-add-inst {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
      .hijos-section {
        padding: 1rem;
      }
      .instituciones-table-wrap {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .data-table {
        min-width: 580px;
      }
      .modal-panel {
        width: calc(100vw - 1rem) !important;
        max-width: calc(100vw - 1rem) !important;
        margin: 0.5rem auto;
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
    .org-section { margin-top: 2.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; }
    .org-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .org-header h2 { margin: 0; font-size: 1.3rem; color: #0f172a; }
    .org-header p { margin: 0.3rem 0 0; color: #475569; font-size: 0.88rem; }
    .org-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn-org-sync { display: inline-flex; align-items: center; gap: 0.4rem; background: #0284c7; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-org-add { display: inline-flex; align-items: center; gap: 0.4rem; background: #0f172a; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .org-table-wrap { overflow-x: auto; }
    .org-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .org-table th { text-align: left; padding: 0.75rem; background: #f8fafc; color: #475569; font-size: 0.74rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .org-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .sigla-pill { background: #eff6ff; color: #1d4ed8; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.76rem; }
    .org-icon-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.3rem; cursor: pointer; margin-left: 0.25rem; display: inline-flex; }
    .org-icon-btn.danger { color: #dc2626; }
    .org-empty { padding: 1.5rem; text-align: center; color: #64748b; }
    .mono { font-family: monospace; font-weight: 600; }
  `],
})
export class EntidadesComponent implements OnInit {
  entidades = signal<Entidad[]>([]);
  unidades = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  mostrarModalEntidad = signal<boolean>(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  mostrarModalInstitucion = signal<boolean>(false);
  institucionSeleccionada = signal<InstitucionHija | null>(null);
  entidadPadre = signal<Entidad | null>(null);

  mostrarModalUnidad = signal<boolean>(false);
  unidadEditandoId = signal<string | null>(null);
  unidadFormModel: any = { codigo: null, nombre: '', sigla: '', edificioId: '', unidadPadreId: '' };

  mostrarModalImportarOrg = signal<boolean>(false);
  importandoOrg = signal<boolean>(false);
  importOrgModel = { edificioId: '', origenUrl: '', tokenBearer: '', jsonManual: '' };

  entidadForm: FormGroup;
  institucionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private entidadesService: EntidadesService,
  ) {
    this.entidadForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      sigla: ['', Validators.required],
      encabezado: [''],
      piePagina: [''],
    });

    this.institucionForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      direccion: [''],
    });
  }

  ngOnInit(): void {
    this.cargarEntidades();
    this.cargarUnidades();
  }

  cargarUnidades(): void {
    this.entidadesService.listarUnidades().subscribe({
      next: (u) => this.unidades.set(u),
      error: (err) => console.error('Error al cargar organigrama', err),
    });
  }

  todosEdificios(): Array<{ id: string; nombre: string; entidadSigla: string }> {
    const out: Array<{ id: string; nombre: string; entidadSigla: string }> = [];
    for (const e of this.entidades()) {
      for (const ed of e.edificios || []) {
        out.push({ id: ed.id, nombre: ed.nombre, entidadSigla: e.sigla });
      }
    }
    return out;
  }

  abrirModalNuevaUnidad(): void {
    const firstEd = this.todosEdificios()[0]?.id || '';
    this.unidadEditandoId.set(null);
    this.unidadFormModel = { codigo: null, nombre: '', sigla: '', edificioId: firstEd, unidadPadreId: '' };
    this.mostrarModalUnidad.set(true);
  }

  abrirModalEditarUnidad(un: any): void {
    this.unidadEditandoId.set(un.id);
    this.unidadFormModel = {
      codigo: un.codigo,
      nombre: un.nombre,
      sigla: un.sigla || '',
      edificioId: un.edificioId,
      unidadPadreId: un.unidadPadreId || '',
    };
    this.mostrarModalUnidad.set(true);
  }

  guardarUnidad(): void {
    if (!this.unidadFormModel.nombre || !this.unidadFormModel.edificioId) {
      alert('El nombre y el edificio/sede son obligatorios.');
      return;
    }
    const payload = {
      codigo: this.unidadFormModel.codigo ? Number(this.unidadFormModel.codigo) : undefined,
      nombre: this.unidadFormModel.nombre,
      sigla: this.unidadFormModel.sigla || undefined,
      edificioId: this.unidadFormModel.edificioId,
      unidadPadreId: this.unidadFormModel.unidadPadreId || null,
    };

    const obs = this.unidadEditandoId()
      ? this.entidadesService.actualizarUnidad(this.unidadEditandoId()!, payload)
      : this.entidadesService.crearUnidad(payload);

    obs.subscribe({
      next: () => {
        this.mostrarModalUnidad.set(false);
        this.cargarUnidades();
        this.cargarEntidades();
      },
      error: (err) => alert(err?.error?.message || 'Error al guardar la unidad'),
    });
  }

  eliminarUnidad(un: any): void {
    if (!confirm(`¿Eliminar la unidad "${un.nombre}"?`)) return;
    this.entidadesService.eliminarUnidad(un.id).subscribe({
      next: () => {
        this.cargarUnidades();
        this.cargarEntidades();
      },
      error: (err) => alert(err?.error?.message || 'No se pudo eliminar la unidad'),
    });
  }

  abrirModalImportarOrg(): void {
    const firstEd = this.todosEdificios()[0]?.id || '';
    this.importOrgModel = {
      edificioId: firstEd,
      origenUrl: 'http://192.168.1.10:3000/api/v1/seguridad/unidad_arbol',
      tokenBearer: '',
      jsonManual: '',
    };
    this.mostrarModalImportarOrg.set(true);
  }

  ejecutarImportacionOrg(): void {
    if (!this.importOrgModel.edificioId) {
      alert('Selecciona un edificio/sede destino.');
      return;
    }
    let unidadesJson: any[] | undefined;
    if (this.importOrgModel.jsonManual.trim()) {
      try {
        unidadesJson = JSON.parse(this.importOrgModel.jsonManual);
      } catch {
        alert('El JSON ingresado no es válido.');
        return;
      }
    }

    this.importandoOrg.set(true);
    this.entidadesService
      .importarOrganigrama({
        edificioId: this.importOrgModel.edificioId,
        origenUrl: unidadesJson ? undefined : this.importOrgModel.origenUrl,
        tokenBearer: this.importOrgModel.tokenBearer || undefined,
        unidades: unidadesJson,
      })
      .subscribe({
        next: (res) => {
          this.importandoOrg.set(false);
          this.mostrarModalImportarOrg.set(false);
          this.cargarUnidades();
          this.cargarEntidades();
          alert(res?.mensaje || 'Organigrama absorbido correctamente.');
        },
        error: (err) => {
          this.importandoOrg.set(false);
          alert(err?.error?.message || 'Error al absorber organigrama.');
        },
      });
  }

  cargarEntidades(): void {
    this.isLoading.set(true);
    this.entidadesService.listar().subscribe({
      next: (data) => {
        this.entidades.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar entidades', err);
        this.isLoading.set(false);
      },
    });
  }

  abrirModalNuevaEntidad(): void {
    this.entidadSeleccionada.set(null);
    this.entidadForm.reset();
    this.mostrarModalEntidad.set(true);
  }

  abrirModalEditarEntidad(ent: Entidad): void {
    this.entidadSeleccionada.set(ent);
    this.entidadForm.patchValue({
      codigo: ent.codigo,
      nombre: ent.nombre,
      sigla: ent.sigla,
      encabezado: ent.encabezado,
      piePagina: ent.piePagina,
    });
    this.mostrarModalEntidad.set(true);
  }

  cerrarModalEntidad(): void {
    this.mostrarModalEntidad.set(false);
  }

  guardarEntidad(): void {
    if (this.entidadForm.invalid) return;
    this.isSaving.set(true);

    const val = this.entidadForm.value;
    const selected = this.entidadSeleccionada();

    if (selected) {
      this.entidadesService.actualizarEntidad(selected.id, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModalEntidad();
          this.cargarEntidades();
        },
        error: () => this.isSaving.set(false),
      });
    } else {
      this.entidadesService.crearEntidad(val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModalEntidad();
          this.cargarEntidades();
        },
        error: () => this.isSaving.set(false),
      });
    }
  }

  abrirModalNuevaInstitucion(entidad: Entidad): void {
    this.entidadPadre.set(entidad);
    this.institucionSeleccionada.set(null);
    this.institucionForm.reset();
    this.mostrarModalInstitucion.set(true);
  }

  abrirModalEditarInstitucion(inst: InstitucionHija, entidad: Entidad): void {
    this.entidadPadre.set(entidad);
    this.institucionSeleccionada.set(inst);
    this.institucionForm.patchValue({
      codigo: inst.codigo,
      nombre: inst.nombre,
      direccion: inst.direccion,
    });
    this.mostrarModalInstitucion.set(true);
  }

  cerrarModalInstitucion(): void {
    this.mostrarModalInstitucion.set(false);
  }

  guardarInstitucion(): void {
    if (this.institucionForm.invalid) return;
    const padre = this.entidadPadre();
    if (!padre) return;

    this.isSaving.set(true);
    const val = this.institucionForm.value;
    const selected = this.institucionSeleccionada();

    if (selected) {
      this.entidadesService.actualizarInstitucion(selected.id, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModalInstitucion();
          this.cargarEntidades();
        },
        error: () => this.isSaving.set(false),
      });
    } else {
      this.entidadesService.crearInstitucion(padre.id, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModalInstitucion();
          this.cargarEntidades();
        },
        error: () => this.isSaving.set(false),
      });
    }
  }

  eliminarInstitucion(inst: InstitucionHija): void {
    if (!confirm(`¿Está seguro de eliminar la institución ${inst.nombre}?`)) return;

    this.entidadesService.eliminarInstitucion(inst.id).subscribe({
      next: () => this.cargarEntidades(),
      error: (err) => alert(err.error?.message || 'No se pudo eliminar la institución'),
    });
  }
}
