import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProveedoresService, Proveedor } from '../../core/services/proveedores.service';

@Component({
  selector: 'app-proveedores',
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
    <div class="proveedores-container">
      <header class="page-header">
        <div>
          <div class="header-badge-scope">
            <span class="material-icons" aria-hidden="true">store</span>
            <span>Catálogo Central de Proveedores y Contratistas</span>
          </div>
          <h1>Gestión de Proveedores</h1>
          <p>Registro de empresas y proveedores para órdenes de compra e ingresos de activos y suministros</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="secondary-btn"
            (click)="cargarProveedores()"
            aria-label="Actualizar listado de proveedores"
          >
            <span class="material-icons" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            class="primary-btn"
            (click)="abrirModalNuevoProveedor()"
            aria-label="Registrar nuevo proveedor"
          >
            <span class="material-icons" aria-hidden="true">add_business</span>
            <span>+ Nuevo Proveedor</span>
          </button>
        </div>
      </header>

      <!-- KPI Summary Cards -->
      <section class="kpi-grid" aria-label="Métricas de Proveedores">
        <div class="kpi-card">
          <div class="kpi-icon-wrap blue" aria-hidden="true">
            <span class="material-icons">storefront</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Total Proveedores Registrados</span>
            <strong class="kpi-value">{{ totalProveedores() }}</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap emerald" aria-hidden="true">
            <span class="material-icons">inventory_2</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Proveedores con Activos Fijos</span>
            <strong class="kpi-value">{{ getProveedoresConActivos() }}</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap amber" aria-hidden="true">
            <span class="material-icons">warehouse</span>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Proveedores de Almacenes</span>
            <strong class="kpi-value">{{ getProveedoresConAlmacen() }}</strong>
          </div>
        </div>
      </section>

      <!-- Toolbar de Búsqueda -->
      <section class="toolbar-card" aria-label="Filtro de búsqueda de proveedores">
        <div class="search-box">
          <label for="search-prov-input" class="sr-only">Buscar por Razón Social, NIT o Contacto</label>
          <span class="material-icons search-icon" aria-hidden="true">search</span>
          <input
            id="search-prov-input"
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="cargarProveedores()"
            placeholder="Buscar por Razón Social, NIT o Contacto..."
          />
          @if (searchQuery) {
            <button
              type="button"
              class="clear-search"
              (click)="searchQuery = ''; cargarProveedores()"
              aria-label="Limpiar búsqueda"
            >
              <span class="material-icons" aria-hidden="true">close</span>
            </button>
          }
        </div>
        <button
          type="button"
          class="filter-btn"
          (click)="cargarProveedores()"
          aria-label="Ejecutar búsqueda"
        >
          <span>Buscar</span>
        </button>
      </section>

      <!-- Tabla de Proveedores -->
      <section class="table-container" aria-label="Listado de proveedores">
        @if (isLoading()) {
          <div class="loading-state" role="status">
            <div class="spinner" aria-hidden="true"></div>
            <span>Cargando catálogo de proveedores...</span>
          </div>
        } @else if (proveedores().length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon" aria-hidden="true">person_search</span>
            <h3>No se encontraron proveedores</h3>
            <p>No existen registros que coincidan con el término de búsqueda ingresado.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">NIT</th>
                <th scope="col">Razón Social / Empresa</th>
                <th scope="col">Contacto / Representante</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Dirección</th>
                <th scope="col">Movimientos</th>
                <th scope="col" class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (prov of proveedores(); track prov.id) {
                <tr class="table-row">
                  <td class="font-mono font-bold">{{ prov.nit || 'S/N' }}</td>
                  <td>
                    <strong class="prov-name">{{ prov.razonSocial }}</strong>
                  </td>
                  <td>{{ prov.contacto || 'No especificado' }}</td>
                  <td class="font-mono">{{ prov.telefono || 'S/N' }}</td>
                  <td>{{ prov.direccion || 'Sede Central' }}</td>
                  <td>
                    <div class="movimientos-tags">
                      <span class="badge-tag blue" matTooltip="Ingresos de Activos Fijos">
                        {{ prov._count?.ingresosActivo || 0 }} Activos
                      </span>
                      <span class="badge-tag amber" matTooltip="Ingresos de Almacenes">
                        {{ prov._count?.ingresosAlmacen || 0 }} Almacén
                      </span>
                    </div>
                  </td>
                  <td class="text-center">
                    <div class="row-actions">
                      <button
                        type="button"
                        class="action-btn small"
                        (click)="abrirModalEditar(prov)"
                        [attr.aria-label]="'Editar datos de ' + prov.razonSocial"
                        matTooltip="Editar Proveedor"
                      >
                        <span class="material-icons" aria-hidden="true">edit</span>
                      </button>
                      <button
                        type="button"
                        class="action-btn small delete"
                        (click)="eliminar(prov)"
                        [attr.aria-label]="'Eliminar proveedor ' + prov.razonSocial"
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
        }
      </section>

      <!-- MODAL: CREAR / EDITAR PROVEEDOR -->
      @if (mostrarModal()) {
        <div class="modal-backdrop" (click)="cerrarModal()">
          <div
            class="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-prov-title"
            (click)="$event.stopPropagation()"
          >
            <header class="modal-header">
              <div class="modal-title">
                <span class="material-icons modal-icon" aria-hidden="true">store</span>
                <h2 id="modal-prov-title">{{ proveedorSeleccionado() ? 'Editar Proveedor' : 'Registro de Nuevo Proveedor' }}</h2>
              </div>
              <button
                type="button"
                class="close-modal"
                (click)="cerrarModal()"
                aria-label="Cerrar modal de proveedor"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <form [formGroup]="proveedorForm" (ngSubmit)="guardar()" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="nit">NIT (Número de Identificación Tributaria)</label>
                  <input id="nit" type="text" formControlName="nit" placeholder="Ej: 1028374023" />
                </div>
                <div class="form-group">
                  <label for="telefono">Teléfono / Celular</label>
                  <input id="telefono" type="text" formControlName="telefono" placeholder="Ej: 2113344" />
                </div>
              </div>

              <div class="form-group">
                <label for="razonSocial">Razón Social o Nombre Comercial *</label>
                <input id="razonSocial" type="text" formControlName="razonSocial" placeholder="Ej: QUIPUS EMPRESA PUBLICA PRODUCTIVA" />
              </div>

              <div class="form-group">
                <label for="contacto">Persona de Contacto o Representante</label>
                <input id="contacto" type="text" formControlName="contacto" placeholder="Ej: Lic. Carlos Mendoza - Gerente de Ventas" />
              </div>

              <div class="form-group">
                <label for="direccion">Dirección Fiscal / Ubicación</label>
                <input id="direccion" type="text" formControlName="direccion" placeholder="Ej: Av. Camacho, Edif. La Urbana Piso 2, La Paz" />
              </div>

              <footer class="modal-footer">
                <button type="button" class="cancel-btn" (click)="cerrarModal()">Cancelar</button>
                <button type="submit" class="submit-btn" [disabled]="proveedorForm.invalid || isSaving()">
                  {{ isSaving() ? 'Guardando...' : 'Guardar Proveedor' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border-width: 0;
    }

    .proveedores-container {
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
      margin-bottom: 2rem;
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

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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
    }
    .filter-btn:hover { background: #164e96; }

    /* Table */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

    .prov-name { color: #0f172a; font-size: 0.92rem; }

    .movimientos-tags {
      display: flex;
      gap: 0.4rem;
    }

    .badge-tag {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-tag.blue { background: #eff6ff; color: #1e40af; }
    .badge-tag.amber { background: #fffbeb; color: #b45309; }

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
    }
    .action-btn:hover { background: #f1f5f9; color: #0f172a; }
    .action-btn.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* Modal */
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
      max-width: 580px;
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

    .modal-title { display: flex; align-items: center; gap: 0.6rem; }
    .modal-title h2 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0; }
    .modal-icon { color: #0d3269; font-size: 24px; }

    .close-modal {
      background: none; border: none; color: #64748b; cursor: pointer; padding: 0.35rem; border-radius: 6px;
    }
    .close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.15rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.8rem; font-weight: 700; color: #334155; text-transform: uppercase; }
    .form-group input {
      padding: 0.6rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; color: #0f172a; outline: none;
    }
    .form-group input:focus { border-color: #0d3269; box-shadow: 0 0 0 3px rgba(13, 50, 105, 0.15); }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;
    }
    .cancel-btn {
      padding: 0.6rem 1.2rem; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; color: #475569; font-weight: 600; cursor: pointer;
    }
    .submit-btn {
      padding: 0.6rem 1.5rem; background: #0d3269; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;
    }
    .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }

    /* States */
    .loading-state, .empty-state {
      padding: 3rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0d3269; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .proveedores-container {
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
      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      .toolbar-card {
        flex-direction: column;
        width: 100%;
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
  `],
})
export class ProveedoresComponent implements OnInit {
  proveedores = signal<Proveedor[]>([]);
  totalProveedores = signal<number>(0);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  searchQuery = '';

  mostrarModal = signal<boolean>(false);
  proveedorSeleccionado = signal<Proveedor | null>(null);

  proveedorForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private proveedoresService: ProveedoresService,
  ) {
    this.proveedorForm = this.fb.group({
      nit: [''],
      razonSocial: ['', Validators.required],
      contacto: [''],
      telefono: [''],
      direccion: [''],
    });
  }

  ngOnInit(): void {
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.isLoading.set(true);
    this.proveedoresService.listar(1, 50, this.searchQuery).subscribe({
      next: (res) => {
        this.proveedores.set(res.data);
        this.totalProveedores.set(res.meta.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proveedores', err);
        this.isLoading.set(false);
      },
    });
  }

  getProveedoresConActivos(): number {
    return this.proveedores().filter((p) => (p._count?.ingresosActivo || 0) > 0).length;
  }

  getProveedoresConAlmacen(): number {
    return this.proveedores().filter((p) => (p._count?.ingresosAlmacen || 0) > 0).length;
  }

  abrirModalNuevoProveedor(): void {
    this.proveedorSeleccionado.set(null);
    this.proveedorForm.reset();
    this.mostrarModal.set(true);
  }

  abrirModalEditar(prov: Proveedor): void {
    this.proveedorSeleccionado.set(prov);
    this.proveedorForm.patchValue({
      nit: prov.nit,
      razonSocial: prov.razonSocial,
      contacto: prov.contacto,
      telefono: prov.telefono,
      direccion: prov.direccion,
    });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardar(): void {
    if (this.proveedorForm.invalid) return;
    this.isSaving.set(true);

    const val = this.proveedorForm.value;
    const selected = this.proveedorSeleccionado();

    if (selected) {
      this.proveedoresService.actualizar(selected.id, val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModal();
          this.cargarProveedores();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert(err.error?.message || 'Error al actualizar el proveedor');
        },
      });
    } else {
      this.proveedoresService.crear(val).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cerrarModal();
          this.cargarProveedores();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert(err.error?.message || 'Error al crear el proveedor');
        },
      });
    }
  }

  eliminar(prov: Proveedor): void {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${prov.razonSocial}"?`)) return;

    this.proveedoresService.eliminar(prov.id).subscribe({
      next: () => this.cargarProveedores(),
      error: (err) => alert(err.error?.message || 'No se puede eliminar el proveedor con registros vinculados'),
    });
  }
}
