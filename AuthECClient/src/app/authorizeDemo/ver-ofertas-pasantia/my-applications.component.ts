import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { InternshipInfoModalComponent } from './internship-info-modal.component';

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
}

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule, InternshipInfoModalComponent],
  template: `
    <div class="w-full max-w-6xl mx-auto">
      <h2 class="mb-8 text-2xl font-bold text-green-700 text-center">Mis Pasantías</h2>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex flex-col items-center justify-center py-8">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-2"></div>
        <p class="text-green-700">Cargando mis pasantías...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center">
        {{ error }}
        <button class="ml-4 text-red-700 underline" (click)="loadApplications()">Reintentar</button>
      </div>

      <!-- Pasantías List -->
      <div *ngIf="!loading && !error" class="space-y-6">
        <div *ngIf="applications.length === 0" class="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4 rounded text-center">
          <i class="bi bi-info-circle mr-2"></i>
          No tienes pasantías registradas aún.
        </div>

        <div *ngFor="let application of applications" class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ application.internshipOfferTitle }}</h3>
              <p class="text-gray-600 mb-1"><strong>Organización:</strong> {{ application.organizationName }}</p>
            </div>
            <div class="flex flex-col items-end">
              <span class="px-3 py-1 rounded-full text-sm font-semibold"
                    [ngClass]="getStatusClass(application.status)">
                {{ getStatusText(application.status) }}
              </span>
              <p class="text-xs text-gray-500 mt-1">{{ formatDate(application.applicationDate) }}</p>
            </div>
          </div>

          <!-- Application Details -->
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-gray-900 mb-2">Carta de Presentación</h4>
              <div class="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                {{ application.coverLetter || 'No proporcionada' }}
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900 mb-2">Curriculum Vitae</h4>
              <div class="bg-gray-50 p-3 rounded text-sm text-gray-700">
                <div *ngIf="application.cvFilePath; else noCV">
                  <div class="flex justify-between items-center">
                    <div>
                      <span class="text-green-600">CV enviado</span>
                      <button 
                        (click)="downloadCV(application.id)"
                        class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition border border-gray-300 ml-2"
                        title="Ver PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h8a2 2 0 002-2v-2M7 10V6a5 5 0 0110 0v4M5 20h14" />
                        </svg>
                        PDF
                      </button>
                    </div>
                    <button 
                      (click)="showMoreInfo(application.internshipOfferId)"
                      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
                      Más Info
                    </button>
                  </div>
                </div>
                <ng-template #noCV>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-500">No proporcionado</span>
                    <button 
                      (click)="showMoreInfo(application.internshipOfferId)"
                      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
                      Más Info
                    </button>
                  </div>
                </ng-template>
              </div>
            </div>
          </div>

          <!-- Review Information -->
          <div *ngIf="application.status !== 'PENDIENTE'" class="mt-4 pt-4 border-t border-gray-200">
            <h4 class="font-semibold text-gray-900 mb-2">Información de Revisión</h4>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">
                  <strong>Fecha de revisión:</strong> 
                  {{ application.reviewDate ? formatDate(application.reviewDate) : 'No especificada' }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">
                  <strong>Notas:</strong>
                </p>
                <div class="bg-gray-50 p-3 rounded text-sm text-gray-700 mt-1">
                  {{ application.reviewNotes || 'Sin comentarios' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Modal -->
      <app-internship-info-modal
        [isVisible]="showInfoModal"
        [offerId]="selectedOfferId"
        (closeModal)="closeInfoModal()">
      </app-internship-info-modal>
    </div>
  `,
  styles: []
})
export class MyApplicationsComponent implements OnInit {
  applications: InternshipApplication[] = [];
  loading = false;
  error = '';
  showInfoModal = false;
  selectedOfferId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.error = '';

    this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/my-applications`)
      .subscribe({
        next: (data) => {
          this.applications = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading pasantías:', err);
          this.error = 'Error al cargar mis pasantías';
          this.loading = false;
        }
      });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-BO', { 
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACEPTADA':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'PENDIENTE';
      case 'ACEPTADA':
        return 'ACEPTADA';
      case 'RECHAZADA':
        return 'RECHAZADA';
      default:
        return status;
    }
  }

  downloadCV(applicationId: number): void {
    this.http.get(`${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv/student`, {
      responseType: 'blob'
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  showMoreInfo(offerId: number): void {
    this.selectedOfferId = offerId;
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
    this.selectedOfferId = null;
  }
} 