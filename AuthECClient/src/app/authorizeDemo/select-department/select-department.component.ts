import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Department {
  name: string;
  value: string;
  image: string;
}

@Component({
  selector: 'app-select-department',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-department.component.html',
  styles: ''
})
export class SelectDepartmentComponent implements OnInit {
  allDepartments: Department[] = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      image: 'assets/health.jpg'
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingenieria y Ciencias Exactas',
      image: 'assets/engineering.jpg'
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      image: 'assets/social.jpg'
    },
    {
      name: 'Administración y Economía',
      value: 'Administracion y Economia',
      image: 'assets/economy.jpg'
    }
  ];
  
  approvedDepartments: string[] = [];
  availableDepartments: Department[] = [];
  loading = true;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadApprovedDepartments();
  }

  loadApprovedDepartments() {
    this.http.get<string[]>(`${environment.apiBaseUrl}/AgreementRequest/organization/approved-departments`).subscribe({
      next: (departments) => {
        this.approvedDepartments = departments;
        this.availableDepartments = this.allDepartments.filter(dept => 
          this.approvedDepartments.includes(dept.value)
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading approved departments:', err);
        this.loading = false;
      }
    });
  }

  selectDepartment(department: Department) {
    this.router.navigate(['/publicar-pasantia'], { 
      queryParams: { department: department.value } 
    });
  }
}