import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../shared/services/auth.service';
import { SignalRService } from '../../shared/services/signalr.service';
import { Subscription } from 'rxjs';

interface AcceptanceLetter {
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
  interviewDateTime?: string;
  interviewMode?: string;
  interviewLink?: string;
  interviewAddress?: string;
  interviewNotes?: string;
  interviewAttendanceConfirmed?: boolean;
  acceptanceLetterFilePath?: string;
  acceptanceNotes?: string;
  acceptanceDate?: string;
  studentAcceptanceConfirmed?: boolean;
  studentAcceptanceConfirmedDate?: string;
  evaluationStatus?: string;
  directorApprovalStatus?: string;
  directorApprovalDate?: string;
  directorApprovalNotes?: string;
  showCoverLetter?: boolean;
}

@Component({
  selector: 'app-director-acceptance-letters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './director-acceptance-letters.component.html',
  styles: ''
})
export class DirectorAcceptanceLettersComponent implements OnInit, OnDestroy {
  acceptanceLetters: AcceptanceLetter[] = [];
  loading = false;
  selectedLetter: AcceptanceLetter | null = null;
  approving = false;
  approvalNotes = '';
  approvalDecision: 'Aceptado' | 'Rechazado' | null = null;
  viewMode: 'pending' | 'reviewed' | 'all' = 'pending';
  showApplicationDetailsModal = false;
  showInterviewDetailsModal = false;
  showEvaluationDetailsModal = false;
  showAcceptanceDetailsModal = false;
  
  private signalRSubscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private authService: AuthService,
    private signalRService: SignalRService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.signalRService.startConnection();
    
    // Procesar query params para highlightLetter
    this.route.queryParams.subscribe(params => {
      if (params['highlightLetter']) {
        const letterId = +params['highlightLetter'];
        // Cargar las cartas y luego seleccionar la carta correspondiente
        this.loadAcceptanceLetters(() => {
          const letter = this.acceptanceLetters.find(l => l.id === letterId);
          if (letter) {
            this.selectLetter(letter);
            // Limpiar query params
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          }
        });
      } else {
        this.loadAcceptanceLetters();
      }
    });
    
    this.setupSignalRListeners();
  }

  ngOnDestroy() {
    this.signalRSubscriptions.forEach(sub => sub.unsubscribe());
  }

  setupSignalRListeners() {
    // Escuchar cuando se consolida una nueva carta de aceptación (cuando el status cambia a REVISION)
    const statusSub = this.signalRService.onApplicationStatusChanged().subscribe((notification) => {
      if (notification && notification.status === 'REVISION') {
        this.loadAcceptanceLetters();
      }
    });
    this.signalRSubscriptions.push(statusSub);

    // Escuchar cuando se recibe una nueva carta de aceptación
    const acceptanceLetterSub = this.signalRService.onAcceptanceLetterReceived().subscribe((notification) => {
      if (notification) {
        this.toastr.success(
          `Nueva carta de aceptación recibida para ${notification.studentName} en la oferta "${notification.offerTitle}"`,
          'Nueva Carta de Aceptación',
          { timeOut: 5000 }
        );
        this.loadAcceptanceLetters();
      }
    });
    this.signalRSubscriptions.push(acceptanceLetterSub);
  }

  loadAcceptanceLetters(callback?: () => void) {
    this.loading = true;
    this.http.get<AcceptanceLetter[]>(`${environment.apiBaseUrl}/InternshipApplication/director/acceptance-letters`).subscribe({
      next: (letters) => {
        this.acceptanceLetters = letters;
        this.loading = false;
        if (callback) {
          callback();
        }
      },
      error: (err) => {
        this.toastr.error('Error al cargar las cartas de aceptación', 'Error');
        this.loading = false;
        if (callback) {
          callback();
        }
      }
    });
  }

  selectLetter(letter: AcceptanceLetter) {
    this.selectedLetter = { ...letter, showCoverLetter: false };
    this.approvalNotes = '';
    this.approvalDecision = null;
  }

  showCoverLetter() {
    if (this.selectedLetter) {
      this.selectedLetter.showCoverLetter = true;
    }
  }

  openApprovalModal(decision: 'Aceptado' | 'Rechazado') {
    if (!this.selectedLetter) {
      this.toastr.error('Debe seleccionar una carta para revisar', 'Error');
      return;
    }
    this.approvalDecision = decision;
  }

  closeApprovalModal() {
    this.approvalDecision = null;
    this.approvalNotes = '';
  }

  submitApproval() {
    if (!this.selectedLetter || !this.approvalDecision) {
      this.toastr.error('Debe seleccionar una decisión', 'Error');
      return;
    }

    this.approving = true;
    const request = {
      status: this.approvalDecision,
      notes: this.approvalNotes.trim() || undefined
    };

    this.http.put(`${environment.apiBaseUrl}/InternshipApplication/${this.selectedLetter.id}/director-approval`, request).subscribe({
      next: (response: any) => {
        this.toastr.success(
          `Carta de aceptación ${this.approvalDecision === 'Aceptado' ? 'con visto bueno otorgado' : 'rechazada'} correctamente`,
          'Revisión Completada'
        );
        this.selectedLetter = null;
        this.approvalNotes = '';
        this.approvalDecision = null;
        this.loadAcceptanceLetters();
        this.approving = false;
      },
      error: (err) => {
        this.toastr.error('Error al procesar la revisión: ' + (err.error?.message || err.statusText), 'Error');
        this.approving = false;
      }
    });
  }

  viewAcceptanceLetter(letter: AcceptanceLetter) {
    if (!letter.acceptanceLetterFilePath) {
      this.toastr.error('No se encontró el archivo de la carta de aceptación', 'Error');
      return;
    }

    const url = `${environment.apiBaseUrl}/InternshipApplication/${letter.id}/acceptance-letter`;
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
        this.toastr.error('Error al abrir el PDF: ' + error.message, 'Error');
      });
    } else {
      this.toastr.error('No se encontró el token de autorización', 'Error');
    }
  }

  viewCV(letter: AcceptanceLetter) {
    if (!letter.cvFilePath) {
      this.toastr.error('No se encontró el archivo del CV', 'Error');
      return;
    }

    const url = `${environment.apiBaseUrl}/InternshipApplication/${letter.id}/cv`;
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
        this.toastr.error('Error al abrir el CV: ' + error.message, 'Error');
      });
    } else {
      this.toastr.error('No se encontró el token de autorización', 'Error');
    }
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

  canReview(letter: AcceptanceLetter): boolean {
    return letter.status === 'REVISION' && !letter.directorApprovalStatus;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ENTREVISTA': return 'bg-blue-100 text-blue-800';
      case 'APROBADA': return 'bg-green-100 text-green-800';
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
      case 'RECHAZADA': return 'Rechazada';
      case 'REVISION': return 'Revisión';
      default: return status;
    }
  }

  getApprovalStatusClass(status: string | undefined): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'Aceptado': return 'bg-green-100 text-green-800';
      case 'Rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getApprovalStatusText(status: string | undefined): string {
    if (!status) return 'Pendiente';
    switch (status) {
      case 'Aceptado': return 'Aceptado';
      case 'Rechazado': return 'Rechazado';
      default: return status;
    }
  }

  getFilteredLetters(): AcceptanceLetter[] {
    if (this.viewMode === 'pending') {
      return this.acceptanceLetters.filter(letter => !letter.directorApprovalStatus);
    } else if (this.viewMode === 'reviewed') {
      return this.acceptanceLetters.filter(letter => letter.directorApprovalStatus != null);
    } else {
      return this.acceptanceLetters;
    }
  }

  openApplicationDetailsModal() {
    this.showApplicationDetailsModal = true;
  }

  closeApplicationDetailsModal() {
    this.showApplicationDetailsModal = false;
  }

  openInterviewDetailsModal() {
    this.showInterviewDetailsModal = true;
  }

  closeInterviewDetailsModal() {
    this.showInterviewDetailsModal = false;
  }

  openEvaluationDetailsModal() {
    this.showEvaluationDetailsModal = true;
  }

  closeEvaluationDetailsModal() {
    this.showEvaluationDetailsModal = false;
  }

  openAcceptanceDetailsModal() {
    this.showAcceptanceDetailsModal = true;
  }

  closeAcceptanceDetailsModal() {
    this.showAcceptanceDetailsModal = false;
  }
}

