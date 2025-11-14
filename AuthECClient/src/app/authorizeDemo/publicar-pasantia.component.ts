import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface ApprovedDirector {
  directorId: string;
  directorName: string;
  department: string;
  career: string;
}

@Component({
  selector: 'app-publicar-pasantia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './publicar-pasantia.component.html',
  styles: ''
})
export class PublicarPasantiaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';
  selectedDepartment: string = '';
  selectedDirector: ApprovedDirector | null = null;
  loadingDepartments = true;
  hasApprovedAgreements = false;
  searchTerm: string = '';
  filteredCareers: string[] = [];
  showCareerDropdown: boolean = false;
  selectedRequirements: string[] = [];
  customRequirementInput: string = '';
  canAddCustomRequirementFlag: boolean = false;
  editingRequirementIndex: number | null = null;
  editingRequirementValue: string = '';
  predefinedRequirements = ['Hoja de vida(Curriculum Vitae)', 'Entrevistas'];
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

  approvedDirectors: ApprovedDirector[] = [];
  isCareerReadOnly = false;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient, 
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
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
    this.loadApprovedDirectors();
  }

  loadApprovedDirectors() {
    this.http.get<ApprovedDirector[]>(`${environment.apiBaseUrl}/AgreementRequest/organization/approved-directors`).subscribe({
      next: (directors) => {
        this.approvedDirectors = directors;
        this.hasApprovedAgreements = directors.length > 0;
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('Error loading approved directors:', err);
        this.loadingDepartments = false;
        this.hasApprovedAgreements = false;
      }
    });
  }

  selectDirector(director: ApprovedDirector) {
    this.selectedDirector = director;
    this.selectedDepartment = director.department;
    this.searchTerm = director.career;
    this.form.patchValue({ career: director.career });
    this.form.get('career')?.setErrors(null);
    this.form.get('career')?.markAsTouched();
    this.isCareerReadOnly = true;
  }

  resetSelection() {
    this.selectedDirector = null;
    this.selectedDepartment = '';
    this.searchTerm = '';
    this.form.patchValue({ career: '' });
    this.form.get('career')?.setErrors(null);
    this.form.get('career')?.markAsUntouched();
    this.isCareerReadOnly = false;
  }

  getDepartmentCareers(departmentValue: string): string[] {
    const dept = this.allDepartments.find(d => d.value === departmentValue);
    return dept ? dept.careers : [];
  }

  onCareerSearch(event: any) {
    if (this.isCareerReadOnly) {
      return;
    }
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
    if (this.isCareerReadOnly) {
      return;
    }
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
    if (this.isCareerReadOnly) {
      return;
    }
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
    if (this.isCareerReadOnly && this.selectedDirector) {
      return true;
    }
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

  // Inserta texto de requisito predefinido en el campo requirements
  insertRequirement(text: string) {
    // Verificar si el requisito ya está seleccionado
    if (this.selectedRequirements.includes(text)) {
      return;
    }
    
    // Agregar al array de requisitos seleccionados
    this.selectedRequirements.push(text);
    this.updateRequirementsField();
  }

  // Agrega un requisito personalizado
  addCustomRequirement() {
    const trimmed = this.customRequirementInput.trim();
    if (trimmed.length === 0) return;
    
    // Verificar si el requisito ya está seleccionado
    if (this.selectedRequirements.includes(trimmed)) {
      this.customRequirementInput = '';
      return;
    }
    
    // Agregar al array de requisitos seleccionados
    this.selectedRequirements.push(trimmed);
    this.customRequirementInput = '';
    this.updateRequirementsField();
  }

  // Elimina un requisito del array
  removeRequirement(text: string) {
    // Si estaba editando este requisito, cancelar la edición primero
    if (this.editingRequirementIndex !== null) {
      const requirementBeingEdited = this.selectedRequirements[this.editingRequirementIndex];
      if (requirementBeingEdited === text) {
        this.cancelEditRequirement();
      }
    }
    
    this.selectedRequirements = this.selectedRequirements.filter(req => req !== text);
    this.updateRequirementsField();
    
    // Ajustar el índice de edición si es necesario
    if (this.editingRequirementIndex !== null && this.editingRequirementIndex >= this.selectedRequirements.length) {
      this.cancelEditRequirement();
    }
  }

  // Inicia la edición de un requisito personalizado
  startEditRequirement(index: number) {
    const requirement = this.selectedRequirements[index];
    // Solo permitir editar requisitos personalizados (no predefinidos)
    if (this.predefinedRequirements.includes(requirement)) {
      return;
    }
    this.editingRequirementIndex = index;
    this.editingRequirementValue = requirement;
  }

  // Guarda la edición de un requisito
  saveEditRequirement() {
    if (this.editingRequirementIndex === null) return;
    
    const trimmed = this.editingRequirementValue.trim();
    if (trimmed.length === 0) {
      // Si está vacío, eliminar el requisito
      this.removeRequirement(this.selectedRequirements[this.editingRequirementIndex]);
      this.cancelEditRequirement();
      return;
    }
    
    // Verificar si el nuevo texto ya existe (excepto el que estamos editando)
    const exists = this.selectedRequirements.some((req, idx) => 
      req === trimmed && idx !== this.editingRequirementIndex
    );
    
    if (exists) {
      this.cancelEditRequirement();
      return;
    }
    
    // Actualizar el requisito
    this.selectedRequirements[this.editingRequirementIndex] = trimmed;
    this.updateRequirementsField();
    this.cancelEditRequirement();
  }

  // Cancela la edición de un requisito
  cancelEditRequirement() {
    this.editingRequirementIndex = null;
    this.editingRequirementValue = '';
  }

  // Verifica si un requisito es personalizado (editable)
  isCustomRequirement(requirement: string): boolean {
    return !this.predefinedRequirements.includes(requirement);
  }

  // Verifica si un requisito está siendo editado
  isEditingRequirement(index: number): boolean {
    return this.editingRequirementIndex === index;
  }

  // Actualiza el campo del formulario con los requisitos seleccionados
  updateRequirementsField() {
    const control = this.form.get('requirements');
    if (!control) return;
    
    // Formatear los requisitos como texto separado por comas
    const formatted = this.selectedRequirements.join(', ');
    control.setValue(formatted);
    control.markAsTouched();
  }

  // Verifica si un requisito está seleccionado
  isRequirementSelected(text: string): boolean {
    return this.selectedRequirements.includes(text);
  }

  // Verifica si hay requisitos personalizados seleccionados
  hasCustomRequirements(): boolean {
    return this.selectedRequirements.some(req => this.isCustomRequirement(req));
  }

  // Verifica si el input de requisito personalizado tiene contenido válido
  canAddCustomRequirement(): boolean {
    return this.canAddCustomRequirementFlag;
  }

  // Maneja los cambios en el input de requisito personalizado
  onCustomRequirementInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = target.value || '';
    this.customRequirementInput = newValue;
    // Actualizar el flag basado en si hay contenido válido
    this.canAddCustomRequirementFlag = !!(newValue && newValue.trim().length > 0);
    // Forzar detección de cambios inmediata
    this.cdr.detectChanges();
  }

  // Maneja la tecla Enter en el input de requisito personalizado
  onCustomRequirementKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomRequirement();
    }
  }

  // Maneja la tecla Enter en el input de edición
  onEditRequirementKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEditRequirement();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditRequirement();
    }
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
        this.selectedRequirements = [];
        this.customRequirementInput = '';
        this.canAddCustomRequirementFlag = false;
        this.cancelEditRequirement();
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Error al publicar la oferta.';
        this.loading = false;
      }
    });
  }
}