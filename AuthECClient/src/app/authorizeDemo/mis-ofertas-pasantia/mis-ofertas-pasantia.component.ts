import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';

interface InternshipOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  startDate: string;
  endDate: string;
  organizationId: string;
  organizationName: string;
  mode: string;
  career: string;
  contactEmail?: string;
  contactPhone?: string;
  vacancies: string;
}

interface InternshipApplication {
  id: number;
  internshipOfferId: number;
  internshipOfferTitle: string;
  organizationName: string;
  studentId: string;
  studentName: string;
  studentCareer: string;
  applicationDate: string;
  status: string;
  coverLetter?: string;
  cvFilePath?: string;
  reviewDate?: string;
  reviewNotes?: string;
  virtualMeetingLink?: string;
}

@Component({
  selector: 'app-mis-ofertas-pasantia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ofertas-pasantia.component.html',
  styleUrls: ['./mis-ofertas-pasantia.component.css']
})
export class MisOfertasPasantiaComponent implements OnInit {
  offers: InternshipOffer[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  selectedCareer = '';
  editingOffer: InternshipOffer | null = null;
  editForm: any = {};
  editLoading = false;
  editError = '';
  editSuccess = '';
  
  // Propiedades para el modal de eliminación
  deletingOffer: InternshipOffer | null = null;
  deleteLoading = false;
  deleteError = '';
  deleteSuccess = '';
  
  // Propiedades para el modal de postulantes
  viewingApplicants: InternshipOffer | null = null;
  applicants: InternshipApplication[] = [];
  applicantsLoading = false;
  applicantsError = '';
  
  // Propiedades para el modal de revisión
  reviewingApplication: InternshipApplication | null = null;
  reviewAction: string = '';
  reviewNotes: string = '';
  virtualMeetingLink: string = '';
  reviewLoading = false;
  reviewError = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMyOffers();
  }

  loadMyOffers(): void {
    this.loading = true;
    this.error = '';

    this.http.get<InternshipOffer[]>(`${environment.apiBaseUrl}/InternshipOffer/my-offers`)
      .subscribe({
        next: (data) => {
          this.offers = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading offers:', err);
          this.error = 'Error al cargar las ofertas de pasantía';
          this.loading = false;
        }
      });
  }

  get filteredOffers(): InternshipOffer[] {
    return this.offers.filter(offer => {
      const matchesSearch = !this.searchTerm || 
        offer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.career.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCareer = !this.selectedCareer || offer.career === this.selectedCareer;
      
      return matchesSearch && matchesCareer;
    });
  }

  get uniqueCareers(): string[] {
    return [...new Set(this.offers.map(offer => offer.career))];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusBadgeClass(offer: InternshipOffer): string {
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    const today = new Date();

    if (today < startDate) {
      return 'bg-blue-100 text-blue-800';
    } else if (today >= startDate && today <= endDate) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(offer: InternshipOffer): string {
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    const today = new Date();

    if (today < startDate) {
      return 'Próximamente';
    } else if (today >= startDate && today <= endDate) {
      return 'Activa';
    } else {
      return 'Finalizada';
    }
  }

  // Métodos para el modal de confirmación de eliminación
  openDeleteModal(offer: InternshipOffer): void {
    this.deletingOffer = { ...offer };
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteLoading = false;
  }

  closeDeleteModal(): void {
    this.deletingOffer = null;
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteLoading = false;
  }

  confirmDelete(): void {
    if (!this.deletingOffer) return;
    
    this.deleteLoading = true;
    this.deleteError = '';
    this.deleteSuccess = '';
    
    this.http.delete(`${environment.apiBaseUrl}/InternshipOffer/${this.deletingOffer.id}`)
      .subscribe({
        next: () => {
          this.deleteSuccess = 'Oferta eliminada correctamente';
          // Eliminar la oferta de la lista local
          this.offers = this.offers.filter(offer => offer.id !== this.deletingOffer!.id);
          setTimeout(() => this.closeDeleteModal(), 1000);
        },
        error: (err) => {
          console.error('Error deleting offer:', err);
          this.deleteError = err.error?.message || 'Error al eliminar la oferta';
          this.deleteLoading = false;
        }
      });
  }

  openEditModal(offer: InternshipOffer): void {
    this.editingOffer = { ...offer };
    this.editForm = {
      ...offer,
      startDate: offer.startDate ? offer.startDate.substring(0, 10) : '',
      endDate: offer.endDate ? offer.endDate.substring(0, 10) : '',
      vacancies: offer.vacancies
    };
    this.editError = '';
    this.editSuccess = '';
    this.editLoading = false;
  }

  closeEditModal(): void {
    this.editingOffer = null;
    this.editForm = {};
    this.editError = '';
    this.editSuccess = '';
    this.editLoading = false;
  }

  submitEdit(): void {
    if (!this.editingOffer) return;
    this.editLoading = true;
    this.editError = '';
    this.editSuccess = '';
    const body = {
      title: this.editForm.title,
      description: this.editForm.description,
      requirements: this.editForm.requirements,
      startDate: new Date(this.editForm.startDate).toISOString(),
      endDate: new Date(this.editForm.endDate).toISOString(),
      mode: this.editForm.mode,
      career: this.editForm.career,
      contactEmail: this.editForm.contactEmail,
      contactPhone: this.editForm.contactPhone,
      vacancies: this.editForm.vacancies
    };
    this.http.put(`${environment.apiBaseUrl}/InternshipOffer/${this.editingOffer.id}`, body)
      .subscribe({
        next: () => {
          this.editSuccess = 'Oferta actualizada correctamente';
          // Actualizar la oferta en la lista local
          const idx = this.offers.findIndex(o => o.id === this.editingOffer!.id);
          if (idx !== -1) {
            this.offers[idx] = { ...this.editForm };
          }
          setTimeout(() => this.closeEditModal(), 1000);
        },
        error: (err) => {
          console.error('Error updating offer:', err);
          if (err.error && typeof err.error === 'string') {
            this.editError = err.error;
          } else if (err.error?.message) {
            this.editError = err.error.message;
          } else {
            this.editError = 'Error al actualizar la oferta';
          }
          this.editLoading = false;
        }
      });
  }

  // Métodos para el modal de postulantes
  openApplicantsModal(offer: InternshipOffer): void {
    this.viewingApplicants = { ...offer };
    this.applicants = [];
    this.applicantsError = '';
    this.applicantsLoading = true;
    
    // Cargar postulantes para esta oferta
    this.loadApplicants(offer.id);
  }

  closeApplicantsModal(): void {
    this.viewingApplicants = null;
    this.applicants = [];
    this.applicantsError = '';
    this.applicantsLoading = false;
  }

  loadApplicants(offerId: number): void {
    this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/offer/${offerId}`)
      .subscribe({
        next: (data) => {
          this.applicants = data;
          this.applicantsLoading = false;
        },
        error: (err) => {
          console.error('Error loading applicants:', err);
          this.applicantsError = 'Error al cargar los postulantes';
          this.applicantsLoading = false;
        }
      });
  }

  getApplicationStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENTREVISTA':
        return 'bg-blue-100 text-blue-800';
      case 'ACEPTADA':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getApplicationStatusText(status: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'ENTREVISTA':
        return 'Entrevista';
      case 'ACEPTADA':
        return 'Aceptada';
      case 'RECHAZADA':
        return 'Rechazada';
      default:
        return status;
    }
  }

  viewCV(applicationId: number): void {
    this.http.get(`${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Note: We don't revoke the URL immediately as the new tab needs it
          // The browser will clean it up when the tab is closed
        },
        error: (err) => {
          console.error('Error opening CV:', err);
          alert('Error al abrir el CV');
        }
      });
  }

  // Métodos para el modal de revisión
  openReviewModal(applicant: InternshipApplication, action: string): void {
    this.reviewingApplication = { ...applicant };
    this.reviewAction = action;
    this.reviewNotes = '';
    this.virtualMeetingLink = '';
    this.reviewError = '';
    this.reviewLoading = false;
  }

  closeReviewModal(): void {
    this.reviewingApplication = null;
    this.reviewAction = '';
    this.reviewNotes = '';
    this.virtualMeetingLink = '';
    this.reviewError = '';
    this.reviewLoading = false;
  }

  submitReview(): void {
    if (!this.reviewingApplication) return;
    
    this.reviewLoading = true;
    this.reviewError = '';
    
    const body = { 
      status: this.reviewAction, 
      reviewNotes: this.reviewNotes,
      virtualMeetingLink: this.virtualMeetingLink || null
    };
    
    this.http.put(`${environment.apiBaseUrl}/InternshipApplication/${this.reviewingApplication.id}/review`, body)
      .subscribe({
        next: () => {
          // Actualizar el estado en la lista local
          const applicant = this.applicants.find(a => a.id === this.reviewingApplication!.id);
          if (applicant) {
            applicant.status = this.reviewAction;
            applicant.reviewDate = new Date().toISOString();
            applicant.reviewNotes = this.reviewNotes;
          }
          this.closeReviewModal();
        },
        error: (err) => {
          console.error('Error updating application status:', err);
          this.reviewError = err.error?.message || 'Error al actualizar el estado de la postulación';
          this.reviewLoading = false;
        }
      });
  }
} 