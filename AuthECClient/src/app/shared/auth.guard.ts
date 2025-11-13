import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Primero verificar si hay un token
  const token = authService.getToken();
  if (!token || token.trim() === '') {
    console.warn('No hay token. Redirigiendo a login...');
    router.navigateByUrl('/user/login');
    return false;
  }

  // Verificar si el usuario está logueado (token con formato válido)
  if (!authService.isLoggedIn()) {
    console.warn('Token inválido o mal formado. Redirigiendo a login...');
    authService.logout();
    router.navigateByUrl('/user/login');
    return false;
  }

  // Verificar si el token es válido (no expirado)
  if (!authService.isTokenValid()) {
    console.warn('Token expirado o inválido. Redirigiendo a login...');
    authService.logout();
    router.navigateByUrl('/user/login');
    return false;
  }

  // Si llegamos aquí, el usuario está autenticado y el token es válido
  // Verificar claims específicos si es necesario
  const claimReq = route.data['claimReq'] as Function;
  if (claimReq) {
    const claims = authService.getClaims();
    if (!claims || !claimReq(claims)) {
      router.navigateByUrl('/forbidden');
      return false;
    }
  }

  return true;
};
