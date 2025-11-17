import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface InterviewScheduledNotification {
  applicationId: number;
  offerTitle: string;
  interviewDateTime: string | null;
  interviewMode: string | null;
  interviewLink: string | null;
  interviewAddress: string | null;
}

export interface ApplicationStatusChangedNotification {
  applicationId: number;
  offerTitle: string;
  status: string;
}

export interface AttendanceConfirmedNotification {
  applicationId: number;
  studentId: string;
  studentName: string;
  offerTitle: string;
  willAttend: boolean;
}

export interface AgreementRequestReceivedNotification {
  agreementRequestId: number;
  organizationName: string;
  department: string;
  requestDate: string;
}

export interface ApplicationReceivedNotification {
  applicationId: number;
  offerId: number;
  offerTitle: string;
  studentId: string;
  studentName: string;
  studentCareer: string;
  applicationDate: string;
}

export interface StudentEnrolledNotification {
  courseId: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCareer: string | null;
  enrolledAt: string;
}

export interface StudentApplicationUpdatedNotification {
  studentId: string;
  applicationId: number;
  offerTitle: string;
  status: string;
  interviewDateTime?: string | null;
  interviewMode?: string | null;
  applicationDate?: string;
}

export interface StudentAcceptanceConfirmedNotification {
  applicationId: number;
  studentId: string;
  studentName: string;
  offerTitle: string;
  confirmedDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private connectionState$ = new BehaviorSubject<boolean>(false);
  private interviewScheduled$ = new BehaviorSubject<InterviewScheduledNotification | null>(null);
  private applicationStatusChanged$ = new BehaviorSubject<ApplicationStatusChangedNotification | null>(null);
  private attendanceConfirmed$ = new BehaviorSubject<AttendanceConfirmedNotification | null>(null);
  private agreementRequestReceived$ = new BehaviorSubject<AgreementRequestReceivedNotification | null>(null);
  private applicationReceived$ = new BehaviorSubject<ApplicationReceivedNotification | null>(null);
  private studentEnrolled$ = new BehaviorSubject<StudentEnrolledNotification | null>(null);
  private studentApplicationUpdated$ = new BehaviorSubject<StudentApplicationUpdatedNotification | null>(null);
  private studentAcceptanceConfirmed$ = new BehaviorSubject<StudentAcceptanceConfirmedNotification | null>(null);

  constructor(private authService: AuthService) {}

  /**
   * Inicia la conexión con SignalR
   */
  async startConnection(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('No hay token disponible para conectar SignalR');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl.replace('/api', '')}/hubs/internship`, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds < 60000) {
            return 2000; // Reintentar cada 2 segundos durante el primer minuto
          } else {
            return 10000; // Luego cada 10 segundos
          }
        }
      })
      .build();

    // Registrar handlers para los eventos
    this.hubConnection.on('InterviewScheduled', (data: InterviewScheduledNotification) => {
      this.interviewScheduled$.next(data);
    });

    this.hubConnection.on('ApplicationStatusChanged', (data: ApplicationStatusChangedNotification) => {
      this.applicationStatusChanged$.next(data);
    });

    this.hubConnection.on('AttendanceConfirmed', (data: AttendanceConfirmedNotification) => {
      this.attendanceConfirmed$.next(data);
    });

    this.hubConnection.on('AgreementRequestReceived', (data: AgreementRequestReceivedNotification) => {
      this.agreementRequestReceived$.next(data);
    });

    this.hubConnection.on('ApplicationReceived', (data: ApplicationReceivedNotification) => {
      this.applicationReceived$.next(data);
    });

    this.hubConnection.on('StudentEnrolled', (data: StudentEnrolledNotification) => {
      this.studentEnrolled$.next(data);
    });

    this.hubConnection.on('StudentApplicationUpdated', (data: StudentApplicationUpdatedNotification) => {
      this.studentApplicationUpdated$.next(data);
    });

    this.hubConnection.on('StudentAcceptanceConfirmed', (data: StudentAcceptanceConfirmedNotification) => {
      this.studentAcceptanceConfirmed$.next(data);
    });

    // Manejar cambios de estado de conexión
    this.hubConnection.onreconnecting(() => {
      this.connectionState$.next(false);
      console.log('SignalR: Reconectando...');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionState$.next(true);
      console.log('SignalR: Reconectado');
    });

    this.hubConnection.onclose((error) => {
      this.connectionState$.next(false);
      console.log('SignalR: Conexión cerrada', error);
    });

    try {
      await this.hubConnection.start();
      this.connectionState$.next(true);
      console.log('SignalR: Conectado exitosamente');
    } catch (error) {
      console.error('Error al conectar SignalR:', error);
      this.connectionState$.next(false);
    }
  }

  /**
   * Detiene la conexión con SignalR
   */
  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionState$.next(false);
      console.log('SignalR: Conexión detenida');
    }
  }

  /**
   * Observable para el estado de conexión
   */
  getConnectionState(): Observable<boolean> {
    return this.connectionState$.asObservable();
  }

  /**
   * Observable para notificaciones de entrevista programada
   */
  onInterviewScheduled(): Observable<InterviewScheduledNotification | null> {
    return this.interviewScheduled$.asObservable();
  }

  /**
   * Observable para cambios de estado de aplicación
   */
  onApplicationStatusChanged(): Observable<ApplicationStatusChangedNotification | null> {
    return this.applicationStatusChanged$.asObservable();
  }

  /**
   * Observable para confirmación de asistencia
   */
  onAttendanceConfirmed(): Observable<AttendanceConfirmedNotification | null> {
    return this.attendanceConfirmed$.asObservable();
  }

  /**
   * Observable para solicitudes de convenio recibidas (para directores)
   */
  onAgreementRequestReceived(): Observable<AgreementRequestReceivedNotification | null> {
    return this.agreementRequestReceived$.asObservable();
  }

  /**
   * Observable para nuevas postulaciones recibidas (para organizaciones)
   */
  onApplicationReceived(): Observable<ApplicationReceivedNotification | null> {
    return this.applicationReceived$.asObservable();
  }

  /**
   * Observable para cuando un estudiante se inscribe a un curso (para profesores)
   */
  onStudentEnrolled(): Observable<StudentEnrolledNotification | null> {
    return this.studentEnrolled$.asObservable();
  }

  /**
   * Observable para cuando se actualiza una postulación de un estudiante (para profesores)
   */
  onStudentApplicationUpdated(): Observable<StudentApplicationUpdatedNotification | null> {
    return this.studentApplicationUpdated$.asObservable();
  }

  /**
   * Observable para cuando un estudiante confirma su aceptación (para organizaciones)
   */
  onStudentAcceptanceConfirmed(): Observable<StudentAcceptanceConfirmedNotification | null> {
    return this.studentAcceptanceConfirmed$.asObservable();
  }

  /**
   * Limpia las notificaciones actuales
   */
  clearNotifications(): void {
    this.interviewScheduled$.next(null);
    this.applicationStatusChanged$.next(null);
    this.attendanceConfirmed$.next(null);
    this.agreementRequestReceived$.next(null);
    this.applicationReceived$.next(null);
    this.studentEnrolled$.next(null);
    this.studentApplicationUpdated$.next(null);
    this.studentAcceptanceConfirmed$.next(null);
  }
}

