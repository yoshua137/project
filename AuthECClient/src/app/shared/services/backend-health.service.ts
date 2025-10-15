import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendHealthService {
  private isBackendAvailable$ = new BehaviorSubject<boolean>(true);
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30 segundos

  constructor(private http: HttpClient) {}

  /**
   * Observable para saber si el backend está disponible
   */
  getBackendStatus(): Observable<boolean> {
    return this.isBackendAvailable$.asObservable();
  }

  /**
   * Obtiene el estado actual del backend
   */
  isBackendUp(): boolean {
    return this.isBackendAvailable$.value;
  }

  /**
   * Marca el backend como no disponible
   */
  setBackendDown(): void {
    if (this.isBackendAvailable$.value) {
      console.error('🔴 Backend no disponible');
      this.isBackendAvailable$.next(false);
    }
  }

  /**
   * Marca el backend como disponible
   */
  setBackendUp(): void {
    if (!this.isBackendAvailable$.value) {
      console.log('🟢 Backend disponible nuevamente');
      this.isBackendAvailable$.next(true);
    }
  }

  /**
   * Verifica la salud del backend haciendo una petición de prueba
   * Nota: No requiere endpoint /health, usa cualquier endpoint público
   */
  checkBackendHealth(): Observable<boolean> {
    // Evitar verificaciones muy frecuentes
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return of(this.isBackendAvailable$.value);
    }
    this.lastCheckTime = now;

    // Hacer una petición HEAD simple para verificar conectividad
    // Si el backend no tiene endpoint /health, intentará conectar de todas formas
    return this.http.head(`${environment.apiBaseUrl}`, { 
      observe: 'response'
    }).pipe(
      tap(() => {
        this.setBackendUp();
      }),
      catchError((error) => {
        // Incluso si el endpoint retorna 404, significa que el backend está UP
        // Solo status 0 significa backend DOWN
        if (error.status === 0) {
          console.error('Error al verificar salud del backend:', error);
          this.setBackendDown();
          return of(false);
        } else {
          // Cualquier otro error significa que el backend responde
          console.log('Backend responde (status:', error.status, ')');
          this.setBackendUp();
          return of(true);
        }
      }),
      tap((response: any) => {
        const isAvailable = response !== false;
        return of(isAvailable);
      })
    );
  }

  /**
   * Inicia verificación periódica del backend
   */
  startHealthCheck(interval: number = 60000): void {
    this.checkBackendHealth().subscribe();

    setInterval(() => {
      if (!this.isBackendUp()) {
        this.checkBackendHealth().subscribe();
      }
    }, interval);
  }
}

