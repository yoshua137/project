import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, AbstractControl, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CareerModalComponent } from './career-modal.component';
import { RegistrationPrefillService } from '../../shared/services/registration-prefill.service';

declare const google: any;

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CareerModalComponent],
  templateUrl: './registration.component.html',
  styleUrls: []
})
export class RegistrationComponent implements OnInit, OnDestroy {

  isSubmitted: boolean = false;
  showCareerModal = false;
  isEmailPrefilled = false;
  isFullNamePrefilled = false;
  isDirectorVerificationRequired = false;
  isDirectorVerified = false;
  isDirectorVerifying = false;
  directorVerifiedEmail = '';
  
  allDepartments = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      careers: [
        { value: 'Medicina', display: 'Medicina' },
        { value: 'Enfermeria', display: 'Enfermería' },
        { value: 'Odontologia', display: 'Odontología' },
        { value: 'Kinesiologia y Fisioterapia', display: 'Kinesiología y Fisioterapia' }
      ]
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingenieria y Ciencias Exactas',
      careers: [
        { value: 'Arquitectura', display: 'Arquitectura' },
        { value: 'Ingenieria Ambiental', display: 'Ingeniería Ambiental' },
        { value: 'Ingenieria Civil', display: 'Ingeniería Civil' },
        { value: 'Ingenieria Industrial', display: 'Ingeniería Industrial' },
        { value: 'Ingenieria Quimica', display: 'Ingeniería Química' },
        { value: 'Ingenieria Mecatronica', display: 'Ingeniería Mecatrónica' },
        { value: 'Ingenieria de Sistemas', display: 'Ingeniería de Sistemas' }
      ]
    },
    {
      name: 'Administración y Economía',
      value: 'Administracion y Economia',
      careers: [
        { value: 'Administracion de Empresas', display: 'Administración de Empresas' },
        { value: 'Contaduria Publica (Auditoria)', display: 'Contaduría Pública (Auditoría)' },
        { value: 'Ingenieria Comercial', display: 'Ingeniería Comercial' },
        { value: 'Ingenieria Empresarial', display: 'Ingeniería Empresarial' },
        { value: 'Ingenieria Financiera', display: 'Ingeniería Financiera' },
        { value: 'Ingenieria en Comercio y Finanzas Internacionales', display: 'Ingeniería en Comercio y Finanzas Internacionales' }
      ]
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      careers: [
        { value: 'Antropologia', display: 'Antropología' },
        { value: 'Comunicacion Social', display: 'Comunicación Social' },
        { value: 'Diseno Digital Multimedia', display: 'Diseño Digital Multimedia' },
        { value: 'Derecho', display: 'Derecho' },
        { value: 'Filosofia y Letras', display: 'Filosofía y Letras' },
        { value: 'Psicologia', display: 'Psicología' }
      ]
    }
  ];
  filteredCareers: string[] = [];
  filteredCareersWithDisplay: { value: string; display: string; }[] = [];
  allCareers: { value: string; display: string; }[] = [];
  
  private readonly googleClientId = '200970764916-9da887o8cna39v5ldk3ko0oga9fam96a.apps.googleusercontent.com';
  private googleInitAttempts = 0;
  private googleInitTimer?: number;
  private googleTokenClient: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private http: HttpClient,
    private prefillService: RegistrationPrefillService
  ) { }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): { [key: string]: any } | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Si las contraseñas coinciden, quita el error específico
      if (confirmPassword?.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
      return null;
    }
  };

  registrationForm = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    password: new FormControl("", [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(15),
      Validators.pattern(/(?=.*[^a-zA-Z0-9])/)
    ]),
    confirmPassword: new FormControl("", [Validators.required]),
    role: new FormControl({ value: '', disabled: true }, [Validators.required]),
    career: new FormControl(""),
    fullName: new FormControl(""),
    department: new FormControl(""),
    invitationToken: new FormControl("")
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    // Inicializar la lista completa de carreras
    this.allCareers = this.allDepartments.flatMap(dept => dept.careers);
    
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const token = params['token'];
      
      if (token) {
        this.registrationForm.get('invitationToken')?.setValue(token);
        this.validateInvitationToken(token);
      }
      
      if (role && (role === 'Student' || role === 'Organization' || role === 'Teacher' || role === 'Director')) {
        this.registrationForm.get('role')?.setValue(role);
        this.configureRole(role);
      } else if (!token) {
        // Si no hay token ni rol válido, redirigir a la selección de rol
        this.router.navigate(['/user/select-role']);
      }
    });
    // Lógica para selects dependientes
    this.registrationForm.get('department')?.valueChanges.subscribe(dept => {
      this.updateCareersForDepartment(dept || '');
    });
  }

  ngOnDestroy(): void {
    if (this.googleInitTimer) {
      window.clearTimeout(this.googleInitTimer);
    }
  }

  validateInvitationToken(token: string) {
    this.http.get(`${environment.apiBaseUrl}/RegistrationInvitation/validate/${token}`).subscribe({
      next: (response: any) => {
        this.registrationForm.get('role')?.setValue(response.role);
        this.configureRole(response.role);
        this.toastr.success('Token de invitación válido', 'Validación Exitosa');
      },
      error: (err) => {
        this.toastr.error('Token de invitación inválido o expirado', 'Error de Validación');
        this.router.navigate(['/user/select-role']);
      }
    });
  }

  updateValidators(role: string | null): void {
    const careerControl = this.registrationForm.get('career');
    const fullNameControl = this.registrationForm.get('fullName');
    const departmentControl = this.registrationForm.get('department');
    const invitationTokenControl = this.registrationForm.get('invitationToken');

    // Limpiar validadores existentes
    careerControl?.clearValidators();
    fullNameControl?.clearValidators();
    departmentControl?.clearValidators();
    invitationTokenControl?.clearValidators();

    if (role === 'Student') {
      careerControl?.setValidators([Validators.required]);
      fullNameControl?.setValidators([Validators.required]);
    } else if (role === 'Organization') {
      fullNameControl?.setValidators([Validators.required]);
    } else if (role === 'Teacher') {
      fullNameControl?.setValidators([Validators.required]);
      careerControl?.setValidators([Validators.required]);
      invitationTokenControl?.setValidators([Validators.required]);
    } else if (role === 'Director') {
      fullNameControl?.setValidators([Validators.required]);
      departmentControl?.setValidators([Validators.required]);
      // No pedir token en el formulario, pero puede estar en el form si viene por URL
      invitationTokenControl?.clearValidators();
    }

    // Actualizar el estado de validación
    careerControl?.updateValueAndValidity();
    fullNameControl?.updateValueAndValidity();
    departmentControl?.updateValueAndValidity();
    invitationTokenControl?.updateValueAndValidity();
  }

  private configureRole(role: string | null) {
    this.updateValidators(role);
    if (role) {
      this.applyPrefillForRole(role);
    }
    this.updateRoleSpecificState(role);
  }

  private applyPrefillForRole(role: string) {
    const emailControl = this.registrationForm.get('email');
    const fullNameControl = this.registrationForm.get('fullName');
    this.isEmailPrefilled = false;
    this.isFullNamePrefilled = false;

    const data = this.prefillService.consumePrefill(role);
    if (data) {
      emailControl?.setValue(data.email);
      fullNameControl?.setValue(data.fullName);
      this.isEmailPrefilled = true;
      this.isFullNamePrefilled = true;

      if (role === 'Director') {
        this.isDirectorVerified = true;
        this.directorVerifiedEmail = data.email;
      }
      return;
    }

    if (role === 'Director') {
      this.isDirectorVerified = false;
      this.directorVerifiedEmail = '';
    }
  }

  private updateRoleSpecificState(role: string | null) {
    this.isDirectorVerificationRequired = role === 'Director';
    if (role === 'Director') {
      this.ensureGooglePlatformLoaded();
    } else {
      this.isDirectorVerified = false;
      this.directorVerifiedEmail = '';
    }
  }

  hasDisplayableError(controlName: string): boolean {
    const control = this.registrationForm.get(controlName);
    return Boolean(control?.invalid) && (this.isSubmitted || (Boolean(control?.touched) || Boolean(control?.dirty)));
  }

  get email(): AbstractControl {
    return this.registrationForm.get('email')!;
  }

  get password(): AbstractControl {
    return this.registrationForm.get('password')!;
  }

  get confirmPassword(): AbstractControl {
    return this.registrationForm.get('confirmPassword')!;
  }

  get role(): AbstractControl {
    return this.registrationForm.get('role')!;
  }

  get career(): AbstractControl {
    return this.registrationForm.get('career')!;
  }

  get fullName(): AbstractControl {
    return this.registrationForm.get('fullName')!;
  }

  get department(): AbstractControl {
    return this.registrationForm.get('department')!;
  }

  get invitationToken(): AbstractControl {
    return this.registrationForm.get('invitationToken')!;
  }

  onSubmit() {
    this.isSubmitted = true;
    const role = this.registrationForm.get('role')?.value;
    const career = this.registrationForm.get('career')?.value;

    if (role === 'Director' && (!career || career.trim() === '')) {
      this.showCareerModal = true;
      return;
    }

    if (role === 'Director' && !this.isDirectorVerified) {
      this.toastr.error('Debes validar tu cuenta institucional @ucb.edu.bo antes de crear la cuenta.', 'Registro de Director');
      return;
    }

    if (this.registrationForm.invalid) {
      // El validador ya se encarga de mostrar el error en el campo.
      // Opcionalmente, mostrar un toast si el error es de mismatch al enviar.
      if (this.registrationForm.errors?.['passwordMismatch']) {
        this.toastr.error('Las contraseñas no coinciden.', 'Error de Validación');
      }
      return;
    }
    
    const registrationData = this.registrationForm.getRawValue();
    const payload: any = { 
      email: registrationData.email, 
      password: registrationData.password 
    };
    let apiCall;

    switch (registrationData.role) {
      case 'Student':
        payload.career = registrationData.career;
        payload.fullName = registrationData.fullName;
        apiCall = this.authService.registerStudent(payload);
        break;
      case 'Organization':
        payload.fullName = registrationData.fullName;
        apiCall = this.authService.registerOrganization(payload);
        break;
      case 'Teacher':
        payload.career = registrationData.career;
        payload.fullName = registrationData.fullName;
        payload.invitationToken = registrationData.invitationToken;
        apiCall = this.authService.registerTeacher(payload);
        break;
      case 'Director':
        payload.fullName = registrationData.fullName;
        payload.department = registrationData.department;
        payload.career = registrationData.career;
        // Solo enviar invitationToken si existe (viene de la URL)
        if (registrationData.invitationToken) {
          payload.invitationToken = registrationData.invitationToken;
        }
        apiCall = this.authService.registerDirector(payload);
        break;
      default:
        this.toastr.error('Rol no válido detectado.');
        return;
    }

    apiCall.subscribe({
      next: (res: any) => {
        this.toastr.success('¡Registro exitoso!', 'Cuenta Creada');
        this.router.navigate(['/user/login']);
      },
      error: (err) => {
        if (this.handleDuplicateEmailError(err, registrationData.role)) {
          return;
        }
        if (err.error && err.error.errors) {
          err.error.errors.forEach((x: any) => {
            this.toastr.error(x.description ?? 'Ocurrió un error en el registro.', 'Fallo en el Registro');
          });
          return;
        }
        if (typeof err.error === 'string' && err.error.trim() !== '') {
          this.toastr.error(err.error, 'Fallo en el Registro');
          return;
        }
        if (err.error?.message) {
          this.toastr.error(err.error.message, 'Fallo en el Registro');
          return;
        }
        this.toastr.error('Ocurrió un error inesperado.', 'Fallo en el Registro');
        console.error('API Error:', err);
      }
    });
  }

  private handleDuplicateEmailError(err: any, role: string | null): boolean {
    const errors = err?.error?.errors;
    const normalizedMessage = (err?.error?.message ?? '').toString().toLowerCase();
    const duplicateCodes = new Set<string>(['DuplicateEmail', 'DuplicateUserName']);

    const hasDuplicateCode = Array.isArray(errors) && errors.some((x: any) => duplicateCodes.has(x?.code));
    const hasDuplicateMessage = normalizedMessage.includes('duplicate') || normalizedMessage.includes('ya existe');

    if (role === 'Student' && (hasDuplicateCode || hasDuplicateMessage)) {
      this.toastr.error('Tu correo institucional ya está registrado. Por favor inicia sesión o usa otro correo.', 'Registro de Estudiante');
      return true;
    }

    if (hasDuplicateCode) {
      this.toastr.error('El correo electrónico ya está en uso.', 'Fallo en el Registro');
      return true;
    }
    return false;
  }

  onCareerSelectedFromModal(career: string) {
    this.registrationForm.get('career')?.setValue(career);
    this.showCareerModal = false;
    this.onSubmit(); // Vuelve a intentar el submit ahora con carrera
  }

  updateCareersForDepartment(dept: string) {
    const found = this.allDepartments.find(d => d.value === dept);
    this.filteredCareers = found ? found.careers.map(career => career.value) : [];
    this.filteredCareersWithDisplay = found ? found.careers : [];
    // Limpiar carrera si se cambia de departamento
    this.registrationForm.get('career')?.setValue('');
  }

  onDirectorGoogleSignIn() {
    if (this.role.value !== 'Director') {
      return;
    }
    if (!this.isGoogleAvailable()) {
      this.toastr.warning('Google Sign-In todavía se está cargando. Intenta nuevamente en unos segundos.', 'Cuenta institucional');
      this.ensureGooglePlatformLoaded();
      return;
    }
    this.ensureTokenClient();
    this.isDirectorVerifying = true;
    this.googleTokenClient.requestAccessToken({ prompt: 'consent' });
  }

  private ensureGooglePlatformLoaded() {
    if (this.isGoogleAvailable()) {
      return;
    }
    if (this.googleInitAttempts >= 20) {
      this.toastr.error('No se pudo cargar Google Sign-In. Refresca la página e inténtalo otra vez.', 'Cuenta institucional');
      return;
    }
    this.googleInitAttempts++;
    this.googleInitTimer = window.setTimeout(() => this.ensureGooglePlatformLoaded(), 300);
  }

  private isGoogleAvailable(): boolean {
    return typeof google !== 'undefined' && Boolean(google?.accounts);
  }

  private ensureTokenClient() {
    if (this.googleTokenClient) {
      return;
    }
    this.googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.googleClientId,
      scope: 'openid email profile',
      callback: async (tokenResponse: any) => {
        if (!tokenResponse || !tokenResponse.access_token) {
          this.isDirectorVerifying = false;
          this.toastr.error('No se pudo obtener autorización de Google.', 'Cuenta institucional');
          return;
        }
        await this.handleGoogleAccessToken(tokenResponse.access_token);
      }
    });
  }

  private async handleGoogleAccessToken(accessToken: string) {
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
        this.toastr.error('Debes usar tu correo institucional @ucb.edu.bo para registrarte.', 'Cuenta institucional');
        return;
      }

      this.prefillService.setPrefill({
        role: 'Director',
        email,
        fullName: fullName || email
      });
      this.applyPrefillForRole('Director');
      this.toastr.success('Cuenta institucional verificada correctamente.', 'Registro de Director');
    } catch (error) {
      console.error('Error obteniendo perfil de Google', error);
      this.toastr.error('Ocurrió un problema al validar tu cuenta institucional.', 'Registro de Director');
    } finally {
      this.isDirectorVerifying = false;
    }
  }
}
