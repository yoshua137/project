import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { UserService } from '../shared/services/user.service';
import { HideIfClaimsNotMetDirective } from '../directives/hide-if-claims-not-met.directive';
import { claimReq } from '../shared/utils/claimReq-utils';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HideIfClaimsNotMetDirective, CommonModule],
  templateUrl: './dashboard.component.html',
  styles: ``
})
export class DashboardComponent implements OnInit {

  constructor(private router: Router,
    private authService: AuthService,
    private userService: UserService) { }
  fullName: string = ''
  claimReq = claimReq
  tokenRemainingTime: number | null = null;
  showExpirationWarning: boolean = false;

  ngOnInit(): void {
    // Validar token antes de cargar el dashboard
    this.validateToken();

    // Obtener perfil del usuario
    this.userService.getUserProfile().subscribe({
      next: (res: any) => this.fullName = res.fullName,
      error: (err: any) => {
        console.log('error while retrieving user profile:\n', err);
        // Si hay error 401, probablemente el token expiró
        if (err.status === 401) {
          console.warn('Token inválido o expirado en respuesta del servidor');
          this.handleExpiredSession();
        }
      }
    });

    // Verificar tiempo restante del token cada minuto
    this.checkTokenExpiration();
  }

  /**
   * Valida si el token es válido al cargar el dashboard
   */
  private validateToken(): void {
    if (!this.authService.isTokenValid()) {
      console.warn('Token expirado al cargar dashboard');
      this.handleExpiredSession();
    }
  }

  /**
   * Verifica el tiempo restante del token y muestra advertencias
   */
  private checkTokenExpiration(): void {
    // Verificar inmediatamente
    this.updateTokenRemainingTime();

    // Verificar cada 60 segundos
    setInterval(() => {
      this.updateTokenRemainingTime();
    }, 60000); // 60 segundos
  }

  /**
   * Actualiza el tiempo restante del token
   */
  private updateTokenRemainingTime(): void {
    this.tokenRemainingTime = this.authService.getTokenRemainingTime();

    // Mostrar advertencia si quedan menos de 30 minutos
    if (this.tokenRemainingTime !== null && this.tokenRemainingTime < 30 && this.tokenRemainingTime > 0) {
      this.showExpirationWarning = true;
      console.warn(`Token expirará en ${this.tokenRemainingTime} minutos`);
    }

    // Si el token expiró, cerrar sesión
    if (this.tokenRemainingTime !== null && this.tokenRemainingTime <= 0) {
      this.handleExpiredSession();
    }
  }

  /**
   * Maneja la sesión expirada
   */
  private handleExpiredSession(): void {
    this.authService.logout();
    alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    this.router.navigate(['/user/login']);
  }


}
