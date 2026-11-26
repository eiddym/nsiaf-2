import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user && (user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
