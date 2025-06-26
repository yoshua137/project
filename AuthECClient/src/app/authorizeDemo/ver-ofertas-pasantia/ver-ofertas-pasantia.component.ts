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
  contactEmail: string;
  contactPhone: string;
}

@Component({
  selector: 'app-ver-ofertas-pasantia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ver-ofertas-pasantia.component.html'
})
export class VerOfertasPasantiaComponent implements OnInit {
  internshipOffers: InternshipOffer[] = [];
  filteredOffers: InternshipOffer[] = [];
  selectedCareer: string = '';
  careers: string[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadInternshipOffers();
  }

  loadInternshipOffers(): void {
    this.loading = true;
    this.error = '';

    this.http.get<InternshipOffer[]>(`${environment.apiBaseUrl}/InternshipOffer`)
      .subscribe({
        next: (offers) => {
          this.internshipOffers = offers;
          this.filteredOffers = offers;
          this.extractCareers();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las ofertas de pasantía';
          this.loading = false;
          console.error('Error loading internship offers:', err);
        }
      });
  }

  extractCareers(): void {
    const uniqueCareers = new Set(this.internshipOffers.map(offer => offer.career));
    this.careers = Array.from(uniqueCareers).sort();
  }

  filterByCareer(): void {
    if (!this.selectedCareer) {
      this.filteredOffers = this.internshipOffers;
    } else {
      this.filteredOffers = this.internshipOffers.filter(offer => 
        offer.career.toLowerCase() === this.selectedCareer.toLowerCase()
      );
    }
  }

  clearFilter(): void {
    this.selectedCareer = '';
    this.filteredOffers = this.internshipOffers;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }
} 