import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, AbstractControl, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.component.html',
  styleUrls: []
})
export class RegistrationComponent implements OnInit {

  isSubmitted: boolean = false;
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private http: HttpClient
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
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const token = params['token'];
      
      if (token) {
        this.registrationForm.get('invitationToken')?.setValue(token);
        this.validateInvitationToken(token);
      }
      
      if (role && (role === 'Student' || role === 'Organization' || role === 'Teacher' || role === 'Director')) {
        this.registrationForm.get('role')?.setValue(role);
        this.updateValidators(role);
      } else if (!token) {
        // Si no hay token ni rol válido, redirigir a la selección de rol
        this.router.navigate(['/user/select-role']);
      }
    });
  }

  validateInvitationToken(token: string) {
    this.http.get(`${environment.apiBaseUrl}/RegistrationInvitation/validate/${token}`).subscribe({
      next: (response: any) => {
        this.registrationForm.get('role')?.setValue(response.role);
        this.updateValidators(response.role);
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
      invitationTokenControl?.setValidators([Validators.required]);
    }

    // Actualizar el estado de validación
    careerControl?.updateValueAndValidity();
    fullNameControl?.updateValueAndValidity();
    departmentControl?.updateValueAndValidity();
    invitationTokenControl?.updateValueAndValidity();
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
        payload.invitationToken = registrationData.invitationToken;
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
        if (err.error && err.error.errors) {
          err.error.errors.forEach((x: any) => {
            if (x.code === "DuplicateEmail") {
              this.toastr.error('El correo electrónico ya está en uso.', 'Fallo en el Registro');
            } else {
              this.toastr.error(x.description, 'Fallo en el Registro');
            }
          });
        } else {
          this.toastr.error('Ocurrió un error inesperado.', 'Fallo en el Registro');
        }
        console.error('API Error:', err);
      }
    });
  }
}
