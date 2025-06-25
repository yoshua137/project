import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../shared/services/auth.service';

interface AgreementRequest {
  id: number;
  organizationId: string;
  organizationName: string;
  directorId: string;
  directorName: string;
  requestDate: string;
  reviewDate?: string;
  status: string;
  description: string;
  pdfFilePath: string;
}

interface ReviewRequest {
  agreementRequestId: number;
  decision: string;
  comments?: string;
}

@Component({
  selector: 'app-agreement-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agreement-review.component.html',
  styles: ''
})
export class AgreementReviewComponent implements OnInit {
  agreementRequests: AgreementRequest[] = [];
  loading = false;
  reviewing = false;
  selectedRequest: AgreementRequest | null = null;
  reviewComments = '';
  currentUserId = '';

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getClaims().userID;
    this.loadAgreementRequests();
  }

  loadAgreementRequests() {
    this.loading = true;
    this.http.get<AgreementRequest[]>(`${environment.apiBaseUrl}/AgreementRequest/director/${this.currentUserId}`).subscribe({
      next: (requests) => {
        this.agreementRequests = requests;
        this.loading = false;
      },
      error: (err) => {
        this.toastr.error('Error al cargar las solicitudes de convenio', 'Error');
        this.loading = false;
      }
    });
  }

  selectRequest(request: AgreementRequest) {
    this.selectedRequest = request;
    this.reviewComments = '';
  }

  reviewAgreement(decision: 'Accepted' | 'Rejected') {
    if (!this.selectedRequest) {
      this.toastr.error('Debe seleccionar una solicitud para revisar', 'Error');
      return;
    }

    this.reviewing = true;
    const reviewRequest: ReviewRequest = {
      agreementRequestId: this.selectedRequest.id,
      decision: decision,
      comments: this.reviewComments.trim() || undefined
    };

    this.http.put<AgreementRequest>(`${environment.apiBaseUrl}/AgreementRequest/review`, reviewRequest).subscribe({
      next: (response) => {
        this.toastr.success(
          `Solicitud ${decision === 'Accepted' ? 'aceptada' : 'rechazada'} correctamente`, 
          'Revisión Completada'
        );
        this.selectedRequest = null;
        this.reviewComments = '';
        this.loadAgreementRequests(); // Recargar lista
        this.reviewing = false;
      },
      error: (err) => {
        this.toastr.error('Error al procesar la revisión: ' + (err.error?.message || err.statusText), 'Error');
        this.reviewing = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'text-warning';
      case 'Accepted': return 'text-success';
      case 'Rejected': return 'text-danger';
      default: return 'text-muted';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'Pending': return 'Pendiente';
      case 'Accepted': return 'Aceptado';
      case 'Rejected': return 'Rechazado';
      default: return status;
    }
  }

  canReview(request: AgreementRequest): boolean {
    return request.status === 'Pending';
  }

  downloadPdf(pdfFilePath: string) {
    // Usar el endpoint autorizado para descargar PDF
    const url = `${environment.apiBaseUrl}/AgreementRequest/pdf/${pdfFilePath}`;
    
    // Crear un enlace temporal para descargar el archivo
    const link = document.createElement('a');
    link.href = url;
    link.download = pdfFilePath;
    link.target = '_blank';
    
    // Agregar el token de autorización
    const token = this.authService.getToken();
    if (token) {
      // Para descargas con autorización, necesitamos usar fetch
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Error al descargar el archivo');
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfFilePath;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastr.success('PDF descargado correctamente', 'Descarga Exitosa');
      })
      .catch(error => {
        this.toastr.error('Error al descargar el PDF: ' + error.message, 'Error');
      });
    } else {
      this.toastr.error('No se encontró el token de autorización', 'Error');
    }
  }
} 