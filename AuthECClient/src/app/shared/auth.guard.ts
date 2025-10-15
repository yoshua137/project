import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si el usuario está logueado Y el token es válido (no expirado)
  if (authService.isLoggedIn() && authService.isTokenValid()) {
    const claimReq = route.data['claimReq'] as Function;
    if (claimReq) {
      const claims = authService.getClaims();
      if (!claimReq(claims)) {
        router.navigateByUrl('/forbidden')
        return false
      }
      return true
    }
    return true;
  }
  else {
    // Si el token existe pero está expirado, eliminarlo
    if (authService.isLoggedIn() && !authService.isTokenValid()) {
      console.warn('Sesión expirada. Redirigiendo a login...');
      authService.logout();
    }
    
    router.navigateByUrl('/user/login')
    return false
  }

};
