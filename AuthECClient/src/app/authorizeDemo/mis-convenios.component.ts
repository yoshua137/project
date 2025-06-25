import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

interface AgreementRequest {
  id: number;
  organizationName: string;
  directorName: string;
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
  styles: ''
})
export class MisConveniosComponent implements OnInit {
  agreementRequests: AgreementRequest[] = [];
  loading = true;
  public environment = environment;

  constructor(private http: HttpClient) {}

  ngOnInit() {
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'Accepted': return 'text-success';
      case 'Rejected': return 'text-danger';
      default: return 'text-secondary';
    }
  }
} 