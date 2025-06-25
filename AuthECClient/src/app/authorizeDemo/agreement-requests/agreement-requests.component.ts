import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

interface Director {
  id: string;
  fullName: string;
  gender: string;
  dob: string;
  department: string;
  career: string | null;
}

@Component({
  selector: 'app-agreement-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agreement-requests.component.html',
  styles: ''
})
export class AgreementRequestsComponent {
  departments = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      image: 'assets/health.jpg'
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingenieria y Ciencias Exactas',
      image: 'assets/engineering.jpg'
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      image: 'assets/social.jpg'
    },
    {
      name: 'Administración y Economía',
      value: 'Administracion y Economia',
      image: 'assets/economy.jpg'
    }
  ];
  selectedDepartment: string | null = null;
  directors: Director[] = [];
  loadingDirectors = false;
  selectedDirector: Director | null = null;
  showRequestForm = false;
  requestDescription = '';
  requestPdfFile: File | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  selectDepartment(dep: string) {
    this.selectedDepartment = dep;
    this.directors = [];
    this.loadDirectors(dep);
  }

  loadDirectors(department: string) {
    this.loadingDirectors = true;
    this.http.get<Director[]>(`${environment.apiBaseUrl}/Director`).subscribe({
      next: (directors) => {
        this.directors = directors.filter(d => d.department === department);
        this.loadingDirectors = false;
      },
      error: () => {
        this.directors = [];
        this.loadingDirectors = false;
      }
    });
  }

  backToDepartments() {
    this.selectedDepartment = null;
    this.directors = [];
  }

  selectDirector(director: Director) {
    this.router.navigate(['/agreement-requests/new', director.id]);
  }

  onPdfFileChange(event: any) {
    const file = event.target.files && event.target.files[0];
    this.requestPdfFile = file;
  }

  submitAgreementRequest() {
    if (!this.selectedDirector || !this.requestDescription || this.requestDescription.length < 20 || !this.requestPdfFile) {
      alert('Debe completar todos los campos y la descripción debe tener al menos 20 caracteres.');
      return;
    }
    if (this.requestPdfFile.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }
    if (this.requestPdfFile.size > 10 * 1024 * 1024) {
      alert('El archivo PDF no puede ser mayor a 10MB.');
      return;
    }
    const formData = new FormData();
    formData.append('DirectorId', this.selectedDirector.id);
    formData.append('Description', this.requestDescription);
    formData.append('PdfFile', this.requestPdfFile);
    this.http.post(`${environment.apiBaseUrl}/AgreementRequest`, formData).subscribe({
      next: () => {
        alert('Solicitud de convenio enviada correctamente.');
        this.showRequestForm = false;
        this.selectedDirector = null;
      },
      error: (err) => {
        alert('Error al enviar la solicitud: ' + (err.error?.message || err.statusText));
      }
    });
  }

  cancelAgreementRequest() {
    this.showRequestForm = false;
    this.selectedDirector = null;
    this.requestDescription = '';
    this.requestPdfFile = null;
  }
} 