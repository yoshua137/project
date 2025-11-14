import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RegistrationPrefillService } from '../../shared/services/registration-prefill.service';

declare const google: any;

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './role-selection.component.html',
  styleUrls: []
})
export class RoleSelectionComponent implements OnInit, OnDestroy {

  private readonly googleClientId = '200970764916-9da887o8cna39v5ldk3ko0oga9fam96a.apps.googleusercontent.com';
  private googleInitAttempts = 0;
  private googleInitTimer?: number;
  private googleTokenClient: any;
  private studentActionPending = false;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private prefillService: RegistrationPrefillService
  ) { }

  ngOnInit(): void {
    this.ensureGooglePlatformLoaded();
  }

  ngOnDestroy(): void {
    if (this.googleInitTimer) {
      window.clearTimeout(this.googleInitTimer);
    }
  }

  onStudentRegister(): void {
    this.studentActionPending = true;
    if (!this.isGoogleAvailable()) {
      this.toastr.warning('Google Sign-In todavía se está cargando. Inténtalo en unos segundos.', 'Registro con Google');
      this.studentActionPending = false;
      return;
    }

    this.ensureTokenClient();
    this.googleTokenClient.requestAccessToken({ prompt: 'consent' });
  }

  private ensureGooglePlatformLoaded(): void {
    if (this.isGoogleAvailable()) {
      return;
    }
    if (this.googleInitAttempts >= 20) {
      this.toastr.error('No se pudo inicializar Google Sign-In. Revisa tu conexión e intenta recargar.', 'Registro con Google');
      return;
    }
    this.googleInitAttempts++;
    this.googleInitTimer = window.setTimeout(() => this.ensureGooglePlatformLoaded(), 300);
  }

  private isGoogleAvailable(): boolean {
    return typeof google !== 'undefined' && Boolean(google?.accounts);
  }

  private ensureTokenClient(): void {
    if (this.googleTokenClient) {
      return;
    }
    this.googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.googleClientId,
      scope: 'openid email profile',
      callback: async (tokenResponse: any) => {
        if (!this.studentActionPending) {
          return;
        }
        this.studentActionPending = false;
        if (!tokenResponse || !tokenResponse.access_token) {
          this.toastr.error('No se pudo obtener autorización de Google.', 'Registro con Google');
          return;
        }
        await this.handleGoogleAccessToken(tokenResponse.access_token);
      }
    });
  }

  private async handleGoogleAccessToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error('No se pudo obtener la información del perfil.');
      }
      const profile = await response.json();
      const email: string = profile.email ?? '';
      const fullName: string = profile.name ?? `${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim();

      if (!email.toLowerCase().endsWith('@ucb.edu.bo')) {
        this.toastr.error('Debes usar tu correo institucional @ucb.edu.bo para registrarte.', 'Registro con Google');
        return;
      }

      this.prefillService.setPrefill({
        role: 'Student',
        email,
        fullName: fullName || email
      });

      this.router.navigate(['/user/registration'], { queryParams: { role: 'Student' } });
    } catch (error) {
      console.error('Error obteniendo perfil de Google', error);
      this.toastr.error('Ocurrió un problema al validar tu cuenta institucional.', 'Registro con Google');
    }
  }
}