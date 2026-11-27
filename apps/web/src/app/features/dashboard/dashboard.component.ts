import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, ResumenDashboard } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="header-title">
          <div class="welcome-tag">
            <span>Bienvenido, </span>
            <strong>{{ authService.currentUser()?.nombreCompleto || 'Usuario' }}</strong>
            <span class="user-role-chip" [ngClass]="getRoleClass()">
              {{ getRoleTitle() }}
            </span>
          </div>
          <h1>
            @if (esSoloActivos()) {
              Tablero de Control · Gestión de Activos Fijos
            } @else if (esSoloAlmacenes()) {
              Tablero de Control · Gestión de Almacenes & Suministros
            } @else if (esFuncionario()) {
              Portal del Funcionario · Mis Bienes & Requerimientos
            } @else {
              Panel de Control General · NSIAF v2
            }
          </h1>
          <p>{{ authService.currentUser()?.entidad || 'Cooperativa de Telecomunicaciones / Entidad Institucional' }}</p>
        </div>

        <div class="badges">
          <mat-chip-set>
            <mat-chip highlighted color="primary">PostgreSQL 16</mat-chip>
            <mat-chip highlighted color="accent">NestJS API</mat-chip>
            <mat-chip highlighted>Angular 19</mat-chip>
            @if (authService.currentUser()?.rol === 'SUPER_ADMIN' || authService.currentUser()?.rol === 'ADMIN_GENERAL') {
              <a mat-flat-button color="primary" routerLink="/configuracion" class="btn-quick-config">
                <mat-icon>settings</mat-icon>
                <span>Configuración Sistema</span>
              </a>
            }
          </mat-chip-set>
        </div>
      </header>

      @if (resumen(); as r) {
        <!-- TABS O SELECTOR PARA SUPER ADMIN / ADMIN GENERAL -->
        @if (r.activos && r.almacenes) {
          <div class="view-switcher">
            <button
              type="button"
              class="switch-btn"
              [class.active]="activeTab === 'TODO'"
              (click)="activeTab = 'TODO'"
            >
              <mat-icon>analytics</mat-icon>
              <span>Vista Ejecutiva Consolidada</span>
            </button>
            <button
              type="button"
              class="switch-btn"
              [class.active]="activeTab === 'ACTIVOS'"
              (click)="activeTab = 'ACTIVOS'"
            >
              <mat-icon>inventory_2</mat-icon>
              <span>Módulo Activos Fijos</span>
            </button>
            <button
              type="button"
              class="switch-btn"
              [class.active]="activeTab === 'ALMACENES'"
              (click)="activeTab = 'ALMACENES'"
            >
              <mat-icon>warehouse</mat-icon>
              <span>Módulo Almacenes</span>
            </button>
          </div>
        }

        <!-- 1. SECCIÓN MÉTRICAS DE ACTIVOS FIJOS (Solo si tiene acceso a Activos) -->
        @if (r.activos && (activeTab === 'TODO' || activeTab === 'ACTIVOS')) {
          <section class="module-section">
            <div class="section-title">
              <span class="material-icons sec-icon">inventory_2</span>
              <h2>Indicadores de Activos Fijos & Bienes Institucionales</h2>
            </div>

            <div class="metrics-row">
              <div class="metric-box">
                <span class="metric-title">Activos Registrados</span>
                <span class="metric-num">{{ r.activos.totalActivos }}</span>
                <span class="metric-sub">{{ r.activos.activosVigentes }} vigentes · {{ r.activos.activosDadosBaja }} dados de baja</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Valor Contable Total</span>
                <span class="metric-num text-primary">Bs. {{ r.activos.valorTotal | number:'1.2-2' }}</span>
                <span class="metric-sub">Costo histórico inicial activo</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Custodia vs Almacén</span>
                <span class="metric-num">{{ r.activos.activosAsignados }} / {{ r.activos.activosLibres }}</span>
                <span class="metric-sub">Asignados / Libres en bodega</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Pólizas por Vencer</span>
                <span class="metric-num" [class.text-warn]="r.activos.polizasPorVencer > 0">
                  {{ r.activos.polizasPorVencer }}
                </span>
                <span class="metric-sub">Alertas en próximos 30 días</span>
              </div>
            </div>

            <!-- Gráfico de Estado Físico y Rubros -->
            <div class="activos-breakdown-grid">
              <!-- Estado Físico -->
              <div class="card-chart">
                <h3>Estado Físico de Bienes</h3>
                <div class="status-bar-group">
                  <div class="status-bar-item">
                    <div class="bar-label">
                      <span class="dot bueno"></span>
                      <span>Bueno (Operativo)</span>
                      <strong>{{ r.activos.estadoBueno }}</strong>
                    </div>
                    <mat-progress-bar mode="determinate" color="primary" [value]="calcPorcentaje(r.activos.estadoBueno, r.activos.activosVigentes)"></mat-progress-bar>
                  </div>
                  <div class="status-bar-item">
                    <div class="bar-label">
                      <span class="dot regular"></span>
                      <span>Regular (Requiere mantenimiento)</span>
                      <strong>{{ r.activos.estadoRegular }}</strong>
                    </div>
                    <mat-progress-bar mode="determinate" color="accent" [value]="calcPorcentaje(r.activos.estadoRegular, r.activos.activosVigentes)"></mat-progress-bar>
                  </div>
                  <div class="status-bar-item">
                    <div class="bar-label">
                      <span class="dot malo"></span>
                      <span>Malo / Para disposición</span>
                      <strong>{{ r.activos.estadoMalo }}</strong>
                    </div>
                    <mat-progress-bar mode="determinate" color="warn" [value]="calcPorcentaje(r.activos.estadoMalo, r.activos.activosVigentes)"></mat-progress-bar>
                  </div>
                </div>
              </div>

              <!-- Rubros Contables -->
              <div class="card-chart">
                <h3>Distribución por Rubro Contable</h3>
                <div class="rubros-list">
                  @for (rubro of r.activos.porRubro; track rubro.id) {
                    <div class="rubro-item">
                      <div class="rubro-info">
                        <strong>{{ rubro.nombre }}</strong>
                        <small>Código {{ rubro.codigo }} · {{ rubro.cantidad }} activos</small>
                      </div>
                      <span class="rubro-valor">Bs. {{ rubro.valorTotal | number:'1.2-2' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>
        }

        <!-- 2. SECCIÓN MÉTRICAS DE ALMACENES (Solo si tiene acceso a Almacenes) -->
        @if (r.almacenes && (activeTab === 'TODO' || activeTab === 'ALMACENES')) {
          <section class="module-section">
            <div class="section-title">
              <span class="material-icons sec-icon warehouse">warehouse</span>
              <h2>Indicadores de Almacén, Suministros & Kardex Físico-Valorado</h2>
            </div>

            <div class="metrics-row">
              <div class="metric-box">
                <span class="metric-title">Suministros Registrados</span>
                <span class="metric-num">{{ r.almacenes.totalSuministros }}</span>
                <span class="metric-sub">Ítems e insumos en catálogo</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Valor en Bodega</span>
                <span class="metric-num text-success">Bs. {{ r.almacenes.valorTotalBodega | number:'1.2-2' }}</span>
                <span class="metric-sub">Inventario valorado actual</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Solicitudes Pendientes</span>
                <span class="metric-num text-warn">{{ r.almacenes.solicitudesPendientes }}</span>
                <span class="metric-sub">Por atender y despachar</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Bajo Stock Mínimo</span>
                <span class="metric-num" [class.text-danger]="r.almacenes.totalBajoStock > 0">
                  {{ r.almacenes.totalBajoStock }}
                </span>
                <span class="metric-sub">Alerta de desabastecimiento</span>
              </div>
            </div>

            <!-- Kardex Reciente y Alertas Stock -->
            <div class="activos-breakdown-grid">
              <!-- Alertas de Stock Mínimo -->
              <div class="card-chart">
                <div class="card-head-alert">
                  <h3>Alertas de Desabastecimiento</h3>
                  @if (r.almacenes.totalBajoStock > 0) {
                    <span class="badge-alert">¡Acción requerida!</span>
                  }
                </div>

                @if (r.almacenes.articulosBajoStock.length === 0) {
                  <p class="empty-hint">Todos los insumos se encuentran con stock por encima del margen mínimo de seguridad.</p>
                } @else {
                  <div class="stock-alerts-list">
                    @for (item of r.almacenes.articulosBajoStock; track item.id) {
                      <div class="stock-alert-item">
                        <div class="stock-alert-info">
                          <strong>{{ item.descripcion }}</strong>
                          <small>Código {{ item.codigo }} · {{ item.unidadMedida }}</small>
                        </div>
                        <div class="stock-alert-qty">
                          <span class="current-stock">{{ item.stockActual }}</span>
                          <small>Mín: {{ item.stockMinimo }}</small>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Últimos Movimientos Kardex -->
              <div class="card-chart">
                <h3>Últimos Movimientos de Kardex</h3>
                <div class="rubros-list">
                  @for (mov of r.almacenes.ultimosMovimientos; track mov.id) {
                    <div class="rubro-item">
                      <div class="rubro-info">
                        <strong>{{ mov.subarticulo || 'Suministro' }}</strong>
                        <small>{{ mov.fecha | date:'dd/MM/yyyy HH:mm' }} · {{ mov.tipo }}</small>
                      </div>
                      <div class="kardex-qty">
                        <span class="qty-badge" [ngClass]="mov.tipo?.toLowerCase()">
                          {{ mov.cantidad }} {{ mov.unidadMedida }}
                        </span>
                        <small>Saldo: {{ mov.saldoCantidad }}</small>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>
        }

        <!-- 3. CONSOLA DE ADMINISTRACIÓN Y GOBERNANZA (Solo SUPER_ADMIN / ADMIN_GENERAL) -->
        @if (esSuperAdmin()) {
          <section class="module-section">
            <div class="section-title">
              <span class="material-icons sec-icon">admin_panel_settings</span>
              <h2>Consola de Administración Central & Gobernanza</h2>
            </div>
            <div class="metrics-row">
              <a routerLink="/usuarios" class="metric-box" style="text-decoration:none;cursor:pointer;">
                <span class="metric-title">Usuarios & Roles RBAC</span>
                <span class="metric-num" style="font-size:1.15rem;color:#0284c7;">Gestionar Personal →</span>
                <span class="metric-sub">Crear usuarios, asignar responsables y auxiliares</span>
              </a>
              <a routerLink="/entidades" class="metric-box" style="text-decoration:none;cursor:pointer;">
                <span class="metric-title">Entidades & Organigrama</span>
                <span class="metric-num" style="font-size:1.15rem;color:#0f766e;">Estructura & Sync →</span>
                <span class="metric-sub">Crear organigrama propio o absorber desde Plantillas</span>
              </a>
              <a routerLink="/proveedores" class="metric-box" style="text-decoration:none;cursor:pointer;">
                <span class="metric-title">Proveedores & Contactos</span>
                <span class="metric-num" style="font-size:1.15rem;color:#b45309;">Directorio NIT →</span>
                <span class="metric-sub">Empresas proveedoras de bienes y suministros</span>
              </a>
              <a routerLink="/configuracion" class="metric-box" style="text-decoration:none;cursor:pointer;">
                <span class="metric-title">Configuración & MEFP 2027</span>
                <span class="metric-num" style="font-size:1.15rem;color:#4f46e5;">Parámetros & SSO →</span>
                <span class="metric-sub">Modalidad, Authentik y Clasificadores 2027</span>
              </a>
              <a routerLink="/auditoria" class="metric-box" style="text-decoration:none;cursor:pointer;">
                <span class="metric-title">Histórico Forense</span>
                <span class="metric-num" style="font-size:1.15rem;color:#7c3aed;">Ver Auditoría →</span>
                <span class="metric-sub">Registro de altas, bajas y cambios de roles</span>
              </a>
            </div>
          </section>
        }

        <!-- 4. VISTA PARA FUNCIONARIOS (Portal Solicitante rápido) -->
        @if (esFuncionario()) {
          <section class="module-section">
            <div class="section-title">
              <span class="material-icons sec-icon">account_circle</span>
              <h2>Mi Estado de Bienes & Requerimientos</h2>
            </div>

            <div class="metrics-row">
              <div class="metric-box">
                <span class="metric-title">Bienes en mi Custodia</span>
                <span class="metric-num">{{ r.funcionario?.misActivosEnCustodia || 0 }}</span>
                <span class="metric-sub">Equipos y activos asignados</span>
              </div>
              <div class="metric-box">
                <span class="metric-title">Mis Solicitudes en Trámite</span>
                <span class="metric-num text-primary">{{ r.funcionario?.solicitudesPendientesTotal || 0 }}</span>
                <span class="metric-sub">
                  {{ r.funcionario?.solicitudesSuministrosPendientes || 0 }} insumos · {{ r.funcionario?.solicitudesActivosPendientes || 0 }} activos
                </span>
              </div>
            </div>
          </section>
        }

        <!-- 4. ENLACES DIRECTOS SEGÚN ROL -->
        <div class="grid">
          @if (r.activos) {
            <mat-card class="card">
              <mat-card-header>
                <mat-icon mat-card-avatar color="primary">inventory_2</mat-icon>
                <mat-card-title>Inventario de Activos Fijos</mat-card-title>
                <mat-card-subtitle>Gestión, actas, bajas y QR</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Incorporación de bienes, asignación de responsables, generación de actas de entrega/devolución y depreciación por UFV.</p>
              </mat-card-content>
              <mat-card-actions>
                <a mat-raised-button color="primary" routerLink="/activos">
                  <mat-icon>launch</mat-icon>
                  <span>Ir al Inventario de Activos</span>
                </a>
              </mat-card-actions>
            </mat-card>
          }

          @if (r.almacenes) {
            <mat-card class="card">
              <mat-card-header>
                <mat-icon mat-card-avatar color="accent">warehouse</mat-icon>
                <mat-card-title>Almacenes y Suministros</mat-card-title>
                <mat-card-subtitle>Kardex y despacho de materiales</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Control de notas de ingreso por compra/donación/reingreso, atención a solicitudes de personal y traspasos.</p>
              </mat-card-content>
              <mat-card-actions>
                <a mat-raised-button color="primary" routerLink="/almacenes">
                  <mat-icon>launch</mat-icon>
                  <span>Ir al Módulo de Almacenes</span>
                </a>
              </mat-card-actions>
            </mat-card>
          }

          <!-- Portal del Solicitante (Accesible a todos, ideal para funcionarios) -->
          <mat-card class="card">
            <mat-card-header>
              <mat-icon mat-card-avatar>assignment_ind</mat-icon>
              <mat-card-title>Portal del Solicitante</mat-card-title>
              <mat-card-subtitle>Autoservicio de suministros y custodia</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Revisa tus bienes asignados, solicita insumos de oficina (SMS) o pide la asignación de un nuevo activo fijo.</p>
            </mat-card-content>
            <mat-card-actions>
              <a mat-stroked-button color="primary" routerLink="/portal-solicitante">
                <mat-icon>open_in_new</mat-icon>
                <span>Acceder a Mi Portal</span>
              </a>
            </mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    .welcome-tag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: #64748b;
      margin-bottom: 0.35rem;
    }
    .user-role-chip {
      padding: 0.15rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .user-role-chip.admin-activos {
      background: #e0f2fe;
      color: #0369a1;
    }
    .user-role-chip.admin-almacenes {
      background: #fef3c7;
      color: #92400e;
    }
    .user-role-chip.super-admin {
      background: #f3e8ff;
      color: #6b21a8;
    }
    .user-role-chip.funcionario {
      background: #f1f5f9;
      color: #334155;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1.5rem;
    }
    .header-title h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .header-title p {
      color: #64748b;
      margin-top: 0.25rem;
      font-size: 0.9rem;
    }
    .btn-quick-config {
      margin-left: 0.75rem;
      border-radius: 8px;
      font-size: 0.8rem;
    }

    /* Switcher Tabs */
    .view-switcher {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: #e2e8f0;
      padding: 0.35rem;
      border-radius: 10px;
      width: fit-content;
    }
    .switch-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border: none;
      background: transparent;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .switch-btn mat-icon {
      font-size: 1.15rem;
    }
    .switch-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Module Section */
    .module-section {
      margin-bottom: 2.5rem;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1rem;
    }
    .sec-icon {
      font-size: 1.5rem;
      color: #0284c7;
    }
    .sec-icon.warehouse {
      color: #d97706;
    }
    .section-title h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .metric-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .metric-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .metric-num {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0.25rem 0;
    }
    .text-primary { color: #0284c7; }
    .text-success { color: #16a34a; }
    .text-warn { color: #d97706; }
    .text-danger { color: #dc2626; }

    .metric-sub {
      font-size: 0.75rem;
      color: #475569;
      font-weight: 500;
    }

    /* Breakdown Grid */
    .activos-breakdown-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.5rem;
    }
    .card-chart {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .card-chart h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1.25rem 0;
    }
    .card-head-alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .card-head-alert h3 { margin: 0; }
    .badge-alert {
      background: #fee2e2;
      color: #b91c1c;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }

    .status-bar-group {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .status-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .bar-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.84rem;
      color: #334155;
    }
    .bar-label strong {
      color: #0f172a;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.4rem;
    }
    .dot.bueno { background: #16a34a; }
    .dot.regular { background: #eab308; }
    .dot.malo { background: #dc2626; }

    .rubros-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .rubro-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .rubro-info strong {
      display: block;
      font-size: 0.88rem;
      color: #0f172a;
    }
    .rubro-info small {
      font-size: 0.75rem;
      color: #64748b;
    }
    .rubro-valor {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0f172a;
    }

    .stock-alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .stock-alert-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
    }
    .stock-alert-info strong {
      display: block;
      font-size: 0.86rem;
      color: #9f1239;
    }
    .stock-alert-info small {
      font-size: 0.75rem;
      color: #be123c;
    }
    .stock-alert-qty {
      text-align: right;
    }
    .current-stock {
      font-size: 1.1rem;
      font-weight: 800;
      color: #9f1239;
      display: block;
    }
    .stock-alert-qty small {
      font-size: 0.72rem;
      color: #881337;
    }

    .kardex-qty {
      text-align: right;
    }
    .qty-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      display: inline-block;
    }
    .qty-badge.entrada, .qty-badge.traspaso_entrada {
      background: #dcfce7;
      color: #166534;
    }
    .qty-badge.salida, .qty-badge.traspaso_salida {
      background: #fee2e2;
      color: #991b1b;
    }
    .kardex-qty small {
      display: block;
      font-size: 0.72rem;
      color: #64748b;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .card {
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06);
    }
    mat-card-content {
      margin-top: 1rem;
      color: #334155;
      line-height: 1.5;
    }
    mat-card-actions {
      padding: 1rem !important;
      display: flex;
      gap: 0.5rem;
    }

    .empty-hint {
      color: #64748b;
      font-size: 0.88rem;
      font-style: italic;
      margin: 0;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem 0.65rem;
      }
      .header {
        flex-direction: column;
        align-items: stretch;
      }
      .view-switcher {
        width: 100%;
        overflow-x: auto;
      }
      .activos-breakdown-grid {
        grid-template-columns: 1fr;
      }
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  resumen = signal<ResumenDashboard | null>(null);
  activeTab: 'TODO' | 'ACTIVOS' | 'ALMACENES' = 'TODO';

  constructor(
    public authService: AuthService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.dashboardService.getResumen().subscribe({
      next: (data) => {
        this.resumen.set(data);
        if (data.activos && !data.almacenes) {
          this.activeTab = 'ACTIVOS';
        } else if (!data.activos && data.almacenes) {
          this.activeTab = 'ALMACENES';
        }
      },
      error: (err) => console.error('Error al cargar resumen del dashboard', err),
    });
  }

  esSoloActivos(): boolean {
    const r = this.resumen();
    return !!(r?.activos && !r?.almacenes);
  }

  esSoloAlmacenes(): boolean {
    const r = this.resumen();
    return !!(!r?.activos && r?.almacenes);
  }

  esFuncionario(): boolean {
    const r = this.resumen();
    return !r?.activos && !r?.almacenes;
  }

  esSuperAdmin(): boolean {
    const user = this.authService.currentUser();
    return !!(user && (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL'));
  }

  getRoleClass(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    if (user.rol === 'ADMIN_ACTIVOS' || user.rol === 'AUXILIAR_ACTIVOS') return 'admin-activos';
    if (user.rol === 'ADMIN_ALMACENES' || user.rol === 'AUXILIAR_ALMACENES') return 'admin-almacenes';
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') return 'super-admin';
    return 'funcionario';
  }

  getRoleTitle(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Usuario';
    if (user.rol === 'ADMIN_ACTIVOS') return 'Admin Activos Fijos';
    if (user.rol === 'AUXILIAR_ACTIVOS') return 'Auxiliar Activos Fijos';
    if (user.rol === 'ADMIN_ALMACENES') return 'Encargado Almacenes';
    if (user.rol === 'AUXILIAR_ALMACENES') return 'Auxiliar Almacenes';
    if (user.rol === 'SUPER_ADMIN') return 'Super Administrador';
    if (user.rol === 'ADMIN_GENERAL') return 'Administrador General';
    return 'Funcionario Solicitante';
  }

  calcPorcentaje(cant: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((cant / total) * 100);
  }
}
