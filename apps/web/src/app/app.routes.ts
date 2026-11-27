import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { moduloActivosGuard } from './core/guards/modulo-activos.guard';
import { moduloAlmacenesGuard } from './core/guards/modulo-almacenes.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'verificar/activo',
    loadComponent: () =>
      import('./features/activos/verificacion-qr.component').then((m) => m.VerificacionQrComponent),
  },
  {
    path: 'verificar/activo/:code',
    loadComponent: () =>
      import('./features/activos/verificacion-qr.component').then((m) => m.VerificacionQrComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'portal-solicitante',
        loadComponent: () =>
          import('./features/solicitante/portal-solicitante.component').then((m) => m.PortalSolicitanteComponent),
      },
      {
        path: 'activos',
        canActivate: [moduloActivosGuard],
        loadComponent: () =>
          import('./features/activos/activos-list.component').then((m) => m.ActivosListComponent),
      },
      {
        path: 'almacenes',
        canActivate: [moduloAlmacenesGuard],
        loadComponent: () =>
          import('./features/almacenes/almacenes.component').then((m) => m.AlmacenesComponent),
      },
      {
        path: 'entidades',
        loadComponent: () =>
          import('./features/entidades/entidades.component').then((m) => m.EntidadesComponent),
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./features/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
      },
      {
        path: 'seguros',
        canActivate: [moduloActivosGuard],
        loadComponent: () =>
          import('./features/seguros/seguros.component').then((m) => m.SegurosComponent),
      },
      {
        path: 'gestiones',
        canActivate: [moduloActivosGuard],
        loadComponent: () =>
          import('./features/gestiones/gestiones.component').then((m) => m.GestionesComponent),
      },
      {
        path: 'configuracion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
