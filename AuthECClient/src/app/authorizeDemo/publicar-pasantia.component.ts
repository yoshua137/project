import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-publicar-pasantia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './publicar-pasantia.component.html',
  styles: ''
})
export class PublicarPasantiaComponent {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      requirements: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
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