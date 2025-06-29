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

  deleteOffer(offerId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta oferta de pasantía?')) {
      this.http.delete(`${environment.apiBaseUrl}/InternshipOffer/${offerId}`)
        .subscribe({
          next: () => {
            this.offers = this.offers.filter(offer => offer.id !== offerId);
          },
          error: (err) => {
            console.error('Error deleting offer:', err);
            alert('Error al eliminar la oferta');
          }
        });
    }
  }
} 