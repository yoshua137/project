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
  searchTerm = '';
  selectedCareer = '';
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

  get filteredOffers(): InternshipOffer[] {
    return this.internshipOffers.filter(offer => {
      const matchesSearch = !this.searchTerm || 
        offer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.career.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.organizationName.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCareer = !this.selectedCareer || offer.career === this.selectedCareer;
      
      return matchesSearch && matchesCareer;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCareer = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }
} 