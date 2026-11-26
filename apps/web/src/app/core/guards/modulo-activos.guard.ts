import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const moduloActivosGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user && (user.accesoActivos || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL')) {
    return true;
  }

  // If user does not have access to Activos, redirect to dashboard or appropriate page
  router.navigate(['/dashboard']);
  return false;
};
