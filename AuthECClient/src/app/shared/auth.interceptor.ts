import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BackendHealthService } from './services/backend-health.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService)
  const router = inject(Router)
  const toastr = inject(ToastrService)
  const backendHealthService = inject(BackendHealthService)

  // Solo agregar el token si existe, tiene formato válido y no está expirado
  const token = authService.getToken();
  if (token && token.trim() !== '' && authService.isLoggedIn() && authService.isTokenValid()) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token)
    })
    return next(clonedReq).pipe(
      tap({
        next: () => {
          // Si la petición fue exitosa, marcar backend como disponible
          backendHealthService.setBackendUp();
        },
        error: (err: HttpErrorResponse) => {
          // Detectar errores de conexión (backend no disponible)
          if (err.status === 0) {
            // Error de red: backend no responde, CORS, o no hay internet
            console.error('🔴 Error de conexión con el backend:', err.message);
            backendHealthService.setBackendDown();
            toastr.error(
              'No se puede conectar con el servidor. Por favor, verifica tu conexión.',
              'Servidor No Disponible',
              { timeOut: 0, extendedTimeOut: 0, closeButton: true }
            );
          }
          // Detectar timeout
          else if (err.status === 504 || err.status === 503) {
            console.error('🔴 Timeout o servidor no disponible:', err.status);
            backendHealthService.setBackendDown();
            toastr.error(
              'El servidor está tardando demasiado en responder. Intenta más tarde.',
              'Servidor Lento',
              { timeOut: 8000 }
            );
          }
          // Token expirado o inválido
          else if (err.status == 401) {
            authService.deleteToken()
            setTimeout(() => {
              toastr.info('Please login again', 'Session Expired!')
            }, 1500);
            router.navigateByUrl('/user/login')
          }
          // Sin permisos
          else if (err.status == 403) {
            toastr.error("Oops! It seems you're not authorized to perform the action.")
          }
          // Error interno del servidor
          else if (err.status >= 500 && err.status < 600) {
            // No mostrar error para endpoints de notificaciones si la tabla no existe
            // Esto evita mostrar errores cuando la migración no se ha aplicado
            if (req.url.includes('/Notification')) {
              console.warn('⚠️ Tabla de notificaciones no disponible (migración pendiente):', req.url);
              // No mostrar toast para errores de notificaciones
            } else {
            console.error('🔴 Error del servidor:', err.status, err.message);
            toastr.error(
              'Ocurrió un error en el servidor. Por favor, intenta más tarde.',
              'Error del Servidor',
              { timeOut: 6000 }
            );
            }
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }
  else
    return next(req).pipe(
      tap({
        next: () => {
          // Petición pública exitosa, backend disponible
          backendHealthService.setBackendUp();
        },
        error: (err: HttpErrorResponse) => {
          // Detectar errores de conexión en peticiones públicas (login, registro)
          if (err.status === 0) {
            console.error('🔴 Error de conexión con el backend (petición pública):', err.message);
            backendHealthService.setBackendDown();
            toastr.error(
              'No se puede conectar con el servidor. Por favor, verifica que el backend esté activo.',
              'Servidor No Disponible',
              { timeOut: 0, extendedTimeOut: 0, closeButton: true }
            );
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
};
