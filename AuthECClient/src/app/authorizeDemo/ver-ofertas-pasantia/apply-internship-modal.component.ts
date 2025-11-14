import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
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
  selector: 'app-apply-internship-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" *ngIf="isOpen">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800">Postularse a Oferta de Pasantía</h2>
          <button 
            (click)="closeModal()" 
            class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            [disabled]="loading">
            ×
          </button>
        </div>

        <div *ngIf="offer" class="space-y-4">
          <!-- Warning if already applied -->
          <div *ngIf="hasAlreadyApplied" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <div class="flex items-center">
              <i class="bi bi-check-circle mr-2"></i>
              <strong>Ya te has postulado a esta oferta de pasantía</strong>
            </div>
            <p class="mt-1 text-sm">Tu aplicación ha sido enviada exitosamente. Puedes ver el estado de tu postulación en "Mis Postulaciones".</p>
          </div>

          <!-- Información de la oferta -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-lg mb-2">{{ offer.title }}</h3>
            <p class="text-gray-600 mb-2"><strong>Organización:</strong> {{ offer.organizationName }}</p>
            <p class="text-gray-600 mb-2"><strong>Carrera:</strong> {{ offer.career }}</p>
            <p class="text-gray-600 mb-2"><strong>Modalidad:</strong> {{ offer.mode }}</p>
            <p class="text-gray-600 mb-2"><strong>Descripción:</strong> {{ offer.description }}</p>
            <p class="text-gray-600 mb-2"><strong>Requisitos:</strong> {{ offer.requirements }}</p>
            <p class="text-gray-600 mb-2"><strong>Inicio:</strong> {{ offer.startDate | date:'dd/MM/yyyy' }}</p>
            <p class="text-gray-600"><strong>Fin:</strong> {{ offer.endDate | date:'dd/MM/yyyy' }}</p>
          </div>

          <!-- Formulario de aplicación -->
          <form (ngSubmit)="submitApplication()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nota de Presentación *
              </label>
              <textarea
                [(ngModel)]="applicationForm.coverLetter"
                name="coverLetter"
                rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe por qué te interesa esta pasantía, tus habilidades relevantes y cómo puedes contribuir a la organización..."
                required
                [disabled]="hasAlreadyApplied">
              </textarea>
              <p class="text-sm text-gray-500 mt-1">
                Mínimo 10 caracteres, máximo 2000 caracteres
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Curriculum Vitae (opcional)
              </label>
              <div class="flex items-center space-x-2">
                <input
                  type="file"
                  (change)="onFileSelected($event)"
                  accept=".pdf"
                  class="hidden"
                  #fileInput
                  [disabled]="hasAlreadyApplied">
                <button
                  type="button"
                  (click)="fileInput.click()"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  [disabled]="hasAlreadyApplied">
                  Elegir archivo
                </button>
                <span class="text-sm text-gray-500">
                  {{ applicationForm.cv ? applicationForm.cv.name : 'No se eligió ningún archivo' }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">
                Solo archivos PDF, máximo 10MB
              </p>
            </div>

            <!-- Mensajes de error y éxito -->
            <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {{ error }}
            </div>
            <div *ngIf="success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {{ success }}
            </div>

            <!-- Botones -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                [disabled]="loading">
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                [ngClass]="hasAlreadyApplied ? 
                  'bg-orange-600 hover:bg-orange-700 text-white' : 
                  'bg-blue-600 hover:bg-blue-700 text-white'"
                [disabled]="loading || !applicationForm.coverLetter || applicationForm.coverLetter.length < 10">
                <span *ngIf="loading">Enviando...</span>
                <span *ngIf="!loading">Postularse</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ApplyInternshipModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() offer: InternshipOffer | null = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<void>();

  loading = false;
  error = '';
  success = '';
  hasAlreadyApplied = false;

  applicationForm = {
    coverLetter: '',
    cv: null as File | null
  };

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  closeModal(): void {
    if (!this.loading) {
      this.isOpen = false;
      this.resetForm();
      this.modalClosed.emit();
    }
  }

  resetForm(): void {
    this.applicationForm = {
      coverLetter: '',
      cv: null
    };
    this.error = '';
    this.success = '';
    this.loading = false;
    this.hasAlreadyApplied = false;
  }

  // Check if student has already applied to this offer
  checkIfAlreadyApplied(): void {
    if (!this.offer) return;
    
    this.http.get<boolean>(`${environment.apiBaseUrl}/InternshipOffer/${this.offer.id}/has-applied`)
      .subscribe({
        next: (hasApplied) => {
          this.hasAlreadyApplied = hasApplied;
          if (hasApplied) {
            this.toastr.info('Ya te has postulado a esta oferta de pasantía', 'Estado de Postulación');
          }
        },
        error: (err) => {
          console.error('Error checking application status:', err);
        }
      });
  }

  // Override the ngOnChanges to check application status when offer changes
  ngOnChanges(): void {
    if (this.isOpen && this.offer) {
      this.checkIfAlreadyApplied();
    }
  }

  submitApplication(): void {
    if (!this.offer || !this.applicationForm.coverLetter || this.applicationForm.coverLetter.length < 10) {
      return;
    }

    // If already applied, show toaster and close modal
    if (this.hasAlreadyApplied) {
      this.toastr.info('Ya te has postulado a esta oferta de pasantía', 'Estado de Postulación');
      setTimeout(() => {
        this.closeModal();
      }, 2000);
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = new FormData();
    formData.append('internshipOfferId', this.offer.id.toString());
    formData.append('coverLetter', this.applicationForm.coverLetter);
    if (this.applicationForm.cv) {
      formData.append('cv', this.applicationForm.cv);
    }

    this.http.post(`${environment.apiBaseUrl}/InternshipApplication`, formData)
      .subscribe({
        next: () => {
          this.success = '¡Aplicación enviada exitosamente!';
          this.toastr.success('¡Aplicación enviada exitosamente!', 'Éxito');
          setTimeout(() => {
            this.closeModal();
            this.applicationSubmitted.emit();
          }, 1500);
        },
        error: (err) => {
          console.error('Error submitting application:', err);
          
          // Check if the error is about already having applied
          if (err.error && typeof err.error === 'string' && err.error.includes('Ya has aplicado')) {
            this.toastr.info('Ya te has postulado a esta oferta de pasantía', 'Estado de Postulación');
            this.closeModal();
            return;
          }
          
          this.error = err.error?.message || 'Error al enviar la aplicación';
          this.loading = false;
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.error = 'Solo se permiten archivos PDF';
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        this.error = 'El archivo no puede exceder 10MB';
        return;
      }
      this.applicationForm.cv = file;
      this.error = '';
    }
  }
} 