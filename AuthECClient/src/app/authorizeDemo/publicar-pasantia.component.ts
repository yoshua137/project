import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-publicar-pasantia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './publicar-pasantia.component.html',
  styles: ''
})
export class PublicarPasantiaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';
  selectedDepartment: string = '';
  approvedDepartments: string[] = [];
  loadingDepartments = true;
  hasApprovedAgreements = false;
  searchTerm: string = '';
  filteredCareers: string[] = [];
  showCareerDropdown: boolean = false;
  modalidades = [
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Presencial', label: 'Presencial' },
    { value: 'Mixto', label: 'Mixto' }
  ];

  // Departamentos y carreras de la UCB
  allDepartments = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      careers: ['Medicina', 'Enfermeria', 'Odontologia', 'Kinesiologia y Fisioterapia']
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingenieria y Ciencias Exactas',
      careers: ['Arquitectura', 'Ingenieria Ambiental', 'Ingenieria Civil', 'Ingenieria Industrial', 'Ingenieria Quimica', 'Ingenieria Mecatronica', 'Ingenieria de Sistemas']
    },
    {
      name: 'Administración y Economía',
      value: 'Administracion y Economia',
      careers: ['Administracion de Empresas', 'Contaduria Publica (Auditoria)', 'Ingenieria Comercial', 'Ingenieria Empresarial', 'Ingenieria Financiera', 'Ingenieria en Comercio y Finanzas Internacionales']
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      careers: ['Antropologia', 'Comunicacion Social', 'Diseno Digital Multimedia', 'Derecho', 'Filosofia y Letras', 'Psicologia']
    }
  ];

  availableDepartments: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient, 
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      requirements: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      mode: ['', Validators.required],
      career: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', Validators.required],
      vacancies: ['DISPONIBLES', [Validators.required, Validators.pattern('DISPONIBLES|AGOTADAS')]]
    });
  }

  ngOnInit() {
    this.loadApprovedDepartments();
  }

  loadApprovedDepartments() {
    this.http.get<string[]>(`${environment.apiBaseUrl}/AgreementRequest/organization/approved-departments`).subscribe({
      next: (departments) => {
        this.approvedDepartments = departments;
        this.hasApprovedAgreements = departments.length > 0;
        this.loadingDepartments = false;
        
        // Filtrar departamentos disponibles
        this.availableDepartments = this.allDepartments.filter(dept => 
          this.approvedDepartments.includes(dept.value)
        );
        
        // Si hay departamentos aprobados, verificar si hay uno seleccionado en la URL
        if (this.hasApprovedAgreements) {
          this.route.queryParams.subscribe(params => {
            this.selectedDepartment = params['department'] || '';
          });
        }
      },
      error: (err) => {
        console.error('Error loading approved departments:', err);
        this.loadingDepartments = false;
        this.hasApprovedAgreements = false;
      }
    });
  }

  selectDepartment(department: string) {
    this.selectedDepartment = department;
    this.form.patchValue({ career: '' });
    this.searchTerm = '';
    this.filteredCareers = [];
    // Resetear el estado de validación del campo carrera
    this.form.get('career')?.markAsUntouched();
    this.form.get('career')?.setErrors(null);
  }

  getDepartmentCareers(departmentValue: string): string[] {
    const dept = this.allDepartments.find(d => d.value === departmentValue);
    return dept ? dept.careers : [];
  }

  onCareerSearch(event: any) {
    this.searchTerm = event.target.value;
    this.showCareerDropdown = true;
    
    // Marcar el campo como touched para activar validaciones
    this.form.get('career')?.markAsTouched();
    
    if (this.searchTerm.trim() === '') {
      this.filteredCareers = [];
      this.form.patchValue({ career: '' });
      // Si está vacío, establecer error de required
      this.form.get('career')?.setErrors({ required: true });
      return;
    }

    const careers = this.getDepartmentCareers(this.selectedDepartment);
    this.filteredCareers = careers.filter(career => 
      career.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    // Validación instantánea: verificar si el valor escrito coincide exactamente con una carrera
    const exactMatch = careers.find(career => 
      career.toLowerCase() === this.searchTerm.toLowerCase()
    );
    
    if (exactMatch) {
      this.form.patchValue({ career: exactMatch });
      this.form.get('career')?.setErrors(null);
    } else {
      this.form.patchValue({ career: this.searchTerm });
      this.form.get('career')?.setErrors({ invalidCareer: true });
    }
  }

  toggleCareerDropdown() {
    this.showCareerDropdown = !this.showCareerDropdown;
    if (this.showCareerDropdown) {
      const careers = this.getDepartmentCareers(this.selectedDepartment);
      this.filteredCareers = careers;
    }
  }

  selectCareer(career: string) {
    this.form.patchValue({ career: career });
    this.searchTerm = career;
    this.filteredCareers = [];
    this.showCareerDropdown = false;
    this.form.get('career')?.markAsTouched();
    this.form.get('career')?.setErrors(null);
  }

  onCareerInputFocus() {
    // Marcar el campo como touched para activar validaciones
    this.form.get('career')?.markAsTouched();
    
    if (this.selectedDepartment) {
      this.showCareerDropdown = true;
      const careers = this.getDepartmentCareers(this.selectedDepartment);
      this.filteredCareers = careers;
    }
  }

  onCareerInputBlur() {
    // Pequeño delay para permitir que el clic en las opciones funcione
    setTimeout(() => {
      this.showCareerDropdown = false;
    }, 200);
  }

  // Método para validar si la carrera es válida
  isCareerValid(): boolean {
    if (!this.selectedDepartment || !this.searchTerm.trim()) {
      return false;
    }
    const careers = this.getDepartmentCareers(this.selectedDepartment);
    return careers.some(career => 
      career.toLowerCase() === this.searchTerm.toLowerCase()
    );
  }

  // Método para obtener el mensaje de error de carrera
  getCareerErrorMessage(): string {
    if (this.form.get('career')?.hasError('invalidCareer')) {
      return 'La carrera ingresada no es válida para este departamento.';
    }
    return '';
  }

  onSubmit() {
    this.successMsg = '';
    this.errorMsg = '';
    if (this.form.invalid) return;
    this.loading = true;
    this.http.post(`${environment.apiBaseUrl}/InternshipOffer`, this.form.value).subscribe({
      next: () => {
        this.successMsg = '¡Oferta de pasantía publicada exitosamente!';
        this.form.reset();
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Error al publicar la oferta.';
        this.loading = false;
      }
    });
  }
}