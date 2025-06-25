import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

interface Invitation {
  token: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
}

interface GenerateInvitationResponse {
  token: string;
  role: string;
  expiresAt: string;
  registrationUrl: string;
}

@Component({
  selector: 'app-registration-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration-invitations.component.html',
  styles: ''
})
export class RegistrationInvitationsComponent implements OnInit {
  invitations: Invitation[] = [];
  loading = false;
  generating = false;
  selectedRole = 'Teacher';
  generatedUrl = '';
  selectedInvitation: Invitation | null = null;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadInvitations();
  }

  loadInvitations() {
    this.loading = true;
    this.http.get<Invitation[]>(`${environment.apiBaseUrl}/RegistrationInvitation/list`).subscribe({
      next: (invitations) => {
        this.invitations = invitations;
        this.loading = false;
      },
      error: (err) => {
        this.toastr.error('Error al cargar las invitaciones', 'Error');
        this.loading = false;
      }
    });
  }

  selectInvitation(invitation: Invitation) {
    this.selectedInvitation = invitation;
    this.generatedUrl = this.generateInvitationUrl(invitation);
  }

  generateInvitationUrl(invitation: Invitation): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/user/registration?token=${invitation.token}&role=${invitation.role}`;
  }

  clearSelection() {
    this.selectedInvitation = null;
    this.generatedUrl = '';
  }

  generateInvitation() {
    this.generating = true;
    this.http.post<GenerateInvitationResponse>(`${environment.apiBaseUrl}/RegistrationInvitation/generate`, {
      role: this.selectedRole
    }).subscribe({
      next: (response) => {
        this.generatedUrl = response.registrationUrl;
        this.toastr.success('Invitación generada correctamente', 'Éxito');
        this.loadInvitations(); // Recargar lista
        this.generating = false;
      },
      error: (err) => {
        this.toastr.error('Error al generar la invitación: ' + (err.error?.message || err.statusText), 'Error');
        this.generating = false;
      }
    });
  }

  copyToClipboard(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('URL copiada al portapapeles', 'Copiado');
    }).catch(() => {
      this.toastr.error('Error al copiar la URL', 'Error');
    });
  }

  getStatusClass(invitation: Invitation): string {
    if (invitation.isUsed) return 'text-success';
    if (new Date(invitation.expiresAt) < new Date()) return 'text-danger';
    return 'text-warning';
  }

  getStatusText(invitation: Invitation): string {
    if (invitation.isUsed) return 'Usada';
    if (new Date(invitation.expiresAt) < new Date()) return 'Expirada';
    return 'Activa';
  }
} 