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
      startDate: this.editForm.startDate,
      endDate: this.editForm.endDate,
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
          this.editError = err.error?.message || 'Error al actualizar la oferta';
          this.editLoading = false;
        }
      });
  }
} 