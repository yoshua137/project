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
  modalidades = [
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Presencial', label: 'Presencial' },
    { value: 'Mixto', label: 'Mixto' }
  ];

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
      mode: ['', Validators.required]
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