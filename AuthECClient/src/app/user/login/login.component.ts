import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { jwtDecode } from 'jwt-decode';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styles: ``
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly googleClientId = '200970764916-9da887o8cna39v5ldk3ko0oga9fam96a.apps.googleusercontent.com';
  private googleInitAttempts = 0;
  private googleInitTimer?: number;
  constructor(
    public formBuilder: FormBuilder,
    private service: AuthService,
    private router: Router,
    private toastr: ToastrService) { }


  ngOnInit(): void {
    if (this.service.isLoggedIn())
      this.router.navigateByUrl('/dashboard')
    else
      this.initializeGoogleButton();
  }
  ngOnDestroy(): void {
    if (this.googleInitTimer) {
      window.clearTimeout(this.googleInitTimer);
    }
  }
  isSubmitted: boolean = false;

  form = this.formBuilder.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  })

  hasDisplayableError(controlName: string): Boolean {
    const control = this.form.get(controlName);
    return Boolean(control?.invalid) &&
      (this.isSubmitted || Boolean(control?.touched) || Boolean(control?.dirty))
  }

  onSubmit() {
    this.isSubmitted = true;
    if (this.form.valid) {
      this.service.signin(this.form.value).subscribe({
        next: (res: any) => {
          this.service.saveToken(res.token);
          this.router.navigateByUrl('/dashboard');
        },
        error: err => {
          if (err.status == 400)
            this.toastr.error('Email o contraseña incorrectos.', 'Error de Autenticación');
          else
            console.log('error during login:\n', err);
        }
      })
    }
  }

  private initializeGoogleButton() {
    if (typeof google === 'undefined') {
      if (this.googleInitAttempts < 15) {
        this.googleInitAttempts++;
        this.googleInitTimer = window.setTimeout(() => this.initializeGoogleButton(), 300);
      } else {
        this.toastr.warning('No se pudo cargar Google Sign-In. Intenta recargar la página.', 'Google Sign-In');
      }
      return;
    }

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: any) => this.handleGoogleCredential(response.credential),
      ux_mode: 'popup',
      auto_select: false
    });

    const googleButton = document.getElementById('googleSignInButton');
    if (googleButton) {
      google.accounts.id.renderButton(googleButton, {
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        width: 280
      });
    }
  }

  private handleGoogleCredential(credential: string) {
    if (!credential) {
      this.toastr.error('No se pudo obtener la credencial de Google.', 'Inicio de sesión con Google');
      return;
    }

    let email = '';
    try {
      const payload = jwtDecode<{ email?: string }>(credential);
      email = payload.email ?? '';
    } catch (error) {
      console.error('Error decodificando credencial de Google', error);
      this.toastr.error('Credencial de Google inválida.', 'Inicio de sesión con Google');
      return;
    }

    if (!email.toLowerCase().endsWith('@ucb.edu.bo')) {
      this.toastr.error('Solo se permiten cuentas institucionales @ucb.edu.bo', 'Inicio de sesión con Google');
      if (typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
      }
      return;
    }

    this.service.signinWithGoogle(credential).subscribe({
      next: (res: any) => {
        this.service.saveToken(res.token);
        this.router.navigateByUrl('/dashboard');
      },
      error: err => {
        const message = err?.error?.message ?? 'Error al iniciar sesión con Google.';
        this.toastr.error(message, 'Inicio de sesión con Google');
      }
    });
  }

}
