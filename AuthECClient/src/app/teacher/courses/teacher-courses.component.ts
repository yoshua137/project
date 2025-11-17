import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-teacher-courses',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-3xl w-full">
      <div class="bg-white rounded-2xl border border-slate-200 shadow p-6 flex flex-col gap-3">
        <h1 class="text-xl font-bold text-slate-900">Cursos del Docente</h1>
        <p class="text-slate-600">Crea un curso para la gestión actual. Se generará un código único de 6 dígitos.</p>
        <div class="flex gap-2">
          <button (click)="createCourse()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Crear curso de la gestión actual
          </button>
          <span *ngIf="creating" class="text-slate-500">Creando...</span>
        </div>
        <div *ngIf="lastCourse" class="mt-3 bg-blue-50 border border-blue-200 rounded p-4">
          <p class="text-blue-900 font-semibold">Curso creado</p>
          <p class="text-blue-800">Gestión: {{ lastCourse.term }}</p>
          <p class="text-blue-900 text-2xl font-bold tracking-widest">Código: {{ lastCourse.code }}</p>
          <p class="text-slate-500 text-sm">Creado: {{ lastCourse.createdAtUtc | date:'short' }}</p>
        </div>
        <div class="mt-4">
          <h2 class="text-slate-800 font-semibold">Mis cursos</h2>
          <p class="text-slate-600 text-sm mt-1">
            Comparte el <span class="font-semibold">código del curso</span> con tus estudiantes para que lo introduzcan al
            registrarse y queden inscritos en tu curso.
          </p>
          <div *ngIf="loading" class="text-slate-500">Cargando...</div>
          <div *ngIf="!loading && courses.length === 0" class="text-slate-500">Aún no tienes cursos.</div>
          <ul *ngIf="!loading && courses.length > 0" class="divide-y divide-slate-200 mt-2">
            <li *ngFor="let c of courses"
                class="py-3 px-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded"
                (click)="openDetail(c.id)">
              <div class="flex flex-col">
                <p class="font-medium text-slate-900">Gestión: {{ c.term }}</p>
                <p class="text-slate-600 text-sm">Creado: {{ c.createdAtUtc | date:'dd/MM/yyyy, HH:mm' }}</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-blue-700 font-bold tracking-widest text-lg">{{ c.code }}</div>
                <button
                  (click)="onDeleteClick($event, c.id)"
                  class="rounded-full p-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition"
                  title="Eliminar curso">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>
        <p *ngIf="error" class="text-red-600">{{ error }}</p>
      </div>
    </section>
  `,
  styles: []
})
export class TeacherCoursesComponent implements OnInit {
  creating = false;
  error = '';
  lastCourse: { code: string, term: string, createdAtUtc: string } | null = null;
  loading = false;
  courses: Array<{ id: string; code: string; term: string; createdAtUtc: string }> = [];

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.loading = true;
    this.http.get<Array<{ id: string; code: string; term: string; createdAtUtc: string }>>(`${environment.apiBaseUrl}/TeacherCourses/mine`)
      .subscribe({
        next: (res) => {
          this.courses = res;
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar tus cursos.';
          this.loading = false;
        }
      });
  }

  createCourse(): void {
    if (this.creating) return;
    this.creating = true;
    this.error = '';
    this.http.post<{ code: string; term: string; createdAtUtc: string }>(`${environment.apiBaseUrl}/TeacherCourses`, {})
      .subscribe({
        next: (res) => {
          this.lastCourse = res;
          this.creating = false;
          this.loadCourses();
          this.toastr.success('Curso creado', 'Éxito');
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo crear el curso. Intenta nuevamente.';
          this.creating = false;
          this.toastr.error(this.error, 'Error');
        }
      });
  }

  deleteCourse(id: string): void {
    if (!confirm('¿Eliminar este curso? Esta acción no se puede deshacer.')) return;
    this.http.delete(`${environment.apiBaseUrl}/TeacherCourses/${id}`).subscribe({
      next: () => {
        this.toastr.success('Curso eliminado.', 'Éxito');
        this.loadCourses();
      },
      error: (err) => {
        const msg = err?.status === 409
          ? (err?.error?.message ?? 'No se puede eliminar: tiene estudiantes inscritos.')
          : (err?.error?.message ?? 'No se pudo eliminar el curso.');
        this.toastr.error(msg, 'Error');
      }
    });
  }

  onDeleteClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.deleteCourse(id);
  }

  openDetail(id: string): void {
    this.router.navigate(['/cursos', id]);
  }
}

