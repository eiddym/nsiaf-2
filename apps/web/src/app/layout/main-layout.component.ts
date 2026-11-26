import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="layout-container">
      <!-- Topbar Desktop & Mobile -->
      <header class="topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="mobile-menu-toggle"
            (click)="toggleMenuMovil()"
            aria-label="Abrir menú de navegación móvil"
          >
            <span class="material-icons" aria-hidden="true">{{ menuMovilAbierto() ? 'close' : 'menu' }}</span>
          </button>

          <a routerLink="/dashboard" class="brand">
            <span class="material-icons brand-icon" aria-hidden="true">account_balance</span>
            <div class="brand-titles">
              <span class="brand-name">NSIAF v2</span>
              <span class="brand-sub">Activos & Almacenes</span>
            </div>
          </a>

          <!-- Desktop Navigation con Segregación Estricta de Módulos -->
          <nav class="nav-links desktop-only" aria-label="Navegación principal">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <span class="material-icons" aria-hidden="true">dashboard</span>
              <span>Tablero</span>
            </a>

            @if (authService.currentUser()?.accesoActivos) {
              <a routerLink="/activos" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">inventory_2</span>
                <span>Activos Fijos</span>
              </a>
            }

            @if (authService.currentUser()?.accesoAlmacenes) {
              <a routerLink="/almacenes" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">warehouse</span>
                <span>Almacenes</span>
              </a>
            }

            <a routerLink="/portal-solicitante" routerLinkActive="active" class="nav-item">
              <span class="material-icons" aria-hidden="true">assignment_ind</span>
              <span>Portal Solicitante</span>
            </a>

            @if (authService.currentUser()?.accesoActivos || authService.currentUser()?.accesoAlmacenes) {
              <a routerLink="/entidades" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">corporate_fare</span>
                <span>Entidades</span>
              </a>
              <a routerLink="/proveedores" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">storefront</span>
                <span>Proveedores</span>
              </a>
            }

            @if (authService.currentUser()?.accesoActivos) {
              <a routerLink="/seguros" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">security</span>
                <span>Seguros</span>
              </a>
              <a routerLink="/gestiones" routerLinkActive="active" class="nav-item">
                <span class="material-icons" aria-hidden="true">event_available</span>
                <span>Cierres & UFV</span>
              </a>
            }

            @if (esSuperAdmin()) {
              <a routerLink="/configuracion" routerLinkActive="active" class="nav-item config-item">
                <span class="material-icons" aria-hidden="true">settings</span>
                <span>Configuración</span>
              </a>
            }
          </nav>
        </div>

        <div class="topbar-right">
          <!-- Scope Badge Dinámico según Rol -->
          <div class="admin-scope-badge desktop-only" [ngClass]="getBadgeClass()">
            <span class="material-icons badge-icon" aria-hidden="true">{{ getBadgeIcon() }}</span>
            <div class="badge-text">
              <span class="badge-title">{{ getBadgeTitle() }}</span>
              <span class="badge-subtitle">{{ getBadgeSubtitle() }}</span>
            </div>
          </div>

          <!-- Escáner Móvil Directo en Header para Acceso Rápido -->
          <a
            routerLink="/verificar/activo"
            class="header-scan-quickbtn mobile-only"
            aria-label="Abrir escáner de activos QR con cámara"
          >
            <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
          </a>

          @if (authService.currentUser(); as user) {
            <div class="user-profile">
              <div class="user-info desktop-only">
                <span class="user-name">{{ user.nombreCompleto || user.nombres + ' ' + user.apellidos }}</span>
                <span class="user-role">{{ user.rol }} · {{ user.cargo || 'Funcionario' }}</span>
              </div>
              <button
                mat-icon-button
                [matMenuTriggerFor]="userMenu"
                class="user-avatar-btn"
                aria-label="Abrir menú de opciones del usuario"
              >
                <div class="avatar-circle" aria-hidden="true">
                  {{ user.nombres?.charAt(0) }}{{ user.apellidos?.charAt(0) }}
                </div>
              </button>

              <mat-menu #userMenu="matMenu">
                <div class="menu-user-header">
                  <strong>{{ user.username }}</strong>
                  <small>{{ user.email || user.ci }}</small>
                  <small class="unit-tag">{{ user.unidad || 'Unidad Institucional' }}</small>
                </div>
                <button mat-menu-item routerLink="/portal-solicitante">
                  <mat-icon>assignment_ind</mat-icon>
                  <span>Portal Solicitante / Mis Bienes</span>
                </button>
                <button mat-menu-item routerLink="/verificar/activo">
                  <mat-icon>qr_code_scanner</mat-icon>
                  <span>Escáner QR Móvil</span>
                </button>
                @if (esSuperAdmin()) {
                  <button mat-menu-item routerLink="/configuracion">
                    <mat-icon>settings</mat-icon>
                    <span>Configuración Sistema</span>
                  </button>
                }
                <button mat-menu-item (click)="logout()">
                  <mat-icon color="warn">logout</mat-icon>
                  <span>Cerrar Sesión</span>
                </button>
              </mat-menu>
            </div>
          }
        </div>
      </header>

      <!-- Drawer Menú Móvil -->
      @if (menuMovilAbierto()) {
        <div class="mobile-drawer-backdrop" (click)="cerrarMenuMovil()">
          <aside class="mobile-drawer" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div class="brand">
                <span class="material-icons brand-icon" aria-hidden="true">account_balance</span>
                <div class="brand-titles">
                  <span class="brand-name">NSIAF v2</span>
                  <span class="brand-sub">Sistema Móvil de Gestión</span>
                </div>
              </div>
              <button type="button" class="drawer-close" (click)="cerrarMenuMovil()" aria-label="Cerrar menú">
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </div>

            @if (authService.currentUser(); as user) {
              <div class="drawer-user-card">
                <div class="avatar-circle large" aria-hidden="true">
                  {{ user.nombres?.charAt(0) }}{{ user.apellidos?.charAt(0) }}
                </div>
                <div class="drawer-user-meta">
                  <strong>{{ user.nombreCompleto || user.nombres + ' ' + user.apellidos }}</strong>
                  <span>{{ user.cargo || 'Funcionario' }}</span>
                  <small>{{ user.rol }} · {{ user.unidad || 'Unidad Institucional' }}</small>
                </div>
              </div>
            }

            <nav class="drawer-nav">
              <a routerLink="/dashboard" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                <span class="material-icons" aria-hidden="true">dashboard</span>
                <span>Tablero de Control</span>
              </a>

              <a routerLink="/portal-solicitante" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                <span class="material-icons" aria-hidden="true">assignment_ind</span>
                <span>Portal Solicitante</span>
              </a>

              <a routerLink="/verificar/activo" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link highlight">
                <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
                <span>Escáner QR / Toma de Inventario</span>
              </a>

              @if (authService.currentUser()?.accesoActivos) {
                <a routerLink="/activos" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">inventory_2</span>
                  <span>Inventario Activos Fijos</span>
                </a>
                <a routerLink="/seguros" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">security</span>
                  <span>Pólizas de Seguro</span>
                </a>
                <a routerLink="/gestiones" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">event_available</span>
                  <span>Cierres Anuales & UFV</span>
                </a>
              }

              @if (authService.currentUser()?.accesoAlmacenes) {
                <a routerLink="/almacenes" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">warehouse</span>
                  <span>Almacenes y Suministros</span>
                </a>
              }

              @if (authService.currentUser()?.accesoActivos || authService.currentUser()?.accesoAlmacenes) {
                <a routerLink="/entidades" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">corporate_fare</span>
                  <span>Entidades e Instituciones</span>
                </a>
                <a routerLink="/proveedores" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link">
                  <span class="material-icons" aria-hidden="true">storefront</span>
                  <span>Catálogo de Proveedores</span>
                </a>
              }

              @if (esSuperAdmin()) {
                <a routerLink="/configuracion" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-link config-drawer-link">
                  <span class="material-icons" aria-hidden="true">settings</span>
                  <span>Configuración Sistema</span>
                </a>
              }
            </nav>

            <div class="drawer-footer">
              <button type="button" class="drawer-logout-btn" (click)="logout()">
                <span class="material-icons" aria-hidden="true">logout</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      }

      <!-- Main Router Outlet Body -->
      <main class="content-body">
        <router-outlet></router-outlet>
      </main>

      <!-- Barra de Navegación Inferior Móvil Adaptativa -->
      <nav class="mobile-bottom-nav" aria-label="Navegación inferior móvil">
        <a routerLink="/dashboard" routerLinkActive="active" class="bottom-nav-item">
          <span class="material-icons" aria-hidden="true">dashboard</span>
          <span>Tablero</span>
        </a>

        @if (authService.currentUser()?.accesoActivos) {
          <a routerLink="/activos" routerLinkActive="active" class="bottom-nav-item">
            <span class="material-icons" aria-hidden="true">inventory_2</span>
            <span>Activos</span>
          </a>
        } @else if (authService.currentUser()?.accesoAlmacenes) {
          <a routerLink="/almacenes" routerLinkActive="active" class="bottom-nav-item">
            <span class="material-icons" aria-hidden="true">warehouse</span>
            <span>Almacén</span>
          </a>
        } @else {
          <a routerLink="/portal-solicitante" routerLinkActive="active" class="bottom-nav-item">
            <span class="material-icons" aria-hidden="true">assignment_ind</span>
            <span>Mi Portal</span>
          </a>
        }

        <a routerLink="/verificar/activo" routerLinkActive="active" class="bottom-nav-item scan-center-item" aria-label="Abrir Escáner QR">
          <div class="scan-circle">
            <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
          </div>
          <span>Escanear</span>
        </a>

        @if (authService.currentUser()?.accesoActivos && authService.currentUser()?.accesoAlmacenes) {
          <a routerLink="/almacenes" routerLinkActive="active" class="bottom-nav-item">
            <span class="material-icons" aria-hidden="true">warehouse</span>
            <span>Almacén</span>
          </a>
        } @else {
          <a routerLink="/portal-solicitante" routerLinkActive="active" class="bottom-nav-item">
            <span class="material-icons" aria-hidden="true">assignment_ind</span>
            <span>Solicitudes</span>
          </a>
        }

        <button type="button" class="bottom-nav-item" (click)="toggleMenuMovil()" aria-label="Abrir más opciones">
          <span class="material-icons" aria-hidden="true">menu</span>
          <span>Menú</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    .layout-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      position: relative;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .topbar {
      height: 64px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      border-bottom: 1px solid #1e293b;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .mobile-menu-toggle {
      display: none;
      background: transparent;
      border: none;
      color: #f1f5f9;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }

    .brand-icon {
      font-size: 26px;
      color: #38bdf8;
    }

    .brand-titles {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: #ffffff;
    }

    .brand-sub {
      font-size: 0.68rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      color: #94a3b8;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .nav-item .material-icons {
      font-size: 1.1rem;
    }

    .nav-item:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }

    .nav-item.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      font-weight: 600;
    }

    .config-item {
      color: #a78bfa;
    }
    .config-item.active {
      color: #c084fc;
      background: rgba(168, 85, 247, 0.15);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .header-scan-quickbtn {
      display: none;
      width: 40px;
      height: 40px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid #38bdf8;
      border-radius: 10px;
      color: #38bdf8;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    .admin-scope-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid #334155;
      border-radius: 8px;
    }

    .admin-scope-badge.activos .badge-icon { color: #38bdf8; }
    .admin-scope-badge.almacenes .badge-icon { color: #f59e0b; }
    .admin-scope-badge.unificado .badge-icon { color: #a855f7; }
    .admin-scope-badge.funcionario .badge-icon { color: #10b981; }

    .admin-scope-badge .badge-text {
      display: flex;
      flex-direction: column;
    }

    .admin-scope-badge .badge-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #f1f5f9;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .admin-scope-badge .badge-subtitle {
      font-size: 0.65rem;
      color: #94a3b8;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.2;
    }

    .user-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .user-role {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .avatar-circle {
      width: 36px;
      height: 36px;
      background: #0284c7;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      border: 2px solid #38bdf8;
    }

    .avatar-circle.large {
      width: 48px;
      height: 48px;
      font-size: 1.1rem;
    }

    .menu-user-header {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      border-bottom: 1px solid #e2e8f0;
      min-width: 200px;
    }

    .unit-tag {
      color: #0284c7;
      font-weight: 500;
    }

    .content-body {
      flex: 1 1 auto;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }

    /* Mobile Drawer */
    .mobile-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 100;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    .mobile-drawer {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 82%;
      max-width: 320px;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .drawer-header {
      padding: 1.25rem 1.25rem 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
    }

    .drawer-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.4rem;
    }

    .drawer-user-card {
      padding: 1.25rem;
      background: rgba(30, 41, 59, 0.5);
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .drawer-user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .drawer-user-meta strong {
      font-size: 0.92rem;
      color: #ffffff;
    }

    .drawer-user-meta span {
      font-size: 0.75rem;
      color: #38bdf8;
    }

    .drawer-user-meta small {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .drawer-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }

    .drawer-link {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      color: #cbd5e1;
      font-size: 0.92rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .drawer-link:hover, .drawer-link.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-weight: 600;
    }

    .drawer-link.highlight {
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }

    .config-drawer-link {
      color: #c084fc;
    }

    .drawer-footer {
      padding: 1rem 1.25rem 1.5rem 1.25rem;
      border-top: 1px solid #1e293b;
    }

    .drawer-logout-btn {
      width: 100%;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    /* Bottom Navigation Bar for Mobile */
    .mobile-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      z-index: 60;
      align-items: center;
      justify-content: space-around;
      padding: 0 0.5rem;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.25);
    }

    .bottom-nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      color: #94a3b8;
      text-decoration: none;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.68rem;
      font-weight: 500;
      padding: 0.4rem 0;
      transition: color 0.15s ease;
    }

    .bottom-nav-item .material-icons {
      font-size: 1.35rem;
    }

    .bottom-nav-item.active {
      color: #38bdf8;
      font-weight: 700;
    }

    .bottom-nav-item.scan-center-item {
      position: relative;
      top: -12px;
      color: #38bdf8;
    }

    .scan-circle {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
      border: 3px solid #0f172a;
      transition: transform 0.15s ease;
    }

    .scan-circle:hover {
      transform: scale(1.05);
    }

    .scan-circle .material-icons {
      font-size: 1.6rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    /* RESPONSIVE BREAKPOINT (< 900px) */
    @media (max-width: 900px) {
      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: flex !important;
      }

      .mobile-menu-toggle {
        display: flex;
      }

      .topbar {
        padding: 0 0.75rem;
        height: 56px;
        width: 100%;
        max-width: 100vw;
        overflow: hidden;
        box-sizing: border-box;
      }

      .topbar-left {
        gap: 0.5rem;
        min-width: 0;
        overflow: hidden;
      }

      .brand {
        min-width: 0;
        overflow: hidden;
      }

      .brand-titles {
        min-width: 0;
        overflow: hidden;
      }

      .brand-name {
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .brand-sub {
        font-size: 0.58rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-right {
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .content-body {
        padding-bottom: 76px;
        width: 100% !important;
        max-width: 100vw !important;
        min-width: 0 !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }

      .mobile-bottom-nav {
        display: flex;
      }
    }
  `],
})
export class MainLayoutComponent {
  menuMovilAbierto = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  toggleMenuMovil(): void {
    this.menuMovilAbierto.update((v) => !v);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  logout(): void {
    this.cerrarMenuMovil();
    this.authService.logout();
  }

  esSuperAdmin(): boolean {
    const user = this.authService.currentUser();
    return !!(user && (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL'));
  }

  getBadgeClass(): string {
    const user = this.authService.currentUser();
    if (!user) return 'funcionario';
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') return 'unificado';
    if (user.accesoActivos && !user.accesoAlmacenes) return 'activos';
    if (!user.accesoActivos && user.accesoAlmacenes) return 'almacenes';
    return 'funcionario';
  }

  getBadgeIcon(): string {
    const user = this.authService.currentUser();
    if (!user) return 'badge';
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') return 'admin_panel_settings';
    if (user.accesoActivos && !user.accesoAlmacenes) return 'inventory_2';
    if (!user.accesoActivos && user.accesoAlmacenes) return 'warehouse';
    return 'account_circle';
  }

  getBadgeTitle(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Portal Usuario';
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') return 'Admin General (Activos & Almacén)';
    if (user.accesoActivos && !user.accesoAlmacenes) return 'Admin Activos Fijos';
    if (!user.accesoActivos && user.accesoAlmacenes) return 'Encargado de Almacenes';
    return 'Portal del Funcionario';
  }

  getBadgeSubtitle(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Autoservicio';
    if (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') return 'Gestión Integral Unificada';
    if (user.accesoActivos && !user.accesoAlmacenes) return 'Bienes, Custodia & UFV';
    if (!user.accesoActivos && user.accesoAlmacenes) return 'Suministros & Kardex WMS';
    return 'Requerimientos & Custodia';
  }
}
