import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

interface AgreementRequest {
  id: number;
  organizationName: string;
  directorName: string;
  directorDepartment: string;
  requestDate: string;
  reviewDate: string | null;
  status: string;
  description: string;
  pdfFilePath: string;
}

@Component({
  selector: 'app-mis-convenios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-convenios.component.html',
  styles: `
    /* Efecto FADE infinito hasta que el mouse pase por la fila */
    .fade-row {
      transition: background-color 0.5s ease-in-out;
    }

    /* Aplicar animación solo cuando NO ha sido tocada por el mouse */
    .fade-row:not(.fade-stopped) {
      animation: hoverFade 3s ease-in-out infinite;
    }

    /* Detener completamente la animación cuando el cursor está sobre la fila */
    .fade-row:hover {
      animation: none !important;
      background-color: rgba(59, 130, 246, 0.15) !important;
    }

    /* Detener permanentemente la animación después de que el mouse haya pasado */
    .fade-row.fade-stopped {
      animation: none !important;
      background-color: transparent !important;
    }

    /* Animación de fade in/out como hover */
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

    /* Resaltado para convenio específico */
    .fade-row.highlighted {
      background-color: rgba(59, 130, 246, 0.2);
      animation: none !important;
    }

    /* Asegurar que el resaltado no tenga animación incluso sin hover */
    .fade-row.highlighted:not(:hover) {
      animation: none !important;
    }
  `
})
export class MisConveniosComponent implements OnInit {
  agreementRequests: AgreementRequest[] = [];
  loading = true;
  public environment = environment;
  highlightedAgreementId: number | null = null;
  stoppedFadeRows = new Set<number>(); // Rastrear filas donde el fade se ha detenido

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Verificar si hay un queryParam para resaltar un convenio
    this.route.queryParams.subscribe(params => {
      if (params['highlightAgreement']) {
        this.highlightedAgreementId = +params['highlightAgreement'];
        // Remover el resaltado después de 3 segundos
        setTimeout(() => {
          this.highlightedAgreementId = null;
        }, 3000);
      }
    });

    this.http.get<AgreementRequest[]>(`${environment.apiBaseUrl}/AgreementRequest/organization/mine`).subscribe({
      next: (requests) => {
        this.agreementRequests = requests;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // Detener el fade permanentemente cuando el mouse pasa por la fila
  stopFadeOnHover(agreementId: number) {
    this.stoppedFadeRows.add(agreementId);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Accepted': return 'text-success';
      case 'Rejected': return 'text-danger';
      default: return 'text-secondary';
    }
  }

  abrirPDF(pdfFilePath: string) {
    this.http.get(`${this.environment.apiBaseUrl}/AgreementRequest/pdf/${pdfFilePath}`, {
      responseType: 'blob'
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }
} 