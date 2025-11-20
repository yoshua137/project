import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { ApplyInternshipModalComponent } from './apply-internship-modal.component';
import { ToastrService } from 'ngx-toastr';

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
  vacancies: string;
}

@Component({
  selector: 'app-ver-ofertas-pasantia',
  standalone: true,
  imports: [CommonModule, FormsModule, ApplyInternshipModalComponent],
  templateUrl: './ver-ofertas-pasantia.component.html'
})
export class VerOfertasPasantiaComponent implements OnInit {
  internshipOffers: InternshipOffer[] = [];
  searchTerm = '';
  selectedCareer = '';
  careers: string[] = [];
  loading: boolean = false;
  error: string = '';
  showOnlyAvailable: boolean = false;
  
  // Modal properties
  showApplyModal = false;
  selectedOffer: InternshipOffer | null = null;
  appliedOffers: Set<number> = new Set();

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadInternshipOffers();
    this.checkAppliedOffers();
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
    let offers = this.internshipOffers.filter(offer => {
      const matchesSearch = !this.searchTerm || 
        offer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.career.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.organizationName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCareer = !this.selectedCareer || offer.career === this.selectedCareer;
      return matchesSearch && matchesCareer;
    });
    if (this.showOnlyAvailable) {
      offers = offers.filter(offer => offer.vacancies === 'DISPONIBLES');
    }
    return offers;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCareer = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });
  }

  // Modal methods
  openApplyModal(offer: InternshipOffer): void {
    // Allow opening the modal even if already applied to trigger the toaster message
    this.selectedOffer = offer;
    this.showApplyModal = true;
  }

  closeApplyModal(): void {
    this.showApplyModal = false;
    this.selectedOffer = null;
  }

  onApplicationSubmitted(): void {
    // El toastr ya se muestra en el modal, no es necesario duplicarlo aquí
    this.closeApplyModal();
    // Refresh the page to reload all data from server
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  checkAppliedOffers(): void {
    // Check which offers the current student has already applied to
    this.internshipOffers.forEach(offer => {
      this.http.get<boolean>(`${environment.apiBaseUrl}/InternshipOffer/${offer.id}/has-applied`)
        .subscribe({
          next: (hasApplied) => {
            if (hasApplied) {
              this.appliedOffers.add(offer.id);
            }
          },
          error: (err) => {
            console.error('Error checking application status:', err);
          }
        });
    });
  }

  hasAppliedToOffer(offerId: number): boolean {
    return this.appliedOffers.has(offerId);
  }
} 