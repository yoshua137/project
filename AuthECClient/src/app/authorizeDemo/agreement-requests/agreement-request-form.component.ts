import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

interface Director {
  id: string;
  fullName: string;
  gender: string;
  dob: string;
  department: string;
  career: string | null;
}

@Component({
  selector: 'app-agreement-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agreement-request-form.component.html',
  styles: ''
})
export class AgreementRequestFormComponent implements OnInit {
  director: Director | null = null;
  loading = true;
  requestDescription = '';
  requestPdfFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    const directorId = this.route.snapshot.paramMap.get('directorId');
    if (directorId) {
      this.http.get<Director[]>(`${environment.apiBaseUrl}/Director`).subscribe({
        next: (directors) => {
          this.director = directors.find(d => d.id === directorId) || null;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  onPdfFileChange(event: any) {
    const file = event.target.files && event.target.files[0];
    this.requestPdfFile = file;
  }

  submitAgreementRequest() {
    if (!this.director || !this.requestDescription || this.requestDescription.length < 20 || !this.requestPdfFile) {
      this.toastr.error('Debe completar todos los campos y la descripción debe tener al menos 20 caracteres.', 'Error de Validación');
      return;
    }
    if (this.requestPdfFile.type !== 'application/pdf') {
      this.toastr.error('Solo se permiten archivos PDF.', 'Error de Validación');
      return;
    }
    if (this.requestPdfFile.size > 10 * 1024 * 1024) {
      this.toastr.error('El archivo PDF no puede ser mayor a 10MB.', 'Error de Validación');
      return;
    }
    const formData = new FormData();
    formData.append('DirectorId', this.director.id);
    formData.append('Description', this.requestDescription);
    formData.append('PdfFile', this.requestPdfFile);
    this.http.post(`${environment.apiBaseUrl}/AgreementRequest`, formData).subscribe({
      next: () => {
        this.toastr.success('Solicitud de convenio enviada correctamente.', 'Solicitud Enviada');
        this.router.navigate(['/agreement-requests']);
      },
      error: (err) => {
        this.toastr.error('Error al enviar la solicitud: ' + (err.error?.message || err.statusText), 'Error');
      }
    });
  }

  backToDirectors() {
    this.router.navigate(['/agreement-requests']);
  }
} 