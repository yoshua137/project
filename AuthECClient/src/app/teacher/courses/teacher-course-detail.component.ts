import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { SignalRService } from '../../shared/services/signalr.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';

interface CourseStudent {
  studentId: string;
  fullName: string;
  email: string;
  career?: string;
  assignedAtUtc?: string;
  lastApplication?: {
    applicationId: number;
    status: string;
    applicationDate: string;
    organizationId?: string;
    organizationName?: string;
    agreementStatus?: string;
    cvFilePath?: string;
    interviewDateTime?: string;
    interviewMode?: string;
    interviewLink?: string;
    interviewAddress?: string;
    interviewNotes?: string;
    interviewAttendanceConfirmed?: boolean;
    virtualMeetingLink?: string;
    reviewNotes?: string;
    reviewDate?: string;
    evaluationStatus?: string;
    acceptanceLetterFilePath?: string;
    acceptanceNotes?: string;
    acceptanceDate?: string;
    studentAcceptanceConfirmed?: boolean;
    studentAcceptanceConfirmedDate?: string;
    directorApprovalStatus?: string;
    directorApprovalDate?: string;
    directorApprovalNotes?: string;
    coverLetter?: string;
    offer?: {
      id: number;
      title?: string;
      career?: string;
      mode?: string;
      startDate?: string;
      endDate?: string;
      contactEmail?: string;
      contactPhone?: string;
    } | null;
  } | null;
  applications?: Array<{
    id: number;
    status: string;
    applicationDate: string;
    offerId?: number;
    offerTitle?: string;
    organizationName?: string;
    coverLetter?: string;
    reviewDate?: string;
    reviewNotes?: string;
    evaluationStatus?: string;
    interviewDateTime?: string;
    interviewMode?: string;
    interviewLink?: string;
    interviewAddress?: string;
    interviewNotes?: string;
    interviewAttendanceConfirmed?: boolean;
    virtualMeetingLink?: string;
    acceptanceDate?: string;
    acceptanceNotes?: string;
    studentAcceptanceConfirmed?: boolean;
    studentAcceptanceConfirmedDate?: string;
    directorApprovalStatus?: string;
    directorApprovalDate?: string;
    directorApprovalNotes?: string;
  }>;
}

type ApplicationItem = NonNullable<CourseStudent['applications']>[0];

@Component({
  selector: 'app-teacher-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto p-4">
      <a routerLink="/cursos" class="text-blue-700 hover:underline mb-4 inline-block">&larr; Volver</a>
      <div class="flex flex-col gap-6">
        <!-- Lista de estudiantes -->
        <div class="w-full">
          <div class="bg-white rounded-xl shadow p-4">
            <div class="border-b pb-2 mb-4">
              <div class="flex justify-between items-center">
                <h5 class="text-lg font-semibold text-blue-800">Alumnos inscritos</h5>
              </div>
            </div>
            <div *ngIf="loading" class="text-center py-8">
              <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span class="block mt-2 text-blue-700">Cargando...</span>
            </div>
            <div *ngIf="!loading && error" class="text-center text-red-600 py-8">{{ error }}</div>
            <div *ngIf="!loading && !error && students.length === 0" class="text-center text-gray-400 py-8">
              No hay alumnos inscritos.
            </div>
            <div *ngIf="!loading && !error && students.length > 0" class="overflow-x-auto">
              <table class="min-w-full text-sm text-left">
                <thead>
                  <tr class="bg-blue-50">
                    <th class="py-2 px-4 font-semibold">Estudiante</th>
                    <th class="py-2 px-4 font-semibold">Fecha Inscripción</th>
                    <th class="py-2 px-4 font-semibold">¿Cuenta con pasantía?</th>
                    <th class="py-2 px-4 font-semibold">Postulaciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of students" 
                      [class]="selected?.studentId === s.studentId ? 'bg-blue-100' : 'hover:bg-blue-50'" 
                      style="cursor: pointer;"
                      (click)="selectStudent(s)">
                    <td class="py-2 px-4">
                      <strong>{{ s.fullName }}</strong>
                      <br>
                      <span class="text-xs text-gray-500">{{ s.email }}</span>
                    </td>
                    <td class="py-2 px-4">
                      <ng-container *ngIf="s.assignedAtUtc; else noDate">
                        {{ s.assignedAtUtc | date:'dd/MM/yyyy, HH:mm' }}
                      </ng-container>
                      <ng-template #noDate>—</ng-template>
                    </td>
                    <td class="py-2 px-4 text-center">
                      <div *ngIf="hasAcceptedInternship(s)" class="flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div *ngIf="!hasAcceptedInternship(s)" class="flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </td>
                    <td class="py-2 px-4">
                      <button (click)="openApplicationsView(s); $event.stopPropagation()"
                              class="inline-flex items-center gap-1 px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition text-xs font-semibold"
                              title="Ver postulaciones">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Postulación -->
    <div *ngIf="showApplicationDetailsModal && selectedApplicationForModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Postulación</h2>
          <button (click)="closeApplicationDetailsModal()" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div>
              <strong class="text-gray-700">Oferta:</strong>
              <p class="mt-1 text-gray-600">{{ selectedApplicationForModal.offerTitle || '—' }}</p>
            </div>
            <div>
              <strong class="text-gray-700">Organización:</strong>
              <p class="mt-1 text-gray-600">{{ selectedApplicationForModal.organizationName || '—' }}</p>
            </div>
            <div>
              <strong class="text-gray-700">Fecha de Postulación:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.applicationDate) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.coverLetter">
              <strong class="text-gray-700">Nota de Postulación:</strong>
              <p class="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{{ selectedApplicationForModal.coverLetter }}</p>
            </div>
            <div>
              <strong class="text-gray-700">CV del Estudiante:</strong>
              <p class="mt-2">
                <button (click)="viewCVForApplication(selectedApplicationForModal)" 
                        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ver CV del Estudiante
                </button>
              </p>
            </div>
          </div>
        </div>
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button (click)="closeApplicationDetailsModal()" 
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Entrevista -->
    <div *ngIf="showInterviewDetailsModal && selectedApplicationForModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Entrevista</h2>
          <button (click)="closeInterviewDetailsModal()" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <!-- Warning si hay entrevista programada pero asistencia no confirmada -->
          <div *ngIf="hasInterviewScheduled(selectedApplicationForModal) && !isAttendanceConfirmed(selectedApplicationForModal)" 
               class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-yellow-800 font-semibold">
                El estudiante debe confirmar la asistencia a la entrevista para continuar el proceso.
              </p>
            </div>
          </div>

          <div *ngIf="selectedApplicationForModal.interviewDateTime || selectedApplicationForModal.interviewMode || selectedApplicationForModal.interviewLink || selectedApplicationForModal.interviewAddress || selectedApplicationForModal.virtualMeetingLink" class="space-y-4">
            <div *ngIf="selectedApplicationForModal.interviewDateTime">
              <strong class="text-gray-700">Fecha de Entrevista:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.interviewDateTime) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.interviewMode">
              <strong class="text-gray-700">Modalidad de Entrevista:</strong>
              <p class="mt-1 text-gray-600">{{ selectedApplicationForModal.interviewMode }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.interviewLink">
              <strong class="text-gray-700">Enlace de Entrevista:</strong>
              <p class="mt-1 text-gray-600">
                <a [href]="selectedApplicationForModal.interviewLink" target="_blank" class="text-blue-600 hover:underline">
                  {{ selectedApplicationForModal.interviewLink }}
                </a>
              </p>
            </div>
            <div *ngIf="selectedApplicationForModal.interviewAddress">
              <strong class="text-gray-700">Dirección de Entrevista:</strong>
              <p class="mt-1 text-gray-600">{{ selectedApplicationForModal.interviewAddress }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.virtualMeetingLink">
              <strong class="text-gray-700">Reunión Virtual:</strong>
              <p class="mt-1 text-gray-600">
                <a [href]="selectedApplicationForModal.virtualMeetingLink" target="_blank" class="text-blue-600 hover:underline">
                  {{ selectedApplicationForModal.virtualMeetingLink }}
                </a>
              </p>
            </div>
            <div *ngIf="selectedApplicationForModal.interviewNotes">
              <strong class="text-gray-700">Notas de Entrevista:</strong>
              <p class="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{{ selectedApplicationForModal.interviewNotes }}</p>
            </div>
          </div>
          <div *ngIf="!selectedApplicationForModal.interviewDateTime && !selectedApplicationForModal.interviewMode && !selectedApplicationForModal.interviewLink && !selectedApplicationForModal.interviewAddress && !selectedApplicationForModal.virtualMeetingLink" 
               class="text-center text-gray-400 py-8">
            <p>No hay información de entrevista disponible</p>
          </div>
        </div>
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button (click)="closeInterviewDetailsModal()" 
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Evaluación -->
    <div *ngIf="showEvaluationDetailsModal && selectedApplicationForModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Evaluación</h2>
          <button (click)="closeEvaluationDetailsModal()" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <!-- Si no hay evaluación, mostrar mensaje con X -->
          <div *ngIf="!getEvaluationStatus(selectedApplicationForModal)" class="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-700 text-lg font-semibold">La evaluación aún no está disponible</p>
            <p class="text-gray-500 mt-2" *ngIf="selectedApplicationForModal.status === 'PENDIENTE'">La aplicación está pendiente de revisión</p>
            <p class="text-gray-500 mt-2" *ngIf="selectedApplicationForModal.status === 'ENTREVISTA'">La aplicación está en proceso de entrevista</p>
          </div>

          <!-- Si está aprobada o rechazada, mostrar detalles de evaluación -->
          <div *ngIf="getEvaluationStatus(selectedApplicationForModal) === 'APROBADA' || getEvaluationStatus(selectedApplicationForModal) === 'RECHAZADA'" class="space-y-4">
            <div *ngIf="selectedApplicationForModal.evaluationStatus">
              <strong class="text-gray-700">Estado de Evaluación:</strong>
              <p class="mt-1">
                <span class="px-2 py-1 rounded text-xs font-semibold" 
                      [ngClass]="selectedApplicationForModal.evaluationStatus === 'APROBADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ selectedApplicationForModal.evaluationStatus === 'APROBADA' ? 'Aprobada' : 'Rechazada' }}
                </span>
              </p>
            </div>
            <div *ngIf="selectedApplicationForModal.reviewDate">
              <strong class="text-gray-700">Fecha de Revisión:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.reviewDate) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.reviewDate">
              <strong class="text-gray-700">Fecha de Revisión:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.reviewDate) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.reviewNotes">
              <strong class="text-gray-700">Notas de Evaluación:</strong>
              <p class="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{{ selectedApplicationForModal.reviewNotes }}</p>
            </div>
            <div>
              <strong class="text-gray-700">Resultado:</strong>
              <p class="mt-1">
                <span *ngIf="getEvaluationStatus(selectedApplicationForModal) === 'APROBADA'" class="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  Aprobado
                </span>
                <span *ngIf="getEvaluationStatus(selectedApplicationForModal) === 'RECHAZADA'" class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  Reprobado
                </span>
              </p>
            </div>
          </div>
        </div>
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button (click)="closeEvaluationDetailsModal()" 
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Aceptación -->
    <div *ngIf="showAcceptanceDetailsModal && selectedApplicationForModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Detalles de Aceptación</h2>
          <button (click)="closeAcceptanceDetailsModal()" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <!-- Warning si evaluación aprobada pero estudiante no ha confirmado aceptación -->
          <div *ngIf="selectedApplicationForModal.status === 'APROBADA' && !selectedApplicationForModal.studentAcceptanceConfirmed" 
               class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-yellow-800 font-semibold">
                El estudiante debe confirmar su aceptación para completar el proceso de postulación.
              </p>
            </div>
          </div>

          <!-- Warning si estudiante confirmó pero organización no ha consolidado -->
          <div *ngIf="selectedApplicationForModal.status !== 'REVISION' && selectedApplicationForModal.studentAcceptanceConfirmed && !selectedApplicationForModal.acceptanceDate" 
               class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-yellow-800 font-semibold">
                El estudiante confirmó su aceptación. La organización debe consolidar la carta de aceptación.
              </p>
            </div>
          </div>

          <!-- Mensaje verde cuando el director da visto bueno -->
          <div *ngIf="selectedApplicationForModal.directorApprovalStatus === 'Aceptado' && selectedApplicationForModal.status === 'Aceptado'" 
               class="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-green-800 font-semibold">
                El director dio el visto bueno a la carta de aceptación. El proceso de postulación ha finalizado exitosamente. Nuestro sistema ya cumplió su objetivo. ¡Le deseamos éxito en su pasantía!
              </p>
            </div>
          </div>

          <!-- Warning si estado es REVISION (director revisando) -->
          <div *ngIf="selectedApplicationForModal.status === 'REVISION' && selectedApplicationForModal.acceptanceDate && selectedApplicationForModal.directorApprovalStatus !== 'Aceptado'" 
               class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-yellow-800 font-semibold">
                La carta de aceptación está siendo revisada por el director.
              </p>
            </div>
          </div>

          <div *ngIf="selectedApplicationForModal.acceptanceDate || selectedApplicationForModal.acceptanceNotes || selectedApplicationForModal.studentAcceptanceConfirmed || selectedApplicationForModal.directorApprovalStatus" class="space-y-4">
            <div *ngIf="selectedApplicationForModal.acceptanceDate">
              <strong class="text-gray-700">Fecha de Aceptación:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.acceptanceDate) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.studentAcceptanceConfirmed !== null && selectedApplicationForModal.studentAcceptanceConfirmed !== undefined">
              <strong class="text-gray-700">Estudiante Confirmó Aceptación:</strong>
              <p class="mt-1">
                <span [ngClass]="selectedApplicationForModal.studentAcceptanceConfirmed ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                  {{ selectedApplicationForModal.studentAcceptanceConfirmed ? 'Sí' : 'No' }}
                </span>
                <span *ngIf="selectedApplicationForModal.studentAcceptanceConfirmedDate" class="text-gray-500 text-sm ml-2">
                  ({{ formatDate(selectedApplicationForModal.studentAcceptanceConfirmedDate) }})
                </span>
              </p>
            </div>
            <div *ngIf="selectedApplicationForModal.acceptanceNotes">
              <strong class="text-gray-700">Notas de Aceptación:</strong>
              <p class="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{{ selectedApplicationForModal.acceptanceNotes }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.directorApprovalStatus">
              <strong class="text-gray-700">Decisión del Director:</strong>
              <p class="mt-1">
                <span class="px-2 py-1 rounded text-xs font-semibold" 
                      [ngClass]="selectedApplicationForModal.directorApprovalStatus === 'Aceptado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ selectedApplicationForModal.directorApprovalStatus === 'Aceptado' ? 'Aceptado' : 'Rechazado' }}
                </span>
              </p>
            </div>
            <div *ngIf="selectedApplicationForModal.directorApprovalDate">
              <strong class="text-gray-700">Fecha de Decisión del Director:</strong>
              <p class="mt-1 text-gray-600">{{ formatDate(selectedApplicationForModal.directorApprovalDate) }}</p>
            </div>
            <div *ngIf="selectedApplicationForModal.directorApprovalNotes">
              <strong class="text-gray-700">Notas del Director:</strong>
              <p class="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{{ selectedApplicationForModal.directorApprovalNotes }}</p>
            </div>
          </div>
          <div *ngIf="!selectedApplicationForModal.acceptanceDate && !selectedApplicationForModal.acceptanceNotes && !selectedApplicationForModal.studentAcceptanceConfirmed && !selectedApplicationForModal.directorApprovalStatus" 
               class="text-center text-gray-400 py-8">
            <p>No hay información de aceptación disponible</p>
          </div>
        </div>
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button (click)="closeAcceptanceDetailsModal()" 
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles de Oferta -->
    <div *ngIf="showOfferDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Información de la Pasantía</h2>
          <button 
            (click)="closeOfferDetailsModal()"
            class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Loading -->
          <div *ngIf="loadingOffer" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Error -->
          <div *ngIf="offerError" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ offerError }}
          </div>

          <!-- Offer Details -->
          <div *ngIf="!loadingOffer && !offerError && selectedOffer">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ selectedOffer.title }}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-semibold text-gray-700">Organización:</span>
                  <span class="text-gray-600 ml-2">{{ selectedOffer.organizationName }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Carrera:</span>
                  <span class="text-gray-600 ml-2">{{ selectedOffer.career }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Modalidad:</span>
                  <span class="text-gray-600 ml-2">{{ selectedOffer.mode }}</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-700">Vacantes:</span>
                  <span class="text-gray-600 ml-2">{{ selectedOffer.vacancies }}</span>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 mb-2">Descripción</h4>
              <p class="text-gray-700 text-sm">{{ selectedOffer.description }}</p>
            </div>

            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 mb-2">Requisitos</h4>
              <p class="text-gray-700 text-sm">{{ selectedOffer.requirements }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 class="font-semibold text-gray-900 mb-2">Fechas</h4>
                <div class="text-sm">
                  <p class="text-gray-700"><strong>Inicio:</strong> {{ formatOfferDate(selectedOffer.startDate) }}</p>
                  <p class="text-gray-700"><strong>Fin:</strong> {{ formatOfferDate(selectedOffer.endDate) }}</p>
                </div>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900 mb-2">Contacto</h4>
                <div class="text-sm">
                  <p class="text-gray-700"><strong>Email:</strong> {{ selectedOffer.contactEmail || 'N/A' }}</p>
                  <p class="text-gray-700"><strong>Teléfono:</strong> {{ selectedOffer.contactPhone || 'N/A' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button 
            (click)="closeOfferDetailsModal()"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Postulaciones -->
    <div *ngIf="applicationsSelected" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 bg-opacity-30 p-4">
      <div class="bg-white rounded-lg shadow-lg w-full max-w-7xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button (click)="closeApplicationsView()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 class="text-xl font-bold mb-4 text-blue-900">Postulaciones del estudiante</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full border border-slate-200 rounded overflow-hidden text-sm">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="text-left p-2 border-b whitespace-nowrap">Oferta</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Organización</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Estado</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Detalles de Postulación</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Detalles de Entrevista</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Detalles de Evaluación</th>
                <th class="text-left p-2 border-b whitespace-nowrap">Detalles Aceptación</th>
              </tr>
            </thead>
            <tbody>
                  <tr *ngFor="let a of applicationsSelected" class="odd:bg-white even:bg-slate-50">
                    <td class="p-2 border-b">
                      <button *ngIf="a.offerId" 
                              (click)="openOfferDetailsModal(a.offerId)" 
                              class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                        {{ a.offerTitle || '—' }}
                      </button>
                      <span *ngIf="!a.offerId">{{ a.offerTitle || '—' }}</span>
                    </td>
                    <td class="p-2 border-b">{{ a.organizationName || '—' }}</td>
                    <td class="p-2 border-b">
                      <span class="px-2 py-1 rounded-full text-[11px] font-semibold uppercase" [ngClass]="statusClass(a.status)">{{ getStatusText(a.status) }}</span>
                    </td>
                <td class="p-2 border-b text-center">
                  <button (click)="openApplicationDetailsModalForApplication(a)" 
                          class="inline-flex items-center justify-center p-1 rounded transition"
                          [ngClass]="getApplicationDetailsIconClass(a)"
                          title="Ver Detalles de Postulación">
                    <svg *ngIf="hasApplicationDetails(a)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg *ngIf="!hasApplicationDetails(a)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </td>
                <td class="p-2 border-b text-center">
                  <button (click)="openInterviewDetailsModalForApplication(a)" 
                          class="inline-flex items-center justify-center p-1 rounded transition"
                          [ngClass]="getInterviewDetailsIconClass(a)"
                          title="Ver Detalles de Entrevista">
                    <svg *ngIf="hasInterviewScheduled(a) && isAttendanceConfirmed(a)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg *ngIf="hasInterviewScheduled(a) && !isAttendanceConfirmed(a)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <svg *ngIf="!hasInterviewScheduled(a)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </td>
                <td class="p-2 border-b text-center">
                  <button (click)="openEvaluationDetailsModalForApplication(a)" 
                          class="inline-flex items-center justify-center p-1 rounded transition"
                          [ngClass]="getEvaluationDetailsIconClass(a)"
                          title="Ver Detalles de Evaluación">
                    <svg *ngIf="getEvaluationStatus(a) === 'APROBADA' || getEvaluationStatus(a) === 'RECHAZADA'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg *ngIf="!getEvaluationStatus(a) && (a.status === 'PENDIENTE' || a.status === 'ENTREVISTA')" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </td>
                <td class="p-2 border-b text-center">
                  <button (click)="openAcceptanceDetailsModalForApplication(a)" 
                          class="inline-flex items-center justify-center p-1 rounded transition"
                          [ngClass]="getAcceptanceDetailsIconClass(a)"
                          title="Ver Detalles de Aceptación">
                    <!-- Amarillo: Estado REVISION (director revisando) -->
                    <svg *ngIf="a.status === 'REVISION' && a.acceptanceDate" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <!-- Verde: Aceptación completa (confirmada por estudiante, carta guardada, y no está en REVISION) -->
                    <svg *ngIf="a.status !== 'REVISION' && a.studentAcceptanceConfirmed && a.acceptanceDate" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <!-- Amarillo: Estudiante confirmó pero organización no ha consolidado -->
                    <svg *ngIf="a.status !== 'REVISION' && a.studentAcceptanceConfirmed && !a.acceptanceDate" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <!-- Amarillo: Estado APROBADA pero estudiante no ha confirmado -->
                    <svg *ngIf="a.status === 'APROBADA' && !a.studentAcceptanceConfirmed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <!-- Rojo: Otros casos (no aprobada, no confirmada, etc.) -->
                    <svg *ngIf="a.status !== 'APROBADA' && a.status !== 'REVISION' && !a.studentAcceptanceConfirmed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TeacherCourseDetailComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  courseId!: string;
  students: CourseStudent[] = [];
  selected: CourseStudent | null = null;
  applicationsSelected: CourseStudent['applications'] | null = null;
  selectedApplicationForModal: ApplicationItem | null = null;
  showApplicationDetailsModal = false;
  showInterviewDetailsModal = false;
  showEvaluationDetailsModal = false;
  showAcceptanceDetailsModal = false;
  showOfferDetailsModal = false;
  loadingOffer = false;
  offerError = '';
  selectedOffer: {
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
  } | null = null;
  private signalRSubscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private signalRService: SignalRService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.courseId) {
      this.error = 'Curso inválido.';
      return;
    }
    
    // Iniciar conexión SignalR
    try {
      await this.signalRService.startConnection();
      this.setupSignalRListeners();
    } catch (error) {
      console.error('Error al conectar SignalR:', error);
    }
    
    this.load();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    this.signalRSubscriptions.forEach(sub => sub.unsubscribe());
    this.signalRSubscriptions = [];
  }

  private setupSignalRListeners(): void {
    // Escuchar cuando un estudiante se inscribe al curso
    const enrolledSub = this.signalRService.onStudentEnrolled().subscribe(notification => {
      if (notification && notification.courseId === this.courseId) {
        // Recargar la lista de estudiantes
        this.load();
      }
    });
    this.signalRSubscriptions.push(enrolledSub);

    // Escuchar cuando se actualizan las postulaciones de estudiantes
    const appUpdatedSub = this.signalRService.onStudentApplicationUpdated().subscribe(notification => {
      if (notification) {
        // Verificar si el estudiante está en la lista actual
        const studentIndex = this.students.findIndex(s => s.studentId === notification.studentId);
        if (studentIndex !== -1) {
          // Recargar la lista para obtener los datos actualizados
          this.load();
        }
      }
    });
    this.signalRSubscriptions.push(appUpdatedSub);
  }

  private load(): void {
    this.loading = true;
    this.http.get<CourseStudent[]>(`${environment.apiBaseUrl}/TeacherCourses/${this.courseId}/students`).subscribe({
      next: res => { 
        this.students = res; 
        this.loading = false;
        // Si hay un estudiante seleccionado, actualizar sus datos
        if (this.selected) {
          const updated = res.find(s => s.studentId === this.selected!.studentId);
          if (updated) {
            this.selected = updated;
          }
        }
      },
      error: err => { 
        this.error = err?.error?.message || 'No se pudieron cargar los estudiantes.'; 
        this.loading = false; 
      }
    });
  }

  selectStudent(student: CourseStudent): void {
    this.selected = student;
  }

  openApplicationsView(s: CourseStudent): void {
    this.applicationsSelected = s.applications ?? [];
  }

  closeApplicationsView(): void {
    this.applicationsSelected = null;
  }

  cvUrl(applicationId: number): string {
    return `${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv/student`;
  }

  viewCV(): void {
    if (this.selected?.lastApplication?.applicationId) {
      this.viewCVById(this.selected.lastApplication.applicationId);
    }
  }

  viewCVForApplication(app: ApplicationItem): void {
    if (app.id) {
      this.viewCVById(app.id);
    }
  }

  viewCVById(applicationId: number): void {
    const url = `${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv`;
    const token = this.authService.getToken();
    if (token) {
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Error al descargar el archivo');
      })
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(error => {
        console.error('Error al abrir el CV:', error);
      });
    } else {
      console.error('No se encontró el token de autorización');
    }
  }

  viewAcceptanceLetter(): void {
    if (!this.selected?.lastApplication?.acceptanceLetterFilePath) {
      return;
    }
    const url = `${environment.apiBaseUrl}/InternshipApplication/${this.selected.lastApplication.applicationId}/acceptance-letter`;
    window.open(url, '_blank');
  }

  statusClass(status?: string): string {
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

  hasApplications(student: CourseStudent): boolean {
    return !!(student.applications && student.applications.length > 0) || !!student.lastApplication;
  }

  hasInterview(student: CourseStudent): boolean {
    return !!student.lastApplication?.interviewDateTime;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ENTREVISTA': return 'bg-blue-100 text-blue-800';
      case 'APROBADA': return 'bg-green-100 text-green-800';
      case 'Aceptado': return 'bg-green-100 text-green-800';
      case 'RECHAZADA': return 'bg-red-100 text-red-800';
      case 'REVISION': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'ENTREVISTA': return 'Entrevista';
      case 'APROBADA': return 'Aprobada';
      case 'Aceptado': return 'Aceptado';
      case 'RECHAZADA': return 'Rechazada';
      case 'REVISION': return 'Revisión';
      default: return status;
    }
  }

  openApplicationDetailsModal(): void {
    if (this.selected?.lastApplication) {
      this.selectedApplicationForModal = {
        id: this.selected.lastApplication.applicationId,
        status: this.selected.lastApplication.status,
        applicationDate: this.selected.lastApplication.applicationDate,
        offerTitle: this.selected.lastApplication.offer?.title,
        organizationName: this.selected.lastApplication.organizationName,
        coverLetter: this.selected.lastApplication.coverLetter
      } as ApplicationItem;
      this.showApplicationDetailsModal = true;
    }
  }

  openApplicationDetailsModalForApplication(app: ApplicationItem): void {
    this.selectedApplicationForModal = app;
    this.showApplicationDetailsModal = true;
  }

  closeApplicationDetailsModal(): void {
    this.showApplicationDetailsModal = false;
    this.selectedApplicationForModal = null;
  }

  openInterviewDetailsModal(): void {
    if (this.selected?.lastApplication) {
      this.selectedApplicationForModal = {
        id: this.selected.lastApplication.applicationId,
        status: this.selected.lastApplication.status,
        applicationDate: this.selected.lastApplication.applicationDate,
        offerTitle: this.selected.lastApplication.offer?.title,
        organizationName: this.selected.lastApplication.organizationName,
        interviewDateTime: this.selected.lastApplication.interviewDateTime,
        interviewMode: this.selected.lastApplication.interviewMode,
        interviewLink: this.selected.lastApplication.interviewLink,
        interviewAddress: this.selected.lastApplication.interviewAddress,
        virtualMeetingLink: this.selected.lastApplication.virtualMeetingLink,
        interviewNotes: this.selected.lastApplication.interviewNotes
      } as ApplicationItem;
      this.showInterviewDetailsModal = true;
    }
  }

  openInterviewDetailsModalForApplication(app: ApplicationItem): void {
    this.selectedApplicationForModal = app;
    this.showInterviewDetailsModal = true;
  }

  closeInterviewDetailsModal(): void {
    this.showInterviewDetailsModal = false;
    this.selectedApplicationForModal = null;
  }

  openEvaluationDetailsModal(): void {
    if (this.selected?.lastApplication) {
      this.selectedApplicationForModal = {
        id: this.selected.lastApplication.applicationId,
        status: this.selected.lastApplication.status,
        applicationDate: this.selected.lastApplication.applicationDate,
        offerTitle: this.selected.lastApplication.offer?.title,
        organizationName: this.selected.lastApplication.organizationName,
        evaluationStatus: this.selected.lastApplication.evaluationStatus,
        reviewDate: this.selected.lastApplication.reviewDate,
        reviewNotes: this.selected.lastApplication.reviewNotes
      } as ApplicationItem;
      this.showEvaluationDetailsModal = true;
    }
  }

  openEvaluationDetailsModalForApplication(app: ApplicationItem): void {
    this.selectedApplicationForModal = app;
    this.showEvaluationDetailsModal = true;
  }

  closeEvaluationDetailsModal(): void {
    this.showEvaluationDetailsModal = false;
    this.selectedApplicationForModal = null;
  }

  openAcceptanceDetailsModal(): void {
    if (this.selected?.lastApplication) {
      this.selectedApplicationForModal = {
        id: this.selected.lastApplication.applicationId,
        status: this.selected.lastApplication.status,
        applicationDate: this.selected.lastApplication.applicationDate,
        offerTitle: this.selected.lastApplication.offer?.title,
        organizationName: this.selected.lastApplication.organizationName,
        acceptanceDate: this.selected.lastApplication.acceptanceDate,
        acceptanceNotes: this.selected.lastApplication.acceptanceNotes,
        studentAcceptanceConfirmed: this.selected.lastApplication.studentAcceptanceConfirmed,
        studentAcceptanceConfirmedDate: this.selected.lastApplication.studentAcceptanceConfirmedDate,
        directorApprovalStatus: this.selected.lastApplication.directorApprovalStatus,
        directorApprovalDate: this.selected.lastApplication.directorApprovalDate,
        directorApprovalNotes: this.selected.lastApplication.directorApprovalNotes
      } as ApplicationItem;
      this.showAcceptanceDetailsModal = true;
    }
  }

  openAcceptanceDetailsModalForApplication(app: ApplicationItem): void {
    this.selectedApplicationForModal = app;
    this.showAcceptanceDetailsModal = true;
  }

  closeAcceptanceDetailsModal(): void {
    this.showAcceptanceDetailsModal = false;
    this.selectedApplicationForModal = null;
  }

  openOfferDetailsModal(offerId: number): void {
    this.selectedOffer = null;
    this.offerError = '';
    this.loadingOffer = true;
    this.showOfferDetailsModal = true;

    this.http.get<{
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
    }>(`${environment.apiBaseUrl}/InternshipOffer/${offerId}`)
      .subscribe({
        next: (data) => {
          this.selectedOffer = {
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            startDate: data.startDate,
            endDate: data.endDate,
            mode: data.mode,
            career: data.career,
            organizationName: data.organizationName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            vacancies: data.vacancies
          };
          this.loadingOffer = false;
        },
        error: (err) => {
          console.error('Error loading offer details:', err);
          this.offerError = 'Error al cargar los detalles de la oferta';
          this.loadingOffer = false;
        }
      });
  }

  closeOfferDetailsModal(): void {
    this.showOfferDetailsModal = false;
    this.selectedOffer = null;
    this.offerError = '';
    this.loadingOffer = false;
  }

  formatOfferDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  hasAcceptedInternship(student: CourseStudent): boolean {
    // Verificar en lastApplication
    if (student.lastApplication?.status === 'Aceptado') {
      return true;
    }

    // Verificar en el array applications
    if (student.applications && student.applications.length > 0) {
      return student.applications.some(app => app.status === 'Aceptado');
    }

    return false;
  }

  // Métodos para determinar el estado de los iconos
  hasApplicationDetails(app: ApplicationItem): boolean {
    return !!(app.coverLetter || app.applicationDate);
  }

  hasInterviewScheduled(app: ApplicationItem): boolean {
    return !!(app.interviewDateTime || app.interviewMode || app.interviewLink || app.interviewAddress || app.virtualMeetingLink);
  }

  isAttendanceConfirmed(app: ApplicationItem): boolean {
    if (!app) return false;
    const confirmed = app.interviewAttendanceConfirmed;
    // Verificar si confirmó asistencia
    return confirmed === true;
  }

  getEvaluationStatus(app: ApplicationItem): string | null {
    return app.evaluationStatus || null;
  }

  getApplicationDetailsIconClass(app: ApplicationItem): string {
    if (this.hasApplicationDetails(app)) {
      return 'text-green-600 hover:text-green-800 hover:bg-green-50';
    }
    return 'text-red-600 hover:text-red-800 hover:bg-red-50';
  }

  getInterviewDetailsIconClass(app: ApplicationItem): string {
    if (this.hasInterviewScheduled(app) && this.isAttendanceConfirmed(app)) {
      return 'text-green-600 hover:text-green-800 hover:bg-green-50';
    } else if (this.hasInterviewScheduled(app) && !this.isAttendanceConfirmed(app)) {
      return 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50';
    }
    return 'text-red-600 hover:text-red-800 hover:bg-red-50';
  }

  getEvaluationDetailsIconClass(app: ApplicationItem): string {
    const status = this.getEvaluationStatus(app);
    if (status === 'APROBADA' || status === 'RECHAZADA') {
      return 'text-green-600 hover:text-green-800 hover:bg-green-50';
    } else if (!status && (app.status === 'PENDIENTE' || app.status === 'ENTREVISTA')) {
      return 'text-red-600 hover:text-red-800 hover:bg-red-50';
    }
    return 'text-gray-600 hover:text-gray-800 hover:bg-gray-50';
  }

  getAcceptanceDetailsIconClass(app: ApplicationItem): string {
    // Amarillo: Estado REVISION o pendiente de confirmación
    if (app.status === 'REVISION' && app.acceptanceDate) {
      return 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50';
    }
    // Verde: Aceptación completa
    if (app.status !== 'REVISION' && app.studentAcceptanceConfirmed && app.acceptanceDate) {
      return 'text-green-600 hover:text-green-800 hover:bg-green-50';
    }
    // Amarillo: Pendiente de consolidación o confirmación
    if ((app.status !== 'REVISION' && app.studentAcceptanceConfirmed && !app.acceptanceDate) ||
        (app.status === 'APROBADA' && !app.studentAcceptanceConfirmed)) {
      return 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50';
    }
    // Rojo: No aprobada o no confirmada
    return 'text-red-600 hover:text-red-800 hover:bg-red-50';
  }
}

