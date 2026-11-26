import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const moduloAlmacenesGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user && (user.accesoAlmacenes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL')) {
    return true;
  }

  // If user does not have access to Almacenes, redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};
