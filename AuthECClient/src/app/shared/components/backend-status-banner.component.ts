import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BackendHealthService } from '../services/backend-health.service';

@Component({
  selector: 'app-backend-status-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!isBackendAvailable" 
         class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg animate-slide-down">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <!-- Icono de error -->
            <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            
            <!-- Mensaje -->
            <div>
              <p class="font-bold text-lg">⚠️ Servidor No Disponible</p>
              <p class="text-sm">
                No se puede conectar con el servidor. Por favor, verifica tu conexión o intenta más tarde.
              </p>
            </div>
          </div>

          <!-- Botón de reintentar -->
          <button 
            (click)="retryConnection()"
            [disabled]="isRetrying"
            class="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
            <svg *ngIf="isRetrying" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isRetrying ? 'Reintentando...' : 'Reintentar' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-down {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .animate-slide-down {
      animation: slide-down 0.3s ease-out;
    }
  `]
})
export class BackendStatusBannerComponent implements OnInit, OnDestroy {
  isBackendAvailable: boolean = true;
  isRetrying: boolean = false;
  private subscription?: Subscription;

  constructor(private backendHealthService: BackendHealthService) {}

  ngOnInit(): void {
    // Suscribirse al estado del backend
    this.subscription = this.backendHealthService.getBackendStatus().subscribe(
      (isAvailable) => {
        this.isBackendAvailable = isAvailable;
        if (isAvailable) {
          this.isRetrying = false;
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  retryConnection(): void {
    this.isRetrying = true;
    
    this.backendHealthService.checkBackendHealth().subscribe({
      next: (isAvailable) => {
        if (!isAvailable) {
          // Si sigue sin estar disponible, mostrar mensaje
          setTimeout(() => {
            this.isRetrying = false;
          }, 2000);
        }
      },
      error: () => {
        this.isRetrying = false;
      }
    });
  }
}




