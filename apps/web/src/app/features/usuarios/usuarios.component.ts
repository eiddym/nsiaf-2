import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsuariosService, UsuarioItem, RolCatalogo, UsuariosResumen } from '../../core/services/usuarios.service';
import { EntidadesService } from '../../core/services/entidades.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div>
          <span class="eyebrow">ADMINISTRACIÓN & SEGURIDAD RBAC</span>
          <h1>Gestión de Usuarios y Roles</h1>
          <p>Crea funcionarios, asigna responsables de Activos Fijos y Almacenes, ayudantes operativos y unidades del organigrama.</p>
        </div>
        <button type="button" class="btn-primary" (click)="abrirModalCrear()">
          <span class="material-icons">person_add</span>
          <span>Nuevo Usuario</span>
        </button>
      </header>

      <!-- KPIs -->
      @if (resumen(); as r) {
        <section class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Total Usuarios</span>
            <strong class="kpi-value">{{ r.total }}</strong>
          </div>
          <div class="kpi-card success">
            <span class="kpi-label">Activos</span>
            <strong class="kpi-value">{{ r.activos }}</strong>
          </div>
          <div class="kpi-card muted">
            <span class="kpi-label">Inactivos / Bloqueados</span>
            <strong class="kpi-value">{{ r.inactivos }}</strong>
          </div>
          <div class="kpi-card info">
            <span class="kpi-label">Roles en Uso</span>
            <strong class="kpi-value">{{ r.porRol.length }}</strong>
          </div>
        </section>
      }

      <!-- Filtros -->
      <section class="filters-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input
            type="text"
            [(ngModel)]="filtroTexto"
            (ngModelChange)="cargarUsuarios()"
            placeholder="Buscar por nombre, CI, usuario o cargo..."
          />
        </div>
        <select [(ngModel)]="filtroRol" (ngModelChange)="cargarUsuarios()" class="filter-select">
          <option value="">Todos los roles</option>
          @for (r of roles(); track r.rol) {
            <option [value]="r.rol">{{ r.nombre }}</option>
          }
        </select>
        <select [(ngModel)]="filtroEstado" (ngModelChange)="cargarUsuarios()" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="true">Solo Activos</option>
          <option value="false">Solo Inactivos</option>
        </select>
      </section>

      <!-- Tabla -->
      <section class="table-card">
        @if (cargando()) {
          <div class="loading-box">Cargando directorio de usuarios...</div>
        } @else if (usuarios().length === 0) {
          <div class="empty-box">No se encontraron usuarios con los criterios aplicados.</div>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario / Funcionario</th>
                  <th>CI / Cargo</th>
                  <th>Unidad (Organigrama)</th>
                  <th>Rol & Jerarquía</th>
                  <th>Módulos Habilitados</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of usuarios(); track u.id) {
                  <tr [class.row-inactive]="!u.activo">
                    <td>
                      <div class="user-cell">
                        <div class="avatar">{{ (u.nombres[0] || 'U') + (u.apellidos[0] || '') }}</div>
                        <div>
                          <strong>{{ u.nombres }} {{ u.apellidos }}</strong>
                          <small>&#64;{{ u.username }} {{ u.email ? '· ' + u.email : '' }}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="cell-stack">
                        <span class="mono">CI: {{ u.ci }}</span>
                        <small>{{ u.cargo || 'Sin cargo' }}</small>
                      </div>
                    </td>
                    <td>
                      @if (u.unidad) {
                        <div class="cell-stack">
                          <span>{{ u.unidad.nombre }}</span>
                          <small>{{ u.unidad.edificio?.nombre || '' }}</small>
                        </div>
                      } @else {
                        <span class="text-muted">Sin unidad asignada</span>
                      }
                    </td>
                    <td>
                      <div class="cell-stack">
                        <span class="role-badge" [ngClass]="getRolClass(u.rol)">{{ u.rol }}</span>
                        <small>{{ u.jerarquia || 'OPERADOR' }} {{ u.esJefe ? '· Jefe/Aprobador' : '' }}</small>
                      </div>
                    </td>
                    <td>
                      <div class="mod-chips">
                        @if (u.accesoActivos) {
                          <span class="mod-chip activos">Activos</span>
                        }
                        @if (u.accesoAlmacenes) {
                          <span class="mod-chip almacenes">Almacenes</span>
                        }
                        @if (!u.accesoActivos && !u.accesoAlmacenes) {
                          <span class="mod-chip portal">Solo Portal</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [class.active]="u.activo">
                        {{ u.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <div class="action-group">
                        <button type="button" class="icon-btn" title="Editar usuario y roles" (click)="abrirModalEditar(u)">
                          <span class="material-icons">edit</span>
                        </button>
                        <button type="button" class="icon-btn" title="Restablecer contraseña" (click)="abrirModalPassword(u)">
                          <span class="material-icons">key</span>
                        </button>
                        <button
                          type="button"
                          class="icon-btn"
                          [title]="u.activo ? 'Desactivar acceso' : 'Reactivar acceso'"
                          (click)="toggleEstado(u)"
                        >
                          <span class="material-icons">{{ u.activo ? 'block' : 'check_circle' }}</span>
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

      <!-- Modal Crear / Editar Usuario -->
      @if (mostrarModal()) {
        <div class="modal-backdrop" (click)="cerrarModal()">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <h2>{{ editandoId() ? 'Editar Usuario y Roles' : 'Registrar Nuevo Usuario' }}</h2>
              <button type="button" class="icon-btn" (click)="cerrarModal()">
                <span class="material-icons">close</span>
              </button>
            </header>

            <div class="modal-body">
              <div class="form-grid">
                <div class="field">
                  <label>Cédula de Identidad (CI) *</label>
                  <input type="text" [(ngModel)]="form.ci" placeholder="Ej: 8392012" />
                </div>
                <div class="field">
                  <label>Nombre de Usuario (Login) *</label>
                  <input type="text" [(ngModel)]="form.username" placeholder="Ej: mrodriguez" />
                </div>
                <div class="field">
                  <label>Nombres *</label>
                  <input type="text" [(ngModel)]="form.nombres" placeholder="Ej: María Elena" />
                </div>
                <div class="field">
                  <label>Apellidos *</label>
                  <input type="text" [(ngModel)]="form.apellidos" placeholder="Ej: Quispe Condori" />
                </div>
                <div class="field">
                  <label>Cargo Institucional</label>
                  <input type="text" [(ngModel)]="form.cargo" placeholder="Ej: Auxiliar de Activos / Despacho Vehículos" />
                </div>
                <div class="field">
                  <label>Correo Electrónico</label>
                  <input type="email" [(ngModel)]="form.email" placeholder="usuario@entidad.bo" />
                </div>
                <div class="field">
                  <label>Teléfono</label>
                  <input type="text" [(ngModel)]="form.telefono" placeholder="Ej: 71234567" />
                </div>
                @if (!editandoId()) {
                  <div class="field">
                    <label>Contraseña Inicial *</label>
                    <input type="password" [(ngModel)]="form.password" placeholder="Mínimo 6 caracteres" />
                  </div>
                }

                <div class="field full">
                  <label>Unidad del Organigrama</label>
                  <select [(ngModel)]="form.unidadId">
                    <option value="">-- Sin unidad asignada --</option>
                    @for (un of unidades(); track un.id) {
                      <option [value]="un.id">
                        [{{ un.codigo }}] {{ un.nombre }} {{ un.sigla ? '(' + un.sigla + ')' : '' }} — {{ un.edificio?.nombre || '' }}
                      </option>
                    }
                  </select>
                </div>

                <div class="field full">
                  <label>Rol Principal en el Sistema *</label>
                  <select [(ngModel)]="form.rol" (ngModelChange)="onRolChange($event)">
                    @for (r of roles(); track r.rol) {
                      <option [value]="r.rol">{{ r.nombre }} ({{ r.rol }})</option>
                    }
                  </select>
                  <small class="hint">{{ getDescripcionRol(form.rol) }}</small>
                </div>

                <div class="field">
                  <label>Nivel Jerárquico</label>
                  <select [(ngModel)]="form.jerarquia">
                    <option value="OPERADOR">Operador / Funcionario</option>
                    <option value="TECNICO">Técnico / Auxiliar</option>
                    <option value="JEFE">Jefe de Unidad / Responsable</option>
                    <option value="MAE">MAE / Gerencia</option>
                  </select>
                </div>

                <div class="field toggles-box">
                  <label>Accesos y Permisos Granulares</label>
                  <label class="check-row">
                    <input type="checkbox" [(ngModel)]="form.accesoActivos" />
                    <span>Habilitar Módulo de Activos Fijos</span>
                  </label>
                  <label class="check-row">
                    <input type="checkbox" [(ngModel)]="form.accesoAlmacenes" />
                    <span>Habilitar Módulo de Almacenes</span>
                  </label>
                  <label class="check-row">
                    <input type="checkbox" [(ngModel)]="form.esJefe" />
                    <span>Es Jefe de Unidad / Aprobador</span>
                  </label>
                </div>
              </div>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
              <button type="button" class="btn-primary" [disabled]="guardando()" (click)="guardarUsuario()">
                {{ guardando() ? 'Guardando...' : (editandoId() ? 'Guardar Cambios' : 'Crear Usuario') }}
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- Modal Reset Password -->
      @if (usuarioPassword(); as up) {
        <div class="modal-backdrop" (click)="usuarioPassword.set(null)">
          <div class="modal-panel small" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <h2>Restablecer Contraseña</h2>
              <button type="button" class="icon-btn" (click)="usuarioPassword.set(null)">
                <span class="material-icons">close</span>
              </button>
            </header>
            <div class="modal-body">
              <p class="modal-desc">Usuario: <strong>{{ up.nombres }} {{ up.apellidos }}</strong> (&#64;{{ up.username }})</p>
              <div class="field">
                <label>Nueva Contraseña *</label>
                <input type="password" [(ngModel)]="nuevaPassword" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn-secondary" (click)="usuarioPassword.set(null)">Cancelar</button>
              <button type="button" class="btn-primary" (click)="confirmarResetPassword()">Actualizar Clave</button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: #0284c7; display: block; margin-bottom: 0.25rem; }
    .page-header h1 { margin: 0; font-size: 1.65rem; color: #0f172a; }
    .page-header p { margin: 0.3rem 0 0; color: #475569; font-size: 0.92rem; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.45rem; background: #0f172a; color: #fff; border: none; padding: 0.65rem 1.15rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { background: #1e293b; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 0.6rem 1.1rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-card.success { border-left: 4px solid #10b981; }
    .kpi-card.muted { border-left: 4px solid #94a3b8; }
    .kpi-card.info { border-left: 4px solid #0284c7; }
    .kpi-label { font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .kpi-value { font-size: 1.6rem; color: #0f172a; }
    .filters-bar { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 0.5rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.5rem 0.85rem; }
    .search-box input { border: none; outline: none; width: 100%; font-size: 0.92rem; }
    .filter-select { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.55rem 0.85rem; font-size: 0.9rem; }
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th { text-align: left; padding: 0.85rem 1rem; background: #f8fafc; color: #475569; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .row-inactive { opacity: 0.6; background: #fafafa; }
    .user-cell { display: flex; align-items: center; gap: 0.7rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #0284c7; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem; flex-shrink: 0; text-transform: uppercase; }
    .user-cell small, .cell-stack small { display: block; color: #64748b; font-size: 0.78rem; }
    .mono { font-family: monospace; font-weight: 600; color: #1e293b; }
    .role-badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700; background: #e2e8f0; color: #334155; }
    .role-badge.super { background: #fef3c7; color: #92400e; }
    .role-badge.activos { background: #dbeafe; color: #1d4ed8; }
    .role-badge.almacenes { background: #fce7f3; color: #be185d; }
    .role-badge.general { background: #ede9fe; color: #6d28d9; }
    .mod-chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .mod-chip { padding: 0.18rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
    .mod-chip.activos { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .mod-chip.almacenes { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
    .mod-chip.portal { background: #f1f5f9; color: #475569; }
    .status-pill { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: #fee2e2; color: #991b1b; }
    .status-pill.active { background: #dcfce7; color: #166534; }
    .action-group { display: inline-flex; gap: 0.35rem; }
    .icon-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.35rem; cursor: pointer; color: #334155; display: inline-flex; align-items: center; }
    .icon-btn:hover { background: #e2e8f0; color: #0f172a; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; font-style: italic; }
    .loading-box, .empty-box { padding: 2.5rem; text-align: center; color: #64748b; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 1rem; }
    .modal-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 720px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }
    .modal-panel.small { max-width: 440px; }
    .modal-header { padding: 1rem 1.4rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { margin: 0; font-size: 1.15rem; }
    .modal-body { padding: 1.25rem 1.4rem; overflow-y: auto; }
    .modal-footer { padding: 0.9rem 1.4rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.6rem; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.9rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field.full { grid-column: 1 / -1; }
    .field label { font-size: 0.8rem; font-weight: 600; color: #334155; }
    .field input, .field select { padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; }
    .hint { color: #64748b; font-size: 0.78rem; }
    .toggles-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.7rem 0.9rem; }
    .check-row { display: flex; align-items: center; gap: 0.5rem; font-weight: 500 !important; cursor: pointer; margin-top: 0.35rem; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `],
})
export class UsuariosComponent implements OnInit {
  usuarios = signal<UsuarioItem[]>([]);
  roles = signal<RolCatalogo[]>([]);
  unidades = signal<any[]>([]);
  resumen = signal<UsuariosResumen | null>(null);
  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);

  filtroTexto = '';
  filtroRol = '';
  filtroEstado = '';

  mostrarModal = signal<boolean>(false);
  editandoId = signal<string | null>(null);
  usuarioPassword = signal<UsuarioItem | null>(null);
  nuevaPassword = '';

  form: any = this.getFormInicial();

  constructor(
    private usuariosService: UsuariosService,
    private entidadesService: EntidadesService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarUsuarios();
  }

  private getFormInicial() {
    return {
      ci: '',
      username: '',
      password: '',
      nombres: '',
      apellidos: '',
      cargo: '',
      email: '',
      telefono: '',
      rol: 'FUNCIONARIO',
      accesoActivos: false,
      accesoAlmacenes: false,
      unidadId: '',
      jerarquia: 'OPERADOR',
      esJefe: false,
    };
  }

  cargarCatalogos(): void {
    this.usuariosService.getRolesDisponibles().subscribe({
      next: (r) => this.roles.set(r),
    });
    this.usuariosService.obtenerResumen().subscribe({
      next: (res) => this.resumen.set(res),
    });
    this.entidadesService.listarUnidades().subscribe({
      next: (u) => this.unidades.set(u),
    });
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.usuariosService
      .listar({
        search: this.filtroTexto || undefined,
        rol: this.filtroRol || undefined,
        activo: this.filtroEstado || undefined,
      })
      .subscribe({
        next: (data) => {
          this.usuarios.set(data);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error cargando usuarios', 'Cerrar', { duration: 3000 });
        },
      });
  }

  abrirModalCrear(): void {
    this.editandoId.set(null);
    this.form = this.getFormInicial();
    this.mostrarModal.set(true);
  }

  abrirModalEditar(u: UsuarioItem): void {
    this.editandoId.set(u.id);
    this.form = {
      ci: u.ci,
      username: u.username,
      password: '',
      nombres: u.nombres,
      apellidos: u.apellidos,
      cargo: u.cargo || '',
      email: u.email || '',
      telefono: u.telefono || '',
      rol: u.rol,
      accesoActivos: u.accesoActivos,
      accesoAlmacenes: u.accesoAlmacenes,
      unidadId: u.unidadId || '',
      jerarquia: u.jerarquia || 'OPERADOR',
      esJefe: u.esJefe,
    };
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  onRolChange(rol: string): void {
    const info = this.roles().find((r) => r.rol === rol);
    if (info) {
      this.form.accesoActivos = info.accesoActivos;
      this.form.accesoAlmacenes = info.accesoAlmacenes;
    }
  }

  getDescripcionRol(rol: string): string {
    return this.roles().find((r) => r.rol === rol)?.descripcion || '';
  }

  getRolClass(rol: string): string {
    if (rol === 'SUPER_ADMIN') return 'super';
    if (rol === 'ADMIN_GENERAL') return 'general';
    if (rol.includes('ACTIVOS')) return 'activos';
    if (rol.includes('ALMACENES')) return 'almacenes';
    return '';
  }

  guardarUsuario(): void {
    if (!this.form.ci || !this.form.username || !this.form.nombres || !this.form.apellidos) {
      this.snackBar.open('Completa CI, usuario, nombres y apellidos.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.guardando.set(true);
    const payload = {
      ...this.form,
      unidadId: this.form.unidadId || null,
    };

    const obs = this.editandoId()
      ? this.usuariosService.actualizar(this.editandoId()!, payload)
      : this.usuariosService.crear(payload);

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarUsuarios();
        this.cargarCatalogos();
        this.snackBar.open(
          this.editandoId() ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
          'OK',
          { duration: 3000 },
        );
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err?.error?.message || 'No se pudo guardar el usuario', 'Cerrar', { duration: 4000 });
      },
    });
  }

  toggleEstado(u: UsuarioItem): void {
    this.usuariosService.cambiarEstado(u.id, !u.activo).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.cargarCatalogos();
        this.snackBar.open(`Usuario ${!u.activo ? 'activado' : 'desactivado'}`, 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error al cambiar estado', 'Cerrar', { duration: 3000 });
      },
    });
  }

  abrirModalPassword(u: UsuarioItem): void {
    this.nuevaPassword = '';
    this.usuarioPassword.set(u);
  }

  confirmarResetPassword(): void {
    const u = this.usuarioPassword();
    if (!u || this.nuevaPassword.length < 6) {
      this.snackBar.open('Ingresa una contraseña de al menos 6 caracteres.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.usuariosService.resetearPassword(u.id, this.nuevaPassword).subscribe({
      next: () => {
        this.usuarioPassword.set(null);
        this.snackBar.open('Contraseña restablecida correctamente', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error al restablecer clave', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
