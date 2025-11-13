import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { SignalRService } from '../../shared/services/signalr.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';

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
  contactEmail?: string;
  contactPhone?: string;
  vacancies: string;
}

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
  interviewAttendanceConfirmed?: boolean | null;
}

@Component({
  selector: 'app-mis-ofertas-pasantia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ofertas-pasantia.component.html',
  styleUrls: ['./mis-ofertas-pasantia.component.css']
})
export class MisOfertasPasantiaComponent implements OnInit {
  offers: InternshipOffer[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  selectedCareer = '';
  editingOffer: InternshipOffer | null = null;
  editForm: any = {};
  editLoading = false;
  editError = '';
  editSuccess = '';
  hasApplicants = false;
  checkingApplicants = false;
  
  // Propiedades para el modal de eliminación
  deletingOffer: InternshipOffer | null = null;
  deleteLoading = false;
  deleteError = '';
  deleteSuccess = '';
  
  // Propiedades para el modal de postulantes
  viewingApplicants: InternshipOffer | null = null;
  applicants: InternshipApplication[] = [];
  applicantsLoading = false;
  applicantsError = '';
  highlightedApplicantId: number | null = null;
  stoppedFadeRows = new Set<number>();
  private allowFadeStop = false;
  private pendingHighlightApplicantId: number | null = null;
  
  // Propiedades para el modal de revisión
  reviewingApplication: InternshipApplication | null = null;
  reviewAction: string = '';
  reviewNotes: string = '';
  virtualMeetingLink: string = '';
  reviewLoading = false;
  reviewError = '';

  // Campos para programar entrevista
  interviewDate: string = '';
  interviewTime: string = '';
  interviewMode: string = '';
  interviewLink: string = '';
  interviewAddress: string = '';

  // Propiedades para el modal de detalles de entrevista
  showingInterviewDetails: InternshipApplication | null = null;
  private subscriptions: Subscription[] = [];

  // Propiedades para el sistema de requisitos
  selectedRequirements: string[] = [];
  customRequirementInput: string = '';
  canAddCustomRequirementFlag: boolean = false;
  editingRequirementIndex: number | null = null;
  editingRequirementValue: string = '';
  predefinedRequirements = ['Hoja de vida(Curriculum Vitae)', 'Entrevistas'];

  constructor(
    private http: HttpClient,
    private signalRService: SignalRService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.signalRService.startConnection();
    this.route.queryParams.subscribe(params => {
      if (params['highlightApplicant']) {
        this.pendingHighlightApplicantId = +params['highlightApplicant'];
      }
    });
    this.loadMyOffers();
    this.setupSignalRListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setupSignalRListeners(): void {
    // Escuchar cuando un estudiante confirma asistencia
    const attendanceSub = this.signalRService.onAttendanceConfirmed().subscribe((notification: any) => {
      if (notification) {
        // Si estamos viendo los postulantes de una oferta, actualizar la lista
        if (this.viewingApplicants) {
          const applicant = this.applicants.find(a => a.id === notification.applicationId);
          if (applicant) {
            applicant.interviewAttendanceConfirmed = notification.willAttend;
            
            this.toastr.info(
              `${notification.studentName} ${notification.willAttend ? 'asistirá' : 'NO asistirá'} a la entrevista para "${notification.offerTitle}"`,
              'Confirmación de Asistencia',
              { timeOut: 5000 }
            );
          }
        }
        this.signalRService.clearNotifications();
      }
    });

    this.subscriptions.push(attendanceSub);
  }

  loadMyOffers(): void {
    this.loading = true;
    this.error = '';

    this.http.get<InternshipOffer[]>(`${environment.apiBaseUrl}/InternshipOffer/my-offers`)
      .subscribe({
        next: async (data) => {
          this.offers = data;
          this.loading = false;
          if (this.pendingHighlightApplicantId) {
            const offer = await this.findOfferByApplicantId(this.pendingHighlightApplicantId);
            if (offer) {
              this.openApplicantsModal(offer);
            }
          }
        },
        error: (err) => {
          console.error('Error loading offers:', err);
          this.error = 'Error al cargar las ofertas de pasantía';
          this.loading = false;
        }
      });
  }

  get filteredOffers(): InternshipOffer[] {
    return this.offers.filter(offer => {
      const matchesSearch = !this.searchTerm || 
        offer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        offer.career.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCareer = !this.selectedCareer || offer.career === this.selectedCareer;
      
      return matchesSearch && matchesCareer;
    });
  }

  get uniqueCareers(): string[] {
    return [...new Set(this.offers.map(offer => offer.career))];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusBadgeClass(offer: InternshipOffer): string {
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    const today = new Date();

    if (today < startDate) {
      return 'bg-blue-100 text-blue-800';
    } else if (today >= startDate && today <= endDate) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(offer: InternshipOffer): string {
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    const today = new Date();

    if (today < startDate) {
      return 'Próximamente';
    } else if (today >= startDate && today <= endDate) {
      return 'Activa';
    } else {
      return 'Finalizada';
    }
  }

  // Métodos para el modal de confirmación de eliminación
  openDeleteModal(offer: InternshipOffer): void {
    this.deletingOffer = { ...offer };
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteLoading = false;
  }

  closeDeleteModal(): void {
    this.deletingOffer = null;
    this.deleteError = '';
    this.deleteSuccess = '';
    this.deleteLoading = false;
  }

  confirmDelete(): void {
    if (!this.deletingOffer) return;
    
    this.deleteLoading = true;
    this.deleteError = '';
    this.deleteSuccess = '';
    
    this.http.delete(`${environment.apiBaseUrl}/InternshipOffer/${this.deletingOffer.id}`)
      .subscribe({
        next: () => {
          this.deleteSuccess = 'Oferta eliminada correctamente';
          // Eliminar la oferta de la lista local
          this.offers = this.offers.filter(offer => offer.id !== this.deletingOffer!.id);
          setTimeout(() => this.closeDeleteModal(), 1000);
        },
        error: (err) => {
          console.error('Error deleting offer:', err);
          this.deleteError = err.error?.message || 'Error al eliminar la oferta';
          this.deleteLoading = false;
        }
      });
  }

  openEditModal(offer: InternshipOffer): void {
    this.editingOffer = { ...offer };
    this.editForm = {
      ...offer,
      startDate: offer.startDate ? offer.startDate.substring(0, 10) : '',
      endDate: offer.endDate ? offer.endDate.substring(0, 10) : '',
      vacancies: offer.vacancies
    };
    this.editError = '';
    this.editSuccess = '';
    this.editLoading = false;
    this.hasApplicants = false;
    this.checkingApplicants = true;
    
    // Inicializar requisitos desde el string
    this.initializeRequirements(offer.requirements);
    
    // Verificar si hay postulantes para esta oferta
    this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/offer/${offer.id}`)
      .subscribe({
        next: (applications) => {
          this.hasApplicants = applications.length > 0;
          this.checkingApplicants = false;
        },
        error: (err) => {
          console.error('Error checking applicants:', err);
          // En caso de error, asumimos que no hay postulantes para permitir la edición
          this.hasApplicants = false;
          this.checkingApplicants = false;
        }
      });
  }

  closeEditModal(): void {
    this.editingOffer = null;
    this.editForm = {};
    this.editError = '';
    this.editSuccess = '';
    this.editLoading = false;
    this.hasApplicants = false;
    this.checkingApplicants = false;
    // Limpiar requisitos
    this.selectedRequirements = [];
    this.customRequirementInput = '';
    this.canAddCustomRequirementFlag = false;
    this.cancelEditRequirement();
  }

  submitEdit(): void {
    if (!this.editingOffer) return;
    this.editLoading = true;
    this.editError = '';
    this.editSuccess = '';
    
    // Si hay postulantes, solo enviar el campo de vacantes
    // Si no hay postulantes, enviar todos los campos
    const body: any = this.hasApplicants 
      ? {
          title: this.editingOffer.title,
          description: this.editingOffer.description,
          requirements: this.editingOffer.requirements,
          startDate: new Date(this.editingOffer.startDate).toISOString(),
          endDate: new Date(this.editingOffer.endDate).toISOString(),
          mode: this.editingOffer.mode,
          career: this.editingOffer.career,
          contactEmail: this.editingOffer.contactEmail,
          contactPhone: this.editingOffer.contactPhone,
          vacancies: this.editForm.vacancies
        }
      : {
          title: this.editForm.title,
          description: this.editForm.description,
          requirements: this.getRequirementsString(),
          startDate: new Date(this.editForm.startDate).toISOString(),
          endDate: new Date(this.editForm.endDate).toISOString(),
          mode: this.editForm.mode,
          career: this.editForm.career,
          contactEmail: this.editForm.contactEmail,
          contactPhone: this.editForm.contactPhone,
          vacancies: this.editForm.vacancies
        };
    
    this.http.put(`${environment.apiBaseUrl}/InternshipOffer/${this.editingOffer.id}`, body)
      .subscribe({
        next: () => {
          this.editSuccess = 'Oferta actualizada correctamente';
          // Actualizar la oferta en la lista local
          const idx = this.offers.findIndex(o => o.id === this.editingOffer!.id);
          if (idx !== -1) {
            if (this.hasApplicants) {
              // Solo actualizar vacantes si hay postulantes
              this.offers[idx].vacancies = this.editForm.vacancies;
            } else {
              // Actualizar todos los campos si no hay postulantes
              this.offers[idx] = { ...this.editForm };
            }
          }
          setTimeout(() => this.closeEditModal(), 1000);
        },
        error: (err) => {
          console.error('Error updating offer:', err);
          if (err.error && typeof err.error === 'string') {
            this.editError = err.error;
          } else if (err.error?.message) {
            this.editError = err.error.message;
          } else {
            this.editError = 'Error al actualizar la oferta';
          }
          this.editLoading = false;
        }
      });
  }

  // Métodos para el modal de postulantes
  openApplicantsModal(offer: InternshipOffer): void {
    this.viewingApplicants = { ...offer };
    this.applicants = [];
    this.applicantsError = '';
    this.applicantsLoading = true;
    this.highlightedApplicantId = null;
    this.stoppedFadeRows.clear();
    this.allowFadeStop = false;
    
    // Cargar postulantes para esta oferta
    this.loadApplicants(offer.id);
  }

  closeApplicantsModal(): void {
    this.viewingApplicants = null;
    this.applicants = [];
    this.applicantsError = '';
    this.applicantsLoading = false;
  }

  loadApplicants(offerId: number): void {
    this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/offer/${offerId}`)
      .subscribe({
        next: (data) => {
          this.applicants = data;
          this.applicantsLoading = false;
          // Si venimos de notificación, destacar al postulante
          if (this.pendingHighlightApplicantId && this.applicants.some(a => a.id === this.pendingHighlightApplicantId)) {
            this.highlightApplicant(this.pendingHighlightApplicantId);
            // limpiar query params
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
            this.pendingHighlightApplicantId = null;
          }
          setTimeout(() => this.allowFadeStop = true, 200);
        },
        error: (err) => {
          console.error('Error loading applicants:', err);
          this.applicantsError = 'Error al cargar los postulantes';
          this.applicantsLoading = false;
          setTimeout(() => this.allowFadeStop = true, 200);
        }
      });
  }

  getApplicationStatusClass(status: string): string {
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

  getApplicationStatusText(status: string): string {
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

  private async findOfferByApplicantId(applicantId: number): Promise<InternshipOffer | null> {
    for (const offer of this.offers) {
      try {
        const applicants = await firstValueFrom(
          this.http.get<InternshipApplication[]>(`${environment.apiBaseUrl}/InternshipApplication/offer/${offer.id}`)
        );
        if (applicants.some(a => a.id === applicantId)) {
          return offer;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  private highlightApplicant(applicantId: number): void {
    this.stoppedFadeRows.delete(applicantId);
    this.highlightedApplicantId = applicantId;
    setTimeout(() => {
      if (this.highlightedApplicantId === applicantId) {
        this.highlightedApplicantId = null;
      }
    }, 3000);
  }

  stopFadeOnHover(event: MouseEvent, applicantId: number): void {
    if (!this.allowFadeStop) return;
    if (this.stoppedFadeRows.has(applicantId)) return;
    this.stoppedFadeRows.add(applicantId);
  }
  viewCV(applicationId: number): void {
    this.http.get(`${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Note: We don't revoke the URL immediately as the new tab needs it
          // The browser will clean it up when the tab is closed
        },
        error: (err) => {
          console.error('Error opening CV:', err);
          alert('Error al abrir el CV');
        }
      });
  }

  // Métodos para el modal de revisión
  openReviewModal(applicant: InternshipApplication, action: string): void {
    this.reviewingApplication = { ...applicant };
    this.reviewAction = action;
    this.reviewNotes = '';
    this.virtualMeetingLink = '';
    this.interviewDate = '';
    this.interviewTime = '';
    this.interviewMode = '';
    this.interviewLink = '';
    this.interviewAddress = '';
    this.reviewError = '';
    this.reviewLoading = false;
  }

  closeReviewModal(): void {
    this.reviewingApplication = null;
    this.reviewAction = '';
    this.reviewNotes = '';
    this.virtualMeetingLink = '';
    this.interviewDate = '';
    this.interviewTime = '';
    this.interviewMode = '';
    this.interviewLink = '';
    this.interviewAddress = '';
    this.reviewError = '';
    this.reviewLoading = false;
  }

  submitReview(): void {
    if (!this.reviewingApplication) return;
    
    this.reviewLoading = true;
    this.reviewError = '';
    
    // Validación para entrevista
    if (this.reviewAction === 'ENTREVISTA') {
      if (!this.interviewDate || !this.interviewTime || !this.interviewMode) {
        this.reviewError = 'Debe especificar fecha, hora y modalidad de la entrevista.';
        this.reviewLoading = false;
        return;
      }
      if (this.interviewMode === 'Virtual' && !this.interviewLink) {
        this.reviewError = 'Debe proporcionar el link de la reunión para entrevistas virtuales.';
        this.reviewLoading = false;
        return;
      }
      if (this.interviewMode === 'Presencial' && !this.interviewAddress) {
        this.reviewError = 'Debe proporcionar la dirección para entrevistas presenciales.';
        this.reviewLoading = false;
        return;
      }
    }

    // Construir fecha/hora ISO si aplica
    let interviewDateTimeIso: string | null = null;
    if (this.reviewAction === 'ENTREVISTA') {
      try {
        // Construir ISO local (fecha + hora) sin zona si backend espera UTC; aquí generamos ISO en local time y lo enviamos tal cual
        const dateTime = new Date(`${this.interviewDate}T${this.interviewTime}:00`);
        interviewDateTimeIso = dateTime.toISOString();
      } catch {
        interviewDateTimeIso = null;
      }
    }

    const body: any = { 
      status: this.reviewAction, 
      reviewNotes: this.reviewNotes,
      virtualMeetingLink: this.virtualMeetingLink || null
    };

    if (this.reviewAction === 'ENTREVISTA') {
      body.interviewDateTime = interviewDateTimeIso;
      body.interviewMode = this.interviewMode;
      body.interviewLink = this.interviewMode === 'Virtual' ? this.interviewLink : null;
      body.interviewAddress = this.interviewMode === 'Presencial' ? this.interviewAddress : null;
    }
    
    this.http.put(`${environment.apiBaseUrl}/InternshipApplication/${this.reviewingApplication.id}/review`, body)
      .subscribe({
        next: () => {
          // Actualizar el estado en la lista local
          const applicant = this.applicants.find(a => a.id === this.reviewingApplication!.id);
          if (applicant) {
            applicant.status = this.reviewAction;
            applicant.reviewDate = new Date().toISOString();
            applicant.reviewNotes = this.reviewNotes;
            // Actualizar campos de entrevista si se programó
            if (this.reviewAction === 'ENTREVISTA') {
              applicant.interviewDateTime = interviewDateTimeIso || undefined;
              applicant.interviewMode = this.interviewMode;
              applicant.interviewLink = this.interviewMode === 'Virtual' ? this.interviewLink : undefined;
              applicant.interviewAddress = this.interviewMode === 'Presencial' ? this.interviewAddress : undefined;
            }
          }
          // Recargar los postulantes para obtener datos actualizados
          if (this.viewingApplicants) {
            this.loadApplicants(this.viewingApplicants.id);
          }
          this.closeReviewModal();
        },
        error: (err) => {
          console.error('Error updating application status:', err);
          this.reviewError = err.error?.message || 'Error al actualizar el estado de la postulación';
          this.reviewLoading = false;
        }
      });
  }

  // Métodos para el modal de detalles de entrevista
  openInterviewDetailsModal(applicant: InternshipApplication): void {
    this.showingInterviewDetails = { ...applicant };
  }

  closeInterviewDetailsModal(): void {
    this.showingInterviewDetails = null;
  }

  hasInterviewScheduled(applicant: InternshipApplication): boolean {
    return applicant.status === 'ENTREVISTA' && !!applicant.interviewDateTime;
  }

  formatDateTime(dateTimeString: string): string {
    return new Date(dateTimeString).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para el sistema de requisitos
  initializeRequirements(requirementsString: string): void {
    if (!requirementsString) {
      this.selectedRequirements = [];
      return;
    }
    // Dividir por comas y limpiar espacios
    this.selectedRequirements = requirementsString
      .split(',')
      .map(req => req.trim())
      .filter(req => req.length > 0);
  }

  getRequirementsString(): string {
    return this.selectedRequirements.join(', ');
  }

  insertRequirement(text: string): void {
    if (this.selectedRequirements.includes(text)) {
      return;
    }
    this.selectedRequirements.push(text);
    this.updateEditFormRequirements();
  }

  addCustomRequirement(): void {
    const trimmed = this.customRequirementInput.trim();
    if (trimmed.length === 0) return;
    
    if (this.selectedRequirements.includes(trimmed)) {
      this.customRequirementInput = '';
      return;
    }
    
    this.selectedRequirements.push(trimmed);
    this.customRequirementInput = '';
    this.canAddCustomRequirementFlag = false;
    this.updateEditFormRequirements();
  }

  removeRequirement(text: string): void {
    if (this.editingRequirementIndex !== null) {
      const requirementBeingEdited = this.selectedRequirements[this.editingRequirementIndex];
      if (requirementBeingEdited === text) {
        this.cancelEditRequirement();
      }
    }
    
    this.selectedRequirements = this.selectedRequirements.filter(req => req !== text);
    this.updateEditFormRequirements();
    
    if (this.editingRequirementIndex !== null && this.editingRequirementIndex >= this.selectedRequirements.length) {
      this.cancelEditRequirement();
    }
  }

  startEditRequirement(index: number): void {
    const requirement = this.selectedRequirements[index];
    if (this.predefinedRequirements.includes(requirement)) {
      return;
    }
    this.editingRequirementIndex = index;
    this.editingRequirementValue = requirement;
  }

  saveEditRequirement(): void {
    if (this.editingRequirementIndex === null) return;
    
    const trimmed = this.editingRequirementValue.trim();
    if (trimmed.length === 0) {
      this.removeRequirement(this.selectedRequirements[this.editingRequirementIndex]);
      this.cancelEditRequirement();
      return;
    }
    
    const exists = this.selectedRequirements.some((req, idx) => 
      req === trimmed && idx !== this.editingRequirementIndex
    );
    
    if (exists) {
      this.cancelEditRequirement();
      return;
    }
    
    this.selectedRequirements[this.editingRequirementIndex] = trimmed;
    this.updateEditFormRequirements();
    this.cancelEditRequirement();
  }

  cancelEditRequirement(): void {
    this.editingRequirementIndex = null;
    this.editingRequirementValue = '';
  }

  isCustomRequirement(requirement: string): boolean {
    return !this.predefinedRequirements.includes(requirement);
  }

  isEditingRequirement(index: number): boolean {
    return this.editingRequirementIndex === index;
  }

  isRequirementSelected(text: string): boolean {
    return this.selectedRequirements.includes(text);
  }

  hasCustomRequirements(): boolean {
    return this.selectedRequirements.some(req => this.isCustomRequirement(req));
  }

  canAddCustomRequirement(): boolean {
    return this.canAddCustomRequirementFlag;
  }

  onCustomRequirementInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value || '';
    this.customRequirementInput = newValue;
    this.canAddCustomRequirementFlag = !!(newValue && newValue.trim().length > 0);
    this.cdr.detectChanges();
  }

  onCustomRequirementKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomRequirement();
    }
  }

  onEditRequirementKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEditRequirement();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditRequirement();
    }
  }

  updateEditFormRequirements(): void {
    this.editForm.requirements = this.getRequirementsString();
  }
} 