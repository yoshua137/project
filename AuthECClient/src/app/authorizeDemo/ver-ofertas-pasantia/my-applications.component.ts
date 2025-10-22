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
    <!-- Main Content Area -->
    
    
      
        
          <h2 class="text-2xl font-bold text-blue-800 mb-6">Mis Postulaciones de Pasantía</h2>

          <!-- Loading State -->
          <div *ngIf="loading" class="flex flex-col items-center justify-center py-8">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
            <p class="text-blue-700">Cargando mis postulaciones...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center">
            {{ error }}
            <button class="ml-4 text-red-700 underline" (click)="loadApplications()">Reintentar</button>
          </div>

          <!-- Content when loaded -->
          <div *ngIf="!loading && !error" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Panel - Applications Table -->
            <div class="lg:col-span-2">
              <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-semibold text-blue-800 mb-4">Postulaciones Realizadas</h3>
                
                <div *ngIf="applications.length === 0" class="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4 rounded text-center">
                  <i class="bi bi-info-circle mr-2"></i>
                  No tienes postulaciones registradas aún.
                </div>

                <div *ngIf="applications.length > 0" class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Pasantía</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Organización</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let application of applications" 
                          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          [class.bg-blue-50]="selectedApplication?.id === application.id"
                          (click)="selectApplication(application)">
                        <td class="py-3 px-4">
                          <div>
                            <div class="font-medium text-gray-900">{{ application.internshipOfferTitle }}</div>
                            <div class="text-sm text-gray-500 truncate max-w-xs">
                              {{ application.coverLetter || 'Sin nota de postulación' }}
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-gray-700">{{ application.organizationName }}</td>
                        <td class="py-3 px-4 text-sm text-gray-600">{{ formatDate(application.applicationDate) }}</td>
                        <td class="py-3 px-4">
                          <span class="px-2 py-1 rounded-full text-xs font-semibold"
                                [ngClass]="getStatusClass(application.status)">
                            {{ getStatusText(application.status) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Right Panel - Application Details -->
            <div class="lg:col-span-1">
              <div class="bg-white rounded-lg shadow-md p-6">
                <div *ngIf="!selectedApplication" class="text-center py-8">
                  <div class="text-blue-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p class="text-gray-500">Seleccione una postulación para ver los detalles</p>
                </div>

                <div *ngIf="selectedApplication" class="space-y-4">
                  <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold text-blue-800">Detalles de la Postulación</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold"
                          [ngClass]="getStatusClass(selectedApplication.status)">
                      {{ getStatusText(selectedApplication.status) }}
                    </span>
                  </div>
                  
                  <!-- Application Info -->
                  <div class="space-y-3">
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-2">{{ selectedApplication.internshipOfferTitle }}</h4>
                      <p class="text-gray-600"><strong>Organización:</strong> {{ selectedApplication.organizationName }}</p>
                      <p class="text-gray-600"><strong>Fecha de postulación:</strong> {{ formatDate(selectedApplication.applicationDate) }}</p>
                    </div>

                    <!-- Cover Letter -->
                    <div>
                      <h5 class="font-semibold text-gray-900 mb-2">Nota de Postulación</h5>
                      <div class="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {{ selectedApplication.coverLetter || 'No proporcionada' }}
                      </div>
                    </div>

                    <!-- CV Status -->
                    <div>
                      <h5 class="font-semibold text-gray-900 mb-2">Curriculum Vitae</h5>
                      <div class="bg-gray-50 p-3 rounded text-sm text-gray-700">
                        <div *ngIf="selectedApplication.cvFilePath; else noCV">
                          <div class="flex items-center justify-between">
                            <span class="text-green-600">CV enviado</span>
                            <button 
                              (click)="downloadCV(selectedApplication.id)"
                              class="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition text-sm flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h8a2 2 0 002-2v-2M7 10V6a5 5 0 0110 0v4M5 20h14" />
                              </svg>
                              PDF
                            </button>
                          </div>
                        </div>
                        <ng-template #noCV>
                          <span class="text-gray-500">No proporcionado</span>
                        </ng-template>
                      </div>
                    </div>

                    <!-- Review Information -->
                    <div *ngIf="selectedApplication.status !== 'PENDIENTE'">
                      <h5 class="font-semibold text-gray-900 mb-2">Información de Revisión</h5>
                      <div class="bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-2">
                        <p><strong>Fecha de revisión:</strong> {{ selectedApplication.reviewDate ? formatDate(selectedApplication.reviewDate) : 'No especificada' }}</p>
                        <div>
                          <strong>Notas:</strong>
                          <p class="mt-1">{{ selectedApplication.reviewNotes || 'Sin comentarios' }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="pt-4 border-t border-gray-200 space-y-2">
                      <button 
                        [disabled]="selectedApplication.status === 'RECHAZADA'"
                        [ngClass]="selectedApplication.status === 'RECHAZADA' ? 
                          'w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed' : 
                          'w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition'">
                        Ver Detalles de Entrevista
                      </button>
                      <button 
                        (click)="showMoreInfo(selectedApplication.internshipOfferId)"
                        class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                        Ver Detalles de la Oferta
                      </button>
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
  `,
  styles: []
})
export class MyApplicationsComponent implements OnInit {
  applications: InternshipApplication[] = [];
  loading = false;
  error = '';
  showInfoModal = false;
  selectedOfferId: number | null = null;
  selectedApplication: InternshipApplication | null = null;

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

  selectApplication(application: InternshipApplication): void {
    this.selectedApplication = application;
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