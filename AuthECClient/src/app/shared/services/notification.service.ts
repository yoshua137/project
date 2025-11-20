import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SignalRService } from './signalr.service';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private signalRService: SignalRService
  ) {
    // Cargar notificaciones y contador solo si hay un token (usuario autenticado)
    // Esto evita errores cuando el servicio se inicializa antes de que el usuario esté autenticado
    try {
      this.loadNotifications();
      this.loadUnreadCount();
      this.initializeSignalR();
      this.setupSignalRListeners();
    } catch (error) {
      console.warn('NotificationService: Error inicializando servicio de notificaciones', error);
    }
  }

  private async initializeSignalR(): Promise<void> {
    try {
      await this.signalRService.startConnection();
    } catch (error) {
      console.error('Error initializing SignalR:', error);
    }
  }

  private setupSignalRListeners(): void {
    // Escuchar eventos de SignalR y actualizar notificaciones
    this.signalRService.onInterviewScheduled().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onApplicationStatusChanged().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onAttendanceConfirmed().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onAgreementRequestReceived().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onApplicationReceived().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onStudentAcceptanceConfirmed().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });

    this.signalRService.onAcceptanceLetterReceived().subscribe((notification) => {
      if (notification) {
        this.refresh();
      }
    });
  }

  // Cargar notificaciones
  loadNotifications(page: number = 1, pageSize: number = 20): void {
    this.http.get<Notification[]>(`${environment.apiBaseUrl}/Notification?page=${page}&pageSize=${pageSize}`)
      .subscribe({
        next: (notifications) => {
          this.notifications$.next(notifications);
        },
        error: (err) => {
          // Silenciar errores de notificaciones (tabla puede no existir todavía)
          // Establecer lista vacía sin mostrar error al usuario
          console.warn('NotificationService: No se pudieron cargar las notificaciones (la tabla puede no existir todavía):', err.status);
          this.notifications$.next([]);
        }
      });
  }

  // Cargar contador de no leídas
  loadUnreadCount(): void {
    this.http.get<number>(`${environment.apiBaseUrl}/Notification/unread-count`)
      .subscribe({
        next: (count) => {
          this.unreadCount$.next(count);
        },
        error: (err) => {
          // Silenciar errores de notificaciones (tabla puede no existir todavía)
          // Establecer contador en 0 sin mostrar error al usuario
          console.warn('NotificationService: No se pudo cargar el contador (la tabla puede no existir todavía):', err.status);
          this.unreadCount$.next(0);
        }
      });
  }

  // Obtener notificaciones como Observable
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  // Obtener contador de no leídas como Observable
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // Marcar notificación como leída
  markAsRead(notificationId: number): Observable<void> {
    return new Observable(observer => {
      this.http.put(`${environment.apiBaseUrl}/Notification/${notificationId}/read`, {})
        .subscribe({
          next: () => {
            // Actualizar estado local
            const notifications = this.notifications$.value;
            const index = notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
              notifications[index].isRead = true;
              this.notifications$.next(notifications);
            }
            // Recargar contador
            this.loadUnreadCount();
            observer.next();
            observer.complete();
          },
          error: (err) => {
            console.error('Error marking notification as read:', err);
            observer.error(err);
          }
        });
    });
  }

  // Marcar todas como leídas
  markAllAsRead(): Observable<void> {
    return new Observable(observer => {
      this.http.put(`${environment.apiBaseUrl}/Notification/mark-all-read`, {})
        .subscribe({
          next: () => {
            // Actualizar estado local
            const notifications = this.notifications$.value.map(n => ({ ...n, isRead: true }));
            this.notifications$.next(notifications);
            // Recargar contador
            this.loadUnreadCount();
            observer.next();
            observer.complete();
          },
          error: (err) => {
            console.error('Error marking all notifications as read:', err);
            observer.error(err);
          }
        });
    });
  }

  // Eliminar notificación
  deleteNotification(notificationId: number): Observable<void> {
    return new Observable(observer => {
      this.http.delete(`${environment.apiBaseUrl}/Notification/${notificationId}`)
        .subscribe({
          next: () => {
            // Actualizar estado local
            const notifications = this.notifications$.value.filter(n => n.id !== notificationId);
            this.notifications$.next(notifications);
            // Recargar contador
            this.loadUnreadCount();
            observer.next();
            observer.complete();
          },
          error: (err) => {
            console.error('Error deleting notification:', err);
            observer.error(err);
          }
        });
    });
  }

  // Refrescar notificaciones
  refresh(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }
}

