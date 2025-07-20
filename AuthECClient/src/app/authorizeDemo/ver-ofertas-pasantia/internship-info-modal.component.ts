import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface InternshipOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  startDate: string;
  endDate: string;
  mode: string;
  career: string;
  organizationName: string;
  contactEmail?: string;
  contactPhone?: string;
  vacancies: string;
}

@Component({
  selector: 'app-internship-info-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Información de la Pasantía</h2>
          <button 
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6" *ngIf="offer">
          <!-- Loading -->
          <div *ngIf="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Error -->
          <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <!-- Offer Details -->
          <div *ngIf="!loading && !error">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ offer.title }}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-semibold text-gray-700">Organización:</span>
                  <span class="text-gray-600 ml-2">{{ offer.organizationName }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Carrera:</span>
                  <span class="text-gray-600 ml-2">{{ offer.career }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Modalidad:</span>
                  <span class="text-gray-600 ml-2">{{ offer.mode }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Vacantes:</span>
                  <span class="text-gray-600 ml-2">{{ offer.vacancies }}</span>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 mb-2">Descripción</h4>
              <p class="text-gray-700 text-sm">{{ offer.description }}</p>
            </div>

            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 mb-2">Requisitos</h4>
              <p class="text-gray-700 text-sm">{{ offer.requirements }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 class="font-semibold text-gray-900 mb-2">Fechas</h4>
                <div class="text-sm">
                  <p class="text-gray-700"><strong>Inicio:</strong> {{ formatDate(offer.startDate) }}</p>
                  <p class="text-gray-700"><strong>Fin:</strong> {{ formatDate(offer.endDate) }}</p>
                </div>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 mb-2">Contacto</h4>
                <div class="text-sm">
                  <p class="text-gray-700"><strong>Email:</strong> {{ offer.contactEmail }}</p>
                  <p class="text-gray-700"><strong>Teléfono:</strong> {{ offer.contactPhone }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button 
            (click)="close()"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class InternshipInfoModalComponent {
  @Input() isVisible = false;
  @Input() offerId: number | null = null;
  @Output() closeModal = new EventEmitter<void>();

  offer: InternshipOffer | null = null;
  loading = false;
  error = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(): void {
    if (this.isVisible && this.offerId) {
      this.loadOfferDetails();
    }
  }

  loadOfferDetails(): void {
    this.loading = true;
    this.error = '';

    this.http.get<InternshipOffer>(`${environment.apiBaseUrl}/InternshipOffer/${this.offerId}`)
      .subscribe({
        next: (data) => {
          this.offer = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading offer details:', err);
          this.error = 'Error al cargar los detalles de la oferta';
          this.loading = false;
        }
      });
  }

  close(): void {
    this.isVisible = false;
    this.offer = null;
    this.error = '';
    this.closeModal.emit();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
} 