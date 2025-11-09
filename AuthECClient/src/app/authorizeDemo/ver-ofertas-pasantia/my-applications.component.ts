import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { InternshipInfoModalComponent } from './internship-info-modal.component';
import { ToastrService } from 'ngx-toastr';
import { SignalRService } from '../../shared/services/signalr.service';
import { Subscription } from 'rxjs';

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
  interviewDateTime?: string;
  interviewMode?: string;
  interviewLink?: string;
  interviewAddress?: string;
  interviewAttendanceConfirmed?: boolean | number | null;
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
                  
                  <!-- Application Info - Basic Info (Always Visible) -->
                  <div class="space-y-3">
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-2">{{ selectedApplication.internshipOfferTitle }}</h4>
                      <p class="text-gray-600"><strong>Organización:</strong> {{ selectedApplication.organizationName }}</p>
                      <p class="text-gray-600"><strong>Fecha de postulación:</strong> {{ formatDate(selectedApplication.applicationDate) }}</p>
                    </div>

                    <!-- Show More/Less Button -->
                    <button 
                      (click)="toggleDetailsExpansion()"
                      class="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm font-medium border border-blue-200">
                      <span>{{ isDetailsExpanded ? 'Mostrar menos' : 'Mostrar más' }}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        class="h-4 w-4 transition-transform duration-200"
                        [class.rotate-180]="isDetailsExpanded"
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <!-- Expanded Details (Hidden by default) -->
                    <div *ngIf="isDetailsExpanded" class="space-y-3 pt-2 border-t border-gray-200">
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

                    </div>
                  </div>

                  <!-- Action Buttons (Always Visible) -->
                  <div class="pt-4 border-t border-gray-200 space-y-2 mt-4">
                      <button 
                        (click)="showInterviewDetails()"
                        [disabled]="!hasInterviewScheduled()"
                        [ngClass]="hasInterviewScheduled() ? 
                          'w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition' :
                          'w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed'">
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
        
      
    

    <!-- Info Modal -->
    <app-internship-info-modal
      [isVisible]="showInfoModal"
      [offerId]="selectedOfferId"
      (closeModal)="closeInfoModal()">
    </app-internship-info-modal>

    <!-- Interview Details Modal -->
    <div *ngIf="showInterviewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de la Entrevista</h2>
          <button 
            (click)="closeInterviewModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6" *ngIf="selectedApplication">
          <div class="space-y-4">
            <!-- Interview Date and Time -->
            <div *ngIf="selectedApplication.interviewDateTime" class="bg-blue-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Fecha y Hora</h3>
              <p class="text-gray-700">{{ formatDate(selectedApplication.interviewDateTime) }}</p>
            </div>

            <!-- Interview Mode -->
            <div *ngIf="selectedApplication.interviewMode" class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Modalidad</h3>
              <p class="text-gray-700">{{ selectedApplication.interviewMode }}</p>
            </div>

            <!-- Interview Link (Virtual) -->
            <div *ngIf="selectedApplication.interviewLink" class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Link de Reunión</h3>
              <a [href]="selectedApplication.interviewLink" target="_blank" class="text-blue-600 hover:underline break-all">
                {{ selectedApplication.interviewLink }}
              </a>
            </div>

            <!-- Interview Address (Presencial) -->
            <div *ngIf="selectedApplication.interviewAddress" class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Dirección</h3>
              <p class="text-gray-700">{{ selectedApplication.interviewAddress }}</p>
            </div>

            <!-- Notes -->
            <div *ngIf="selectedApplication.reviewNotes" class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Notas</h3>
              <p class="text-gray-700">{{ selectedApplication.reviewNotes }}</p>
            </div>

            <!-- Attendance Confirmation Status -->
            <div *ngIf="hasAttendanceConfirmed()" 
                 class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-blue-800 font-semibold">
                  <span *ngIf="isAttendanceConfirmed()">Ya has confirmado que asistirás a la entrevista.</span>
                  <span *ngIf="!isAttendanceConfirmed()">Ya has indicado que no asistirás a la entrevista.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer with Action Buttons -->
        <div class="flex justify-between gap-3 p-6 border-t border-gray-200">
          <button 
            (click)="closeInterviewModal()"
            class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
          <div class="flex gap-3">
            <button 
              (click)="confirmAttendance(false)"
              [disabled]="confirmingAttendance || hasAttendanceConfirmed()"
              [ngClass]="(confirmingAttendance || hasAttendanceConfirmed()) ? 
                'bg-gray-400 text-white px-6 py-2 rounded cursor-not-allowed' :
                'bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition'">
              <span *ngIf="!confirmingAttendance">No asistiré</span>
              <span *ngIf="confirmingAttendance">Guardando...</span>
            </button>
            <button 
              (click)="confirmAttendance(true)"
              [disabled]="confirmingAttendance || hasAttendanceConfirmed()"
              [ngClass]="(confirmingAttendance || hasAttendanceConfirmed()) ? 
                'bg-gray-400 text-white px-6 py-2 rounded cursor-not-allowed' :
                'bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition'">
              <span *ngIf="!confirmingAttendance">Sí asistiré</span>
              <span *ngIf="confirmingAttendance">Guardando...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class MyApplicationsComponent implements OnInit, OnDestroy {
  applications: InternshipApplication[] = [];
  loading = false;
  error = '';
  showInfoModal = false;
  selectedOfferId: number | null = null;
  selectedApplication: InternshipApplication | null = null;
  isDetailsExpanded = false;
  showInterviewModal = false;
  confirmingAttendance = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private signalRService: SignalRService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.signalRService.startConnection();
    this.loadApplications();
    this.setupSignalRListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setupSignalRListeners(): void {
    // Escuchar cuando se programa una entrevista
    const interviewSub = this.signalRService.onInterviewScheduled().subscribe((notification: any) => {
      if (notification) {
        const application = this.applications.find(a => a.id === notification.applicationId);
        if (application) {
          application.status = 'ENTREVISTA';
          application.interviewDateTime = notification.interviewDateTime || undefined;
          application.interviewMode = notification.interviewMode || undefined;
          application.interviewLink = notification.interviewLink || undefined;
          application.interviewAddress = notification.interviewAddress || undefined;
          
          this.toastr.success(
            `Se ha programado una entrevista para "${notification.offerTitle}"`,
            'Entrevista Programada',
            { timeOut: 5000 }
          );
          
          // Si la aplicación seleccionada es la que cambió, actualizarla
          if (this.selectedApplication?.id === application.id) {
            this.selectedApplication = { ...application };
          }
        }
        this.signalRService.clearNotifications();
      }
    });

    // Escuchar cambios de estado de aplicación
    const statusSub = this.signalRService.onApplicationStatusChanged().subscribe((notification: any) => {
      if (notification) {
        const application = this.applications.find(a => a.id === notification.applicationId);
        if (application) {
          application.status = notification.status;
          
          const statusText = notification.status === 'ACEPTADA' ? 'aceptada' : 'rechazada';
          this.toastr.info(
            `Tu postulación a "${notification.offerTitle}" ha sido ${statusText}`,
            'Estado Actualizado',
            { timeOut: 5000 }
          );
          
          if (this.selectedApplication?.id === application.id) {
            this.selectedApplication = { ...application };
          }
        }
        this.signalRService.clearNotifications();
      }
    });

    this.subscriptions.push(interviewSub, statusSub);
  }

  loadApplications(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loading = true;
      this.error = '';

      this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/my-applications`)
        .subscribe({
          next: (data) => {
            this.applications = data;
            this.loading = false;
            resolve();
          },
          error: (err) => {
            console.error('Error loading pasantías:', err);
            this.error = 'Error al cargar mis pasantías';
            this.loading = false;
            reject(err);
          }
        });
    });
  }

  selectApplication(application: InternshipApplication): void {
    this.selectedApplication = application;
    this.isDetailsExpanded = false; // Resetear estado colapsado al seleccionar nueva aplicación
  }

  toggleDetailsExpansion(): void {
    this.isDetailsExpanded = !this.isDetailsExpanded;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-BO', { 
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

  getStatusText(status: string): string {
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

  hasInterviewScheduled(): boolean {
    return this.selectedApplication?.status === 'ENTREVISTA' && 
           (!!this.selectedApplication.interviewDateTime || !!this.selectedApplication.reviewDate);
  }

  hasAttendanceConfirmed(): boolean {
    if (!this.selectedApplication) return false;
    const confirmed = this.selectedApplication.interviewAttendanceConfirmed;
    // Manejar tanto boolean como número (1/0) que puede venir de la DB
    return confirmed === true || confirmed === 1 || confirmed === false || confirmed === 0;
  }

  isAttendanceConfirmed(): boolean {
    if (!this.selectedApplication) return false;
    const confirmed = this.selectedApplication.interviewAttendanceConfirmed;
    // Verificar si confirmó asistencia (true o 1)
    return confirmed === true || confirmed === 1;
  }

  showInterviewDetails(): void {
    if (this.hasInterviewScheduled()) {
      this.showInterviewModal = true;
      
      // Mostrar notificación toastr si ya hay confirmación
      if (this.hasAttendanceConfirmed()) {
        if (this.isAttendanceConfirmed()) {
          this.toastr.info('Ya has confirmado que asistirás a la entrevista.', 'Confirmación de Asistencia');
        } else {
          this.toastr.info('Ya has indicado que no asistirás a la entrevista.', 'Confirmación de Asistencia');
        }
      }
    }
  }

  closeInterviewModal(): void {
    this.showInterviewModal = false;
    this.confirmingAttendance = false;
  }

  confirmAttendance(willAttend: boolean): void {
    if (!this.selectedApplication || this.confirmingAttendance) return;
    
    this.confirmingAttendance = true;
    
    this.http.put(
      `${environment.apiBaseUrl}/InternshipApplication/${this.selectedApplication.id}/confirm-attendance`,
      { willAttend: willAttend }
    ).subscribe({
      next: () => {
        // Actualizar el estado local inmediatamente
        if (this.selectedApplication) {
          this.selectedApplication.interviewAttendanceConfirmed = willAttend;
        }
        
        this.toastr.success(
          willAttend 
            ? 'Has confirmado tu asistencia a la entrevista.' 
            : 'Has indicado que no asistirás a la entrevista.',
          'Confirmación Guardada'
        );
        
        // Recargar las aplicaciones para sincronizar con el backend
        this.loadApplications().then(() => {
          // Mantener la selección después de recargar
          if (this.selectedApplication) {
            const updatedApp = this.applications.find(a => a.id === this.selectedApplication!.id);
            if (updatedApp) {
              this.selectedApplication = updatedApp;
            }
          }
        });
        
        this.confirmingAttendance = false;
      },
      error: (err) => {
        console.error('Error al confirmar asistencia:', err);
        const errorMessage = err.error?.message || err.statusText || 'Error al guardar la confirmación';
        this.toastr.error(errorMessage, 'Error');
        this.confirmingAttendance = false;
      }
    });
  }
} 