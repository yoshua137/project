import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { InternshipInfoModalComponent } from './internship-info-modal.component';
import { ToastrService } from 'ngx-toastr';
import { SignalRService } from '../../shared/services/signalr.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
  interviewNotes?: string;
  interviewAttendanceConfirmed?: boolean | number | null;
  acceptanceLetterFilePath?: string;
  acceptanceNotes?: string;
  acceptanceDate?: string;
  studentAcceptanceConfirmed?: boolean | null;
  studentAcceptanceConfirmedDate?: string;
  evaluationStatus?: string;
  directorApprovalStatus?: string;
  directorApprovalDate?: string;
  directorApprovalNotes?: string;
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
                          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer application-row"
                          [class.highlighted]="highlightedApplicationId === application.id"
                          [class.fade-stopped]="stoppedFadeRows.has(application.id)"
                          [class.bg-blue-50]="selectedApplication?.id === application.id"
                          (mouseenter)="stopFadeOnHover(application.id)"
                          [attr.id]="'application-row-' + application.id"
                          (click)="selectApplication(application)">
                        <td class="py-3 px-4">
                          <button 
                            (click)="showMoreInfo(application.internshipOfferId); $event.stopPropagation()"
                            class="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline transition">
                            {{ application.internshipOfferTitle }}
                          </button>
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
                  <div class="mb-4">
                    <h3 class="text-lg font-semibold text-blue-800">Información de la Postulación</h3>
                  </div>

                  <!-- Success message when director approves acceptance letter -->
                  <div *ngIf="selectedApplication.directorApprovalStatus === 'Aceptado' && selectedApplication.status === 'Aceptado'" 
                       class="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p class="text-green-800 font-semibold">
                        La carta de aceptación fue aprobada por el director. El proceso de postulación ha finalizado exitosamente. Nuestro sistema ya cumplió su objetivo. ¡Le deseamos éxito en su pasantía!
                      </p>
                    </div>
                  </div>

                  <!-- Warning message if interview scheduled but not confirmed -->
                  <div *ngIf="hasInterviewScheduled(selectedApplication) && !isAttendanceConfirmed(selectedApplication)" 
                       class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p class="text-yellow-800 font-semibold">
                        Debes confirmar la asistencia a la entrevista para continuar el proceso.
                      </p>
                    </div>
                  </div>

                  <!-- Warning message if evaluation approved but student hasn't confirmed acceptance -->
                  <div *ngIf="selectedApplication.status === 'APROBADA' && !selectedApplication.studentAcceptanceConfirmed" 
                       class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p class="text-yellow-800 font-semibold">
                        Debes confirmar tu aceptación para completar el proceso de postulación.
                      </p>
                    </div>
                  </div>

                  <!-- Warning message if student confirmed but organization hasn't consolidated -->
                  <div *ngIf="selectedApplication.studentAcceptanceConfirmed && !selectedApplication.acceptanceLetterFilePath && selectedApplication.status !== 'REVISION'" 
                       class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p class="text-yellow-800 font-semibold">
                        La organización debe enviar una carta de aceptación al director de carrera.
                      </p>
                    </div>
                  </div>

                  <!-- Warning message if status is REVISION (director reviewing) -->
                  <div *ngIf="selectedApplication.status === 'REVISION' && selectedApplication.acceptanceLetterFilePath" 
                       class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p class="text-yellow-800 font-semibold">
                        El director revisará la carta de aceptación y el proceso de postulación del estudiante. Se enviará una confirmación para verificar si está de acuerdo con la carta de aceptación.
                      </p>
                    </div>
                  </div>

                  <!-- Action Buttons (Always Visible) -->
                  <div class="pt-4 border-t border-gray-200 space-y-2 mt-4">
                      <button 
                        (click)="showApplicationDetails(selectedApplication)"
                        class="w-full px-4 py-2 rounded transition flex items-center gap-2 text-gray-700 hover:text-gray-900">
                        <svg *ngIf="hasApplicationDetails(selectedApplication)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg *ngIf="!hasApplicationDetails(selectedApplication)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Detalles de Postulación
                      </button>
                      <button 
                        (click)="showInterviewDetails()"
                        class="w-full px-4 py-2 rounded transition flex items-center gap-2 text-gray-700 hover:text-gray-900">
                        <svg *ngIf="hasInterviewScheduled(selectedApplication) && isAttendanceConfirmed(selectedApplication)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg *ngIf="hasInterviewScheduled(selectedApplication) && !isAttendanceConfirmed(selectedApplication)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <svg *ngIf="!hasInterviewScheduled(selectedApplication)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ver Detalles de Entrevista
                      </button>
                      <div class="flex items-center gap-2 w-full">
                        <button 
                          (click)="showEvaluationDetails()"
                          class="flex-1 px-4 py-2 rounded transition flex items-start gap-2 text-gray-700 hover:text-gray-900 text-left">
                          <svg *ngIf="getEvaluationStatus(selectedApplication) === 'APROBADA' || getEvaluationStatus(selectedApplication) === 'RECHAZADA'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <svg *ngIf="!getEvaluationStatus(selectedApplication) && (selectedApplication.status === 'PENDIENTE' || selectedApplication.status === 'ENTREVISTA')" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="break-words">Ver Detalles de Evaluación</span>
                        </button>
                        <span *ngIf="getEvaluationStatus(selectedApplication) === 'APROBADA'" class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                          Aprobada
                        </span>
                        <span *ngIf="getEvaluationStatus(selectedApplication) === 'RECHAZADA'" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 whitespace-nowrap">
                          Reprobada
                        </span>
                      </div>
                      <button 
                        (click)="selectedApplication.studentAcceptanceConfirmed ? showAcceptanceDetails() : openConfirmAcceptanceModal()"
                        class="w-full px-4 py-2 rounded transition flex items-center gap-2 text-gray-700 hover:text-gray-900">
                        <!-- Amarillo: Estado REVISION (director revisando) - PRIORIDAD ALTA -->
                        <svg *ngIf="selectedApplication.status === 'REVISION' && selectedApplication.acceptanceLetterFilePath" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <!-- Verde: Aceptación completa (confirmada por estudiante, carta guardada, y no está en REVISION) -->
                        <svg *ngIf="selectedApplication.status !== 'REVISION' && selectedApplication.studentAcceptanceConfirmed && selectedApplication.acceptanceLetterFilePath" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <!-- Amarillo: Estudiante confirmó pero organización no ha consolidado -->
                        <svg *ngIf="selectedApplication.status !== 'REVISION' && selectedApplication.studentAcceptanceConfirmed && !selectedApplication.acceptanceLetterFilePath" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <!-- Amarillo: Estado APROBADA pero estudiante no ha confirmado -->
                        <svg *ngIf="selectedApplication.status === 'APROBADA' && !selectedApplication.studentAcceptanceConfirmed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <!-- Rojo: Otros casos (no aprobada, no confirmada, etc.) -->
                        <svg *ngIf="selectedApplication.status !== 'APROBADA' && selectedApplication.status !== 'REVISION' && !selectedApplication.studentAcceptanceConfirmed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ selectedApplication.studentAcceptanceConfirmed ? 'Detalles Aceptación' : 'Consolidar Aceptación' }}
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

    <!-- Application Details Modal -->
    <div *ngIf="showApplicationDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de la Postulación</h2>
          <button 
            (click)="closeApplicationDetailsModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6" *ngIf="selectedApplicationForDetails">
          <div class="space-y-4">
            <!-- Status -->
            <div class="flex justify-end mb-4">
              <span class="px-3 py-1 rounded-full text-sm font-semibold"
                    [ngClass]="getStatusClass(selectedApplicationForDetails.status)">
                {{ getStatusText(selectedApplicationForDetails.status) }}
              </span>
            </div>

            <!-- Application Date -->
            <div class="bg-blue-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Fecha de Postulación</h3>
              <p class="text-gray-700">{{ formatDate(selectedApplicationForDetails.applicationDate) }}</p>
            </div>

            <!-- Cover Letter -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Nota de Postulación</h3>
              <div class="text-gray-700 max-h-48 overflow-y-auto">
                <p *ngIf="selectedApplicationForDetails.coverLetter; else noCoverLetter">
                  {{ selectedApplicationForDetails.coverLetter }}
                </p>
                <ng-template #noCoverLetter>
                  <p class="text-gray-500 italic">No proporcionada</p>
                </ng-template>
              </div>
            </div>

            <!-- CV -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Curriculum Vitae</h3>
              <div *ngIf="selectedApplicationForDetails.cvFilePath; else noCV">
                <div class="flex items-center justify-between">
                  <span class="text-green-600 font-medium">CV enviado</span>
                  <button 
                    (click)="downloadCV(selectedApplicationForDetails.id)"
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h8a2 2 0 002-2v-2M7 10V6a5 5 0 0110 0v4M5 20h14" />
                    </svg>
                    Descargar PDF
                  </button>
                </div>
              </div>
              <ng-template #noCV>
                <p class="text-gray-500 italic">No proporcionado</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button 
            (click)="closeApplicationDetailsModal()"
            class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Evaluation Details Modal -->
    <div *ngIf="showEvaluationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Evaluación</h2>
          <button 
            (click)="closeEvaluationModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6" *ngIf="selectedApplication">
          <!-- Si no hay evaluación, mostrar mensaje con X -->
          <div *ngIf="!getEvaluationStatus(selectedApplication)" class="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-700 text-lg font-semibold">La evaluación aún no está disponible</p>
            <p class="text-gray-500 mt-2" *ngIf="selectedApplication.status === 'PENDIENTE'">La aplicación está pendiente de revisión</p>
            <p class="text-gray-500 mt-2" *ngIf="selectedApplication.status === 'ENTREVISTA'">La aplicación está en proceso de entrevista</p>
          </div>

          <!-- Si está aprobada o rechazada, mostrar detalles de evaluación -->
          <div *ngIf="getEvaluationStatus(selectedApplication) === 'APROBADA' || getEvaluationStatus(selectedApplication) === 'RECHAZADA'" class="space-y-4">
            <!-- Status -->
            <div class="flex justify-end mb-4">
              <span class="px-3 py-1 rounded-full text-sm font-semibold"
                    [ngClass]="getEvaluationStatus(selectedApplication) === 'APROBADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                {{ getEvaluationStatus(selectedApplication) === 'APROBADA' ? 'Aprobada' : 'Reprobada' }}
              </span>
            </div>

            <!-- Review Date -->
            <div class="bg-blue-50 p-4 rounded-lg" *ngIf="selectedApplication.reviewDate">
              <h3 class="font-semibold text-gray-900 mb-2">Fecha de Revisión</h3>
              <p class="text-gray-700">{{ formatDate(selectedApplication.reviewDate) }}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg" *ngIf="!selectedApplication.reviewDate">
              <h3 class="font-semibold text-gray-900 mb-2">Fecha de Revisión</h3>
              <p class="text-gray-500 italic">Aún no ha sido revisada</p>
            </div>

            <!-- Evaluation Notes -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Nota de Evaluación</h3>
              <div class="text-gray-700 max-h-48 overflow-y-auto">
                <p *ngIf="selectedApplication.reviewNotes; else noReviewNotes">
                  {{ selectedApplication.reviewNotes }}
                </p>
                <ng-template #noReviewNotes>
                  <p class="text-gray-500 italic">No hay notas de evaluación disponibles</p>
                </ng-template>
              </div>
            </div>

            <!-- Status Result -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Resultado</h3>
              <div class="flex items-center gap-2">
                <span *ngIf="getEvaluationStatus(selectedApplication) === 'APROBADA'" class="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  Aprobado
                </span>
                <span *ngIf="getEvaluationStatus(selectedApplication) === 'RECHAZADA'" class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  Reprobado
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button 
            (click)="closeEvaluationModal()"
            class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

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
            <!-- Warning if attendance not confirmed -->
            <div *ngIf="hasInterviewScheduled(selectedApplication) && !isAttendanceConfirmed(selectedApplication)" 
                 class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-yellow-800 font-semibold">
                  Debes confirmar la asistencia a la entrevista para continuar el proceso.
                </p>
              </div>
            </div>

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

            <!-- Interview Notes -->
            <div *ngIf="selectedApplication.interviewNotes" class="bg-gray-50 p-6 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-3 text-lg">Nota para el estudiante</h3>
              <div class="bg-white p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                <p class="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{{ selectedApplication.interviewNotes }}</p>
              </div>
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
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            (click)="closeInterviewModal()"
            class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition">
            <span *ngIf="!hasAttendanceConfirmed()">Cancelar</span>
            <span *ngIf="hasAttendanceConfirmed()">Cerrar</span>
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

    <!-- Confirm Acceptance Modal -->
    <div *ngIf="showConfirmAcceptanceModal && selectedApplication" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Confirmar Aceptación</h2>
          <button 
            (click)="closeConfirmAcceptanceModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <div class="space-y-4">
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p class="text-gray-700 text-base">
                Para completar el proceso de postulación, debes confirmar si realizarás tu pasantía en <strong>{{ selectedApplication.organizationName }}</strong>.
              </p>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-2">Oferta de Pasantía</h3>
              <p class="text-gray-700">{{ selectedApplication.internshipOfferTitle }}</p>
            </div>

            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-yellow-800 text-sm">
                <strong>Importante:</strong> Al confirmar, estás aceptando realizar tu pasantía en esta organización. Esta acción es definitiva.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            (click)="closeConfirmAcceptanceModal()"
            [disabled]="confirmingAcceptance"
            class="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
            Cancelar
          </button>
          <button 
            (click)="confirmAcceptance()"
            [disabled]="confirmingAcceptance"
            class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-green-400 disabled:cursor-not-allowed">
            <span *ngIf="!confirmingAcceptance">Confirmar</span>
            <span *ngIf="confirmingAcceptance">Confirmando...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Acceptance Details Modal -->
    <div *ngIf="showAcceptanceDetailsModal && selectedApplication" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Aceptación</h2>
          <button 
            (click)="closeAcceptanceDetailsModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <div class="space-y-4">
            <!-- Warning message if student confirmed but organization hasn't consolidated -->
            <div *ngIf="selectedApplication.studentAcceptanceConfirmed && !selectedApplication.acceptanceLetterFilePath && selectedApplication.status !== 'REVISION'" 
                 class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-yellow-800 font-semibold">
                  La organización debe enviar una carta de aceptación al director de carrera.
                </p>
              </div>
            </div>

            <!-- Warning message if status is REVISION (director reviewing) -->
            <div *ngIf="selectedApplication.status === 'REVISION' && selectedApplication.acceptanceLetterFilePath" 
                 class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-yellow-800 font-semibold">
                  El director revisará la carta de aceptación y el proceso de postulación del estudiante. Se enviará una confirmación para verificar si está de acuerdo con la carta de aceptación.
                </p>
              </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg" *ngIf="selectedApplication.studentAcceptanceConfirmedDate">
              <h3 class="font-semibold text-gray-900 mb-2">Fecha de Confirmación</h3>
              <p class="text-gray-700">{{ formatDate(selectedApplication.studentAcceptanceConfirmedDate) }}</p>
              
              <!-- Mensaje de confirmación más específico -->
              <div class="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-green-800 font-semibold">
                    Has confirmado tu aceptación de la oferta de pasantía.
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg" *ngIf="selectedApplication.acceptanceNotes">
              <h3 class="font-semibold text-gray-900 mb-2">Nota de Aceptación</h3>
              <p class="text-gray-700">{{ selectedApplication.acceptanceNotes }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button 
            (click)="closeAcceptanceDetailsModal()"
            class="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .application-row {
      transition: background-color 0.5s ease-in-out;
    }

    .application-row:not(.fade-stopped) {
      animation: hoverFade 3s ease-in-out infinite;
    }

    .application-row:hover {
      animation: none !important;
      background-color: rgba(59, 130, 246, 0.15) !important;
    }

    .application-row.fade-stopped {
      animation: none !important;
      background-color: transparent !important;
    }

    @keyframes hoverFade {
      0% {
        background-color: transparent;
      }
      50% {
        background-color: rgba(59, 130, 246, 0.15);
      }
      100% {
        background-color: transparent;
      }
    }

    .application-row.highlighted {
      background-color: rgba(59, 130, 246, 0.2) !important;
      animation: none !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .application-row.highlighted:not(:hover) {
      animation: none !important;
    }
  `]
})
export class MyApplicationsComponent implements OnInit, OnDestroy {
  applications: InternshipApplication[] = [];
  loading = false;
  error = '';
  showInfoModal = false;
  selectedOfferId: number | null = null;
  selectedApplication: InternshipApplication | null = null;
  selectedApplicationForDetails: InternshipApplication | null = null;
  showApplicationDetailsModal = false;
  showEvaluationModal = false;
  showInterviewModal = false;
  confirmingAttendance = false;
  showConfirmAcceptanceModal = false;
  confirmingAcceptance = false;
  private subscriptions: Subscription[] = [];
  highlightedApplicationId: number | null = null;
  private pendingHighlightApplicationId: number | null = null;
  private highlightTimeoutId: any = null;
  private pendingShowInterview = false;
  stoppedFadeRows = new Set<number>();

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private signalRService: SignalRService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.signalRService.startConnection();
    
    // Procesar query params iniciales
    this.processHighlightQueryParam(this.route.snapshot.queryParams);
    
    // Suscribirse a cambios en query params
    const queryParamsSub = this.route.queryParams.subscribe(params => {
      this.processHighlightQueryParam(params);
    });
    this.subscriptions.push(queryParamsSub);
    
    // También escuchar eventos de navegación para detectar cambios en la misma ruta
    const navigationSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const params = this.route.snapshot.queryParams;
        this.processHighlightQueryParam(params);
      });
    this.subscriptions.push(navigationSub);
    
    this.loadApplications();
    this.setupSignalRListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.highlightTimeoutId) {
      clearTimeout(this.highlightTimeoutId);
    }
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
        const statusText = notification.status === 'APROBADA' ? 'aprobada' : 'rechazada';
        this.toastr.info(
          `Tu postulación a "${notification.offerTitle}" ha sido ${statusText}`,
          'Estado Actualizado',
          { timeOut: 5000 }
        );
        
        // Recargar las aplicaciones para obtener todos los campos actualizados, incluyendo reviewNotes
        this.loadApplications().then(() => {
          // Mantener la selección después de recargar
          if (this.selectedApplication) {
            const updatedApp = this.applications.find(a => a.id === this.selectedApplication!.id);
            if (updatedApp) {
              this.selectedApplication = updatedApp;
            }
          }
        });
        
        this.signalRService.clearNotifications();
      }
    });

    // Escuchar cuando el director aprueba/rechaza una carta de aceptación
    const directorApprovalSub = this.signalRService.onDirectorApprovalUpdated().subscribe((notification: any) => {
      if (notification) {
        // Actualizar el estado de la aplicación directamente en la lista
        const application = this.applications.find(a => a.id === notification.applicationId);
        if (application) {
          // Actualizar el directorApprovalStatus
          application.directorApprovalStatus = notification.status;
          
          // Actualizar el status de la aplicación según la decisión del director
          // Cuando el director aprueba, el status cambia a "Aceptado"
          // Cuando el director rechaza, el status cambia a "RECHAZADA"
          if (notification.status === 'Aceptado') {
            application.status = 'Aceptado';
          } else if (notification.status === 'Rechazado') {
            application.status = 'RECHAZADA';
          }
          
          // Si la aplicación está seleccionada, actualizar también
          if (this.selectedApplication && this.selectedApplication.id === application.id) {
            this.selectedApplication = { ...application };
          }
        }
        
        const statusText = notification.status === 'Aceptado' ? 'dado visto bueno a' : 'rechazado';
        this.toastr.info(
          `El director ha ${statusText} la carta de aceptación para "${notification.offerTitle}"`,
          'Carta de Aceptación Revisada',
          { timeOut: 5000 }
        );
        
        this.signalRService.clearNotifications();
      }
    });

    this.subscriptions.push(interviewSub, statusSub, directorApprovalSub);
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
            this.applyHighlightIfNeeded();
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

  private processHighlightQueryParam(params: any): void {
    const highlightParam = params['highlightApplication'];
    const showInterviewParam = params['showInterview'] === 'true';
    
    if (highlightParam) {
      const applicationId = +highlightParam;
      // Solo procesar si es un ID diferente al que ya estamos procesando
      if (this.pendingHighlightApplicationId !== applicationId) {
        this.pendingHighlightApplicationId = applicationId;
        this.pendingShowInterview = showInterviewParam;
        // Si las aplicaciones ya están cargadas, procesar inmediatamente
        if (this.applications.length > 0) {
          this.applyHighlightIfNeeded();
        }
      }
    } else {
      this.pendingHighlightApplicationId = null;
      this.pendingShowInterview = false;
    }
  }

  private applyHighlightIfNeeded(): void {
    if (!this.pendingHighlightApplicationId || this.loading || !this.applications.length) {
      return;
    }

    const target = this.applications.find(app => app.id === this.pendingHighlightApplicationId);
    if (!target) {
      return;
    }

    this.highlightedApplicationId = target.id;
    this.selectApplication(target);
    this.scrollToHighlightedRow(target.id);

    // Limpiar query params después de procesar
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    if (this.highlightTimeoutId) {
      clearTimeout(this.highlightTimeoutId);
    }

    this.highlightTimeoutId = setTimeout(() => {
      this.highlightedApplicationId = null;
      this.highlightTimeoutId = null;
      this.pendingHighlightApplicationId = null;
    }, 4000);

    if (this.pendingShowInterview) {
      this.pendingShowInterview = false;
      this.showInterviewDetails();
    }
  }

  private scrollToHighlightedRow(applicationId: number): void {
    setTimeout(() => {
      const element = document.getElementById(`application-row-${applicationId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  stopFadeOnHover(applicationId: number): void {
    this.stoppedFadeRows.add(applicationId);
  }

  selectApplication(application: InternshipApplication): void {
    this.selectedApplication = application;
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
      case 'APROBADA':
        return 'bg-green-100 text-green-800';
      case 'Aceptado':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800';
      case 'REVISION':
        return 'bg-purple-100 text-purple-800';
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
      case 'APROBADA':
        return 'Aprobada';
      case 'Aceptado':
        return 'Aceptado';
      case 'RECHAZADA':
        return 'Rechazada';
      case 'REVISION':
        return 'Revisión';
      default:
        return status;
    }
  }

  getEvaluationStatus(application: InternshipApplication | null): string | null {
    if (!application) return null;
    // Usar evaluationStatus directamente, que es independiente del Status principal
    return application.evaluationStatus || null;
  }

  showApplicationDetails(application: InternshipApplication): void {
    this.selectedApplicationForDetails = application;
    this.showApplicationDetailsModal = true;
  }

  closeApplicationDetailsModal(): void {
    this.showApplicationDetailsModal = false;
    this.selectedApplicationForDetails = null;
  }

  showEvaluationDetails(): void {
    if (!this.selectedApplication) return;
    this.showEvaluationModal = true;
  }

  closeEvaluationModal(): void {
    this.showEvaluationModal = false;
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

  openConfirmAcceptanceModal(): void {
    if (!this.selectedApplication) return;
    
    // Verificar que el estado sea APROBADA
    if (this.selectedApplication.status !== 'APROBADA') {
      this.toastr.warning('Solo se puede consolidar la aceptación cuando el estado es "Aprobada"', 'Estado Requerido');
      return;
    }
    
    // Abrir el modal siempre que el estado sea APROBADA
    // El modal mostrará un mensaje si la organización aún no ha consolidado
    this.showConfirmAcceptanceModal = true;
  }

  closeConfirmAcceptanceModal(): void {
    this.showConfirmAcceptanceModal = false;
  }

  confirmAcceptance(): void {
    if (!this.selectedApplication || this.confirmingAcceptance) return;

    this.confirmingAcceptance = true;

    this.http.put(
      `${environment.apiBaseUrl}/InternshipApplication/${this.selectedApplication.id}/confirm-acceptance`,
      {}
    ).subscribe({
      next: () => {
        this.toastr.success('Aceptación confirmada exitosamente', 'Éxito');
        this.showConfirmAcceptanceModal = false;
        
        // Actualizar la aplicación local
        if (this.selectedApplication) {
          this.selectedApplication.studentAcceptanceConfirmed = true;
          this.selectedApplication.studentAcceptanceConfirmedDate = new Date().toISOString();
          
          // Actualizar también en la lista
          const updatedApp = this.applications.find(a => a.id === this.selectedApplication!.id);
          if (updatedApp) {
            updatedApp.studentAcceptanceConfirmed = true;
            updatedApp.studentAcceptanceConfirmedDate = this.selectedApplication.studentAcceptanceConfirmedDate;
          }
        }
        
        this.confirmingAcceptance = false;
      },
      error: (err) => {
        console.error('Error confirming acceptance:', err);
        const errorMessage = err.error?.message || err.message || 'Error al confirmar la aceptación';
        this.toastr.error(errorMessage, 'Error');
        this.confirmingAcceptance = false;
      }
    });
  }

  showAcceptanceDetailsModal = false;

  showAcceptanceDetails(): void {
    if (!this.selectedApplication) return;
    this.showAcceptanceDetailsModal = true;
  }

  closeAcceptanceDetailsModal(): void {
    this.showAcceptanceDetailsModal = false;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
    this.selectedOfferId = null;
  }

  private hasInterviewInfo(application: InternshipApplication | null | undefined): boolean {
    if (!application) return false;
    return !!(
      application.interviewDateTime ||
      application.interviewMode ||
      application.interviewLink ||
      application.interviewAddress ||
      application.virtualMeetingLink ||
      application.reviewNotes
    );
  }

  hasInterviewScheduled(application?: InternshipApplication | null): boolean {
    const app = application ?? this.selectedApplication;
    return this.hasInterviewInfo(app);
  }

  hasAttendanceConfirmed(): boolean {
    if (!this.selectedApplication) return false;
    const confirmed = this.selectedApplication.interviewAttendanceConfirmed;
    // Manejar tanto boolean como número (1/0) que puede venir de la DB
    return confirmed === true || confirmed === 1 || confirmed === false || confirmed === 0;
  }

  isAttendanceConfirmed(application?: InternshipApplication | null): boolean {
    const app = application ?? this.selectedApplication;
    if (!app) return false;
    const confirmed = app.interviewAttendanceConfirmed;
    // Verificar si confirmó asistencia (true o 1)
    return confirmed === true || confirmed === 1;
  }

  showInterviewDetails(): void {
    if (!this.selectedApplication) return;
    if (!this.hasInterviewInfo(this.selectedApplication)) {
      this.toastr.info('Aún no tienes entrevista programada.', 'Sin entrevista');
      return;
    }

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

  hasApplicationDetails(application: InternshipApplication | null): boolean {
    if (!application) return false;
    return !!(application.coverLetter || application.cvFilePath || application.applicationDate);
  }
} 