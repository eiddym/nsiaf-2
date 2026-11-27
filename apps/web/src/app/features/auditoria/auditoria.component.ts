import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService, AuditoriaRegistro } from '../../core/services/auditoria.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div>
          <span class="eyebrow">TRAZABILIDAD FORENSE & CONTROL INTERNO</span>
          <h1>Histórico de Auditoría del Sistema</h1>
          <p>Registro cronológico de altas, modificaciones, bajas y cambios de permisos ejecutados en NSIAF v2.</p>
        </div>
        <button type="button" class="btn-refresh" (click)="cargar()">
          <span class="material-icons">refresh</span>
          <span>Actualizar</span>
        </button>
      </header>

      <section class="filters-bar">
        <select [(ngModel)]="filtroTabla" (ngModelChange)="cargar()" class="filter-select">
          <option value="">Todas las tablas</option>
          @for (t of tablas(); track t.tabla) {
            <option [value]="t.tabla">{{ t.tabla }} ({{ t.cantidad }})</option>
          }
        </select>
        <select [(ngModel)]="filtroAccion" (ngModelChange)="cargar()" class="filter-select">
          <option value="">Todas las acciones</option>
          <option value="CREATE">CREATE (Altas)</option>
          <option value="UPDATE">UPDATE (Modificaciones)</option>
          <option value="DELETE">DELETE (Eliminaciones)</option>
        </select>
        <input
          type="text"
          class="filter-input"
          [(ngModel)]="filtroUsuario"
          (ngModelChange)="cargar()"
          placeholder="Filtrar por usuario..."
        />
      </section>

      <section class="table-card">
        @if (cargando()) {
          <div class="empty-box">Cargando registros de auditoría...</div>
        } @else if (registros().length === 0) {
          <div class="empty-box">No hay eventos registrados aún con los filtros actuales.</div>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Acción</th>
                  <th>Tabla / Entidad</th>
                  <th>Usuario</th>
                  <th>Detalle de Cambio</th>
                </tr>
              </thead>
              <tbody>
                @for (r of registros(); track r.id) {
                  <tr>
                    <td class="mono">{{ r.fecha | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                    <td>
                      <span class="badge" [ngClass]="r.accion.toLowerCase()">{{ r.accion }}</span>
                    </td>
                    <td><strong>{{ r.tabla }}</strong></td>
                    <td>{{ r.usuarioUsername || r.usuarioId || 'Sistema' }}</td>
                    <td>
                      <pre class="json-preview">{{ formatJson(r.datosNuevos || r.datosAnteriores) }}</pre>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
    .eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: #7c3aed; display: block; margin-bottom: 0.25rem; }
    .page-header h1 { margin: 0; font-size: 1.6rem; color: #0f172a; }
    .page-header p { margin: 0.3rem 0 0; color: #475569; font-size: 0.9rem; }
    .btn-refresh { display: inline-flex; align-items: center; gap: 0.4rem; background: #0f172a; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .filters-bar { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filter-select, .filter-input { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.55rem 0.85rem; font-size: 0.9rem; }
    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th { text-align: left; padding: 0.8rem 1rem; background: #f8fafc; color: #475569; font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .mono { font-family: monospace; white-space: nowrap; }
    .badge { padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700; }
    .badge.create { background: #dcfce7; color: #166534; }
    .badge.update { background: #dbeafe; color: #1d4ed8; }
    .badge.delete { background: #fee2e2; color: #991b1b; }
    .json-preview { margin: 0; font-size: 0.75rem; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; max-width: 480px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
    .empty-box { padding: 2.5rem; text-align: center; color: #64748b; }
  `],
})
export class AuditoriaComponent implements OnInit {
  registros = signal<AuditoriaRegistro[]>([]);
  tablas = signal<Array<{ tabla: string; cantidad: number }>>([]);
  cargando = signal<boolean>(true);

  filtroTabla = '';
  filtroAccion = '';
  filtroUsuario = '';

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.auditoriaService
      .listar({
        tabla: this.filtroTabla || undefined,
        accion: this.filtroAccion || undefined,
        usuario: this.filtroUsuario || undefined,
        limit: 150,
      })
      .subscribe({
        next: (res) => {
          this.registros.set(res.registros);
          this.tablas.set(res.tablas);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  formatJson(obj: any): string {
    if (!obj) return '—';
    try {
      const str = JSON.stringify(obj);
      return str.length > 260 ? str.slice(0, 260) + '…' : str;
    } catch {
      return String(obj);
    }
  }
}
