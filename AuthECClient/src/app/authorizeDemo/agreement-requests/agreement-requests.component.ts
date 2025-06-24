import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

interface Director {
  id: string;
  fullName: string;
  gender: string;
  dob: string;
  department: string;
}

@Component({
  selector: 'app-agreement-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agreement-requests.component.html',
  styles: ''
})
export class AgreementRequestsComponent {
  departments = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      image: 'assets/health.jpg'
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingeniería y Ciencias Exactas',
      image: 'assets/engineering.jpg'
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      image: 'assets/social.jpg'
    },
    {
      name: 'Administración y Economía',
      value: 'Administración y Economía',
      image: 'assets/economy.jpg'
    }
  ];
  selectedDepartment: string | null = null;
  directors: Director[] = [];
  loadingDirectors = false;

  constructor(private http: HttpClient) {}

  selectDepartment(dep: string) {
    this.selectedDepartment = dep;
    this.directors = [];
    this.loadDirectors(dep);
  }

  loadDirectors(department: string) {
    this.loadingDirectors = true;
    this.http.get<Director[]>(`${environment.apiBaseUrl}/Director`).subscribe({
      next: (directors) => {
        this.directors = directors.filter(d => d.department === department);
        this.loadingDirectors = false;
      },
      error: () => {
        this.directors = [];
        this.loadingDirectors = false;
      }
    });
  }

  backToDepartments() {
    this.selectedDepartment = null;
    this.directors = [];
  }
} 