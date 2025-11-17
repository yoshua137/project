import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SignalRService } from '../../shared/services/signalr.service';
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
    virtualMeetingLink?: string;
    reviewNotes?: string;
    reviewDate?: string;
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
    offerTitle?: string;
    organizationName?: string;
  }>;
}

@Component({
  selector: 'app-teacher-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl w-full">
      <a routerLink="/cursos" class="text-blue-700 hover:underline">&larr; Volver</a>
      <h1 class="text-2xl font-bold mt-2 mb-4">Alumnos inscritos</h1>

      <div *ngIf="loading" class="text-slate-500">Cargando...</div>
      <div *ngIf="!loading && error" class="text-red-600">{{ error }}</div>

      <div *ngIf="!loading && !error" class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <!-- Header -->
        <div class="grid grid-cols-8 md:grid-cols-12 gap-x-6 px-5 py-3 bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wide">
          <div class="col-span-3 flex items-center">Estudiante</div>
          <div class="col-span-2 flex items-center">Fecha inscripción</div>
          <div class="col-span-1 flex items-center justify-center">Postulado</div>
          <div class="col-span-1 flex items-center justify-center">Entrevista</div>
          <div class="col-span-1 flex items-center">Postulaciones</div>
        </div>
        <!-- Rows -->
        <div *ngFor="let s of students" class="grid grid-cols-8 md:grid-cols-12 gap-x-6 gap-y-2 px-5 py-4 items-center border-t">
          <div class="col-span-3">
            <div class="font-semibold text-slate-900 leading-5">{{ s.fullName }}</div>
            <div class="text-slate-600 text-xs">{{ s.email }}</div>
          </div>
          <div class="col-span-2 text-slate-700 text-sm">
            <ng-container *ngIf="s.assignedAtUtc; else noDate">
              {{ s.assignedAtUtc | date:'dd/MM/yyyy, HH:mm' }}
            </ng-container>
            <ng-template #noDate>—</ng-template>
          </div>
          <div class="col-span-1 flex items-center justify-center">
            <button class="inline-flex items-center gap-1 px-2 py-1 transition text-xs font-semibold"
                    [title]="hasApplications(s) ? 'Ya se postuló' : 'No se ha postulado'">
              <svg *ngIf="hasApplications(s)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg *ngIf="!hasApplications(s)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <div class="col-span-1 flex items-center justify-center">
            <button class="inline-flex items-center gap-1 px-2 py-1 transition text-xs font-semibold"
                    [title]="hasInterview(s) ? 'Entrevista programada' : 'Sin entrevista programada'">
              <svg *ngIf="hasInterview(s)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg *ngIf="!hasInterview(s)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <div class="col-span-1 text-slate-800 text-sm truncate">
            <button (click)="openApplicationsView(s)"
                    class="inline-flex items-center gap-1 h-7 px-3 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition text-xs font-semibold"
                    title="Ver postulaciones">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Ver</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Ver Alumno -->
      <div *ngIf="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-30">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
          <button (click)="closeStudentView()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 class="text-xl font-bold mb-4 text-blue-900">Información del Estudiante</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span><span class="font-medium text-gray-700">Nombre:</span> {{ selected.fullName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H8m0 0l4 4m-4-4l4-4" />
              </svg>
              <span><span class="font-medium text-gray-700">Correo:</span> {{ selected.email }}</span>
            </div>
            <div class="md:col-span-2 flex items-center gap-2">
              <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
              <span><span class="font-medium text-gray-700">Carrera:</span> {{ selected.career || '—' }}</span>
            </div>
          </div>

          <div class="mt-4">
            <h3 class="font-semibold text-gray-800 mb-2">Última postulación</h3>
            <div *ngIf="selected.lastApplication; else noAppSel" class="space-y-2 text-sm text-gray-700">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v8m4-4H8" />
                </svg>
                <span><span class="font-medium">Estado:</span> {{ selected.lastApplication.status || '—' }}</span>
              </div>
              <div class="flex items-center gap-2" *ngIf="selected.lastApplication.organizationName">
                <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                <span><span class="font-medium">Empresa:</span> {{ selected.lastApplication.organizationName }}</span>
              </div>
              <div class="flex items-center gap-2" *ngIf="selected.lastApplication.agreementStatus">
                <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><span class="font-medium">Convenio:</span> {{ selected.lastApplication.agreementStatus }}</span>
              </div>
              <div *ngIf="selected.lastApplication.applicationDate"><span class="font-medium">Fecha de aplicación:</span> {{ selected.lastApplication.applicationDate | date:'dd/MM/yyyy, HH:mm' }}</div>
              <div *ngIf="selected.lastApplication.reviewDate"><span class="font-medium">Fecha revisión:</span> {{ selected.lastApplication.reviewDate | date:'dd/MM/yyyy, HH:mm' }}</div>
              <div *ngIf="selected.lastApplication.virtualMeetingLink"><span class="font-medium">Reunión virtual:</span> {{ selected.lastApplication.virtualMeetingLink }}</div>
              <div *ngIf="selected.lastApplication.interviewDateTime"><span class="font-medium">Entrevista:</span> {{ selected.lastApplication.interviewDateTime | date:'dd/MM/yyyy, HH:mm' }}</div>
              <div *ngIf="selected.lastApplication.interviewMode"><span class="font-medium">Modo:</span> {{ selected.lastApplication.interviewMode }}</div>
              <div *ngIf="selected.lastApplication.interviewLink"><span class="font-medium">Link:</span> {{ selected.lastApplication.interviewLink }}</div>
              <div *ngIf="selected.lastApplication.interviewAddress"><span class="font-medium">Dirección:</span> {{ selected.lastApplication.interviewAddress }}</div>
              <div *ngIf="selected.lastApplication.reviewNotes"><span class="font-medium">Notas de revisión:</span> {{ selected.lastApplication.reviewNotes }}</div>
              <div *ngIf="selected.lastApplication.applicationId" class="pt-2">
                <a [href]="cvUrl(selected.lastApplication.applicationId)" target="_blank" class="text-blue-700 hover:underline">Ver CV</a>
              </div>
            </div>
            <ng-template #noAppSel>
              <div class="text-slate-500">— Sin postulaciones registradas —</div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Modal Información Empresa -->
      <div *ngIf="companySelected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-30">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-fade-in">
          <button (click)="closeCompanyView()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 class="text-xl font-bold mb-4 text-blue-900">Información de la Empresa</h2>
          <div class="space-y-2 text-sm text-gray-800">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span><span class="font-medium">Nombre:</span> {{ companySelected.name }}</span>
            </div>
            <div class="flex items-center gap-2" *ngIf="companySelected.status">
              <svg class="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span><span class="font-medium">Convenio:</span> {{ companySelected.status }}</span>
            </div>
            <div class="pt-2" *ngIf="companySelected.offer">
              <h3 class="font-semibold text-gray-900 mb-1">Oferta de pasantía</h3>
              <div class="space-y-1 text-gray-700">
                <div *ngIf="companySelected.offer.title"><span class="font-medium">Título:</span> {{ companySelected.offer.title }}</div>
                <div *ngIf="companySelected.offer.career"><span class="font-medium">Carrera:</span> {{ companySelected.offer.career }}</div>
                <div *ngIf="companySelected.offer.mode"><span class="font-medium">Modalidad:</span> {{ companySelected.offer.mode }}</div>
                <div *ngIf="companySelected.offer.startDate"><span class="font-medium">Inicio:</span> {{ companySelected.offer.startDate | date:'dd/MM/yyyy, HH:mm' }}</div>
                <div *ngIf="companySelected.offer.endDate"><span class="font-medium">Fin:</span> {{ companySelected.offer.endDate | date:'dd/MM/yyyy, HH:mm' }}</div>
                <div *ngIf="companySelected.offer.contactEmail"><span class="font-medium">Email:</span> {{ companySelected.offer.contactEmail }}</div>
                <div *ngIf="companySelected.offer.contactPhone"><span class="font-medium">Teléfono:</span> {{ companySelected.offer.contactPhone }}</div>
              </div>
            </div>
          </div>
          <div class="mt-4 text-right">
            <button (click)="closeCompanyView()" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-semibold">Cerrar</button>
          </div>
        </div>
      </div>

      <!-- Modal Postulaciones -->
      <div *ngIf="applicationsSelected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-30">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
          <button (click)="closeApplicationsView()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 class="text-xl font-bold mb-4 text-blue-900">Postulaciones del estudiante</h2>
          <table class="min-w-full border border-slate-200 rounded overflow-hidden text-sm">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="text-left p-2 border-b">Oferta</th>
                <th class="text-left p-2 border-b">Organización</th>
                <th class="text-left p-2 border-b">Fecha</th>
                <th class="text-left p-2 border-b">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of applicationsSelected" class="odd:bg-white even:bg-slate-50">
                <td class="p-2 border-b">{{ a.offerTitle }}</td>
                <td class="p-2 border-b">{{ a.organizationName }}</td>
                <td class="p-2 border-b">{{ a.applicationDate | date:'dd/MM/yyyy, HH:mm' }}</td>
                <td class="p-2 border-b">
                  <span class="px-2 py-1 rounded-full text-[11px] font-semibold uppercase" [ngClass]="statusClass(a.status)">{{ a.status }}</span>
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
  companySelected: {
    name: string;
    status?: string;
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
  } | null = null;
  applicationsSelected: CourseStudent['applications'] | null = null;
  private signalRSubscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private signalRService: SignalRService
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
      next: res => { this.students = res; this.loading = false; },
      error: err => { this.error = err?.error?.message || 'No se pudieron cargar los estudiantes.'; this.loading = false; }
    });
  }

  openStudentView(student: CourseStudent): void {
    this.selected = student;
  }

  closeStudentView(): void {
    this.selected = null;
  }

  cvUrl(applicationId: number): string {
    // Usar el mismo endpoint que el panel de estudiante
    return `${environment.apiBaseUrl}/InternshipApplication/${applicationId}/cv/student`;
  }

  openCv(s: CourseStudent): void {
    if (s.lastApplication?.applicationId) {
      window.open(this.cvUrl(s.lastApplication.applicationId), '_blank');
    }
  }

  openCompanyView(s: CourseStudent): void {
    this.companySelected = {
      name: s.lastApplication?.organizationName || '—',
      status: s.lastApplication?.agreementStatus || undefined,
      offer: (s.lastApplication as any)?.offer || null
    };
  }
  closeCompanyView(): void {
    this.companySelected = null;
  }

  openApplicationsView(s: CourseStudent): void {
    this.applicationsSelected = s.applications ?? [];
  }
  closeApplicationsView(): void {
    this.applicationsSelected = null;
  }

  statusClass(status?: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENTREVISTA':
        return 'bg-blue-100 text-blue-800';
      case 'APROBADA':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800';
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
}


