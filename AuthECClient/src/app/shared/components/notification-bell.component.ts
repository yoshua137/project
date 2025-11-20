import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Campanita con badge -->
      <button
        (click)="toggleDropdown()"
        class="relative p-2 text-blue-ucb hover:bg-blue-50 rounded-full transition transition-transform transform hover:scale-110 focus:outline-none"
        [class.bg-blue-50]="showDropdown"
        title="Notificaciones"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <!-- Badge con contador -->
        <span
          *ngIf="unreadCount > 0"
          class="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown de notificaciones -->
      <div
        *ngIf="showDropdown"
        class="notification-dropdown absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-blue-50 z-50 overflow-hidden flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <div class="dropdown-header">
          <div>
            <p class="menu-title">Notificaciones</p>
            <p class="menu-subtitle">Últimas novedades del sistema</p>
          </div>
          <div class="header-actions">
            <button
              *ngIf="unreadCount > 0"
              (click)="markAllAsRead()"
              class="link-button"
            >
              Marcar todas
            </button>
            <button
              (click)="refresh()"
              class="icon-button"
              title="Actualizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div class="notification-list">
          <div *ngIf="notifications.length === 0" class="empty-state">
            No hay notificaciones
          </div>
          <article
            *ngFor="let notification of notifications"
            class="notification-item"
            [class.unread]="!notification.isRead"
            (click)="handleNotificationClick(notification)"
          >
            <div class="item-text">
              <div class="item-title">
                <h4>{{ notification.title }}</h4>
                <span *ngIf="!notification.isRead" class="status-dot"></span>
              </div>
              <p class="item-message">{{ notification.message }}</p>
              <p class="item-date">{{ formatDate(notification.createdAt) }}</p>
            </div>
            <div class="item-actions">
              <button
                *ngIf="!notification.isRead"
                class="action-btn confirm"
                title="Marcar como leída"
                (click)="markAsRead(notification.id); $event.stopPropagation()"
              >✓</button>
              <button
                class="action-btn remove"
                title="Eliminar"
                (click)="deleteNotification(notification.id); $event.stopPropagation()"
              >×</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-dropdown {
      max-height: 22rem;
    }

    .dropdown-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .menu-title {
      margin: 0;
      font-weight: 700;
      font-size: 1rem;
      color: #0f172a;
    }

    .menu-subtitle {
      margin: 0.1rem 0 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .link-button {
      border: none;
      background: transparent;
      color: #2563eb;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .icon-button {
      border: none;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 999px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .notification-list {
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .notification-item.unread {
      background: #eff6ff;
    }

    .notification-item:hover {
      background: #f8fafc;
    }

    .item-text h4 {
      margin: 0;
      font-size: 0.95rem;
      color: #0f172a;
    }

    .item-message {
      margin: 0.2rem 0;
      color: #475569;
      font-size: 0.85rem;
    }

    .item-date {
      margin: 0;
      color: #94a3b8;
      font-size: 0.75rem;
    }

    .item-title {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #2563eb;
    }

    .item-actions {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .action-btn {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      border: none;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
    }

    .action-btn.confirm {
      background: #e0f2fe;
      color: #0369a1;
    }

    .action-btn.remove {
      background: #fee2e2;
      color: #b91c1c;
    }

    .empty-state {
      padding: 1.5rem;
      text-align: center;
      color: #94a3b8;
    }

    .notification-list::-webkit-scrollbar {
      width: 6px;
    }

    .notification-list::-webkit-scrollbar-thumb {
      background: #cbd5f5;
      border-radius: 3px;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showDropdown = false;
  private subscriptions: Subscription[] = [];
  private documentHandler = (event: MouseEvent) => this.closeDropdownOnClickOutside(event);

  @Output() dropdownChange = new EventEmitter<boolean>();

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Suscribirse a las notificaciones
    const notificationsSub = this.notificationService.getNotifications().subscribe(
      (notifications) => {
        this.notifications = notifications;
      }
    );
    this.subscriptions.push(notificationsSub);

    // Suscribirse al contador de no leídas
    const unreadCountSub = this.notificationService.getUnreadCount().subscribe(
      (count) => {
        this.unreadCount = count;
      }
    );
    this.subscriptions.push(unreadCountSub);

    // Cargar notificaciones iniciales
    this.notificationService.refresh();

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', this.documentHandler);
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.documentHandler);
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    this.dropdownChange.emit(this.showDropdown);
    if (this.showDropdown) {
      this.notificationService.refresh();
    }
  }

  closeDropdownOnClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const notificationBell = target.closest('app-notification-bell');
    if (!notificationBell) {
      this.showDropdown = false;
      this.dropdownChange.emit(false);
    }
  }

  closeDropdown(): void {
    if (this.showDropdown) {
      this.showDropdown = false;
      this.dropdownChange.emit(false);
    }
  }

  markAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // Actualizado por el servicio
      },
      error: (err) => {
        console.error('Error marking notification as read:', err);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Actualizado por el servicio
      },
      error: (err) => {
        console.error('Error marking all notifications as read:', err);
      }
    });
  }

  deleteNotification(notificationId: number): void {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        // Actualizado por el servicio
      },
      error: (err) => {
        console.error('Error deleting notification:', err);
      }
    });
  }

  refresh(): void {
    this.notificationService.refresh();
  }

  handleNotificationClick(notification: Notification): void {
    this.showDropdown = false;
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
    const { type, relatedEntityId, relatedEntityType } = notification;
    if (!relatedEntityId || !relatedEntityType) return;

    switch (type) {
      case 'APPLICATION_RECEIVED':
      case 'ATTENDANCE_CONFIRMED':
        if (relatedEntityType === 'InternshipApplication') {
          // Usar navigateByUrl para forzar la actualización incluso si ya estás en la misma ruta
          this.router.navigateByUrl(`/mis-ofertas-pasantia?highlightApplicant=${relatedEntityId}`, {
            skipLocationChange: false
          }).then(() => {
            // Forzar detección de cambios si es necesario
            setTimeout(() => {
              // El observable de queryParams debería detectar el cambio
            }, 100);
          });
        }
        break;
      case 'APPLICATION_ACCEPTED':
      case 'APPLICATION_STATUS_CHANGED':
        if (
          relatedEntityType === 'InternshipApplication' &&
          relatedEntityId
        ) {
          const message = notification.message?.toLowerCase() ?? '';
          const isAccepted =
            type === 'APPLICATION_ACCEPTED' || message.includes('acept');
          if (isAccepted) {
            this.router.navigate(['/mis-aplicaciones'], {
              queryParams: { highlightApplication: relatedEntityId }
            });
          }
        }
        break;
      case 'INTERVIEW_SCHEDULED':
        if (relatedEntityType === 'InternshipApplication' && relatedEntityId) {
          this.router.navigate(['/mis-aplicaciones'], {
            queryParams: { highlightApplication: relatedEntityId, showInterview: true }
          });
        }
        break;
      case 'STUDENT_ACCEPTANCE_CONFIRMED':
        if (relatedEntityType === 'InternshipApplication' && relatedEntityId) {
          // Redirigir a la página de ofertas de la organización para ver el postulante
          this.router.navigateByUrl(`/mis-ofertas-pasantia?highlightApplicant=${relatedEntityId}`, {
            skipLocationChange: false
          });
        }
        break;
      case 'ACCEPTANCE_LETTER_RECEIVED':
        if (relatedEntityType === 'InternshipApplication' && relatedEntityId) {
          // Redirigir a la página de cartas de aceptación del director
          this.router.navigate(['/cartas-aceptacion'], {
            queryParams: { highlightLetter: relatedEntityId }
          });
        }
        break;
      case 'AGREEMENT_REQUEST_RECEIVED':
        if (relatedEntityType === 'AgreementRequest') {
          // Redirigir al director a la página de revisión de convenios
          this.router.navigate(['/agreement-review'], {
            queryParams: { highlightAgreement: relatedEntityId }
          });
        }
        break;
      case 'DIRECTOR_APPROVAL':
        if (relatedEntityType === 'InternshipApplication' && relatedEntityId) {
          // Verificar el rol del usuario para redirigir correctamente
          const userRole = this.authService.getClaims()?.role;
          if (userRole === 'Student') {
            // Redirigir al estudiante a sus aplicaciones
            this.router.navigateByUrl(`/mis-aplicaciones?highlightApplication=${relatedEntityId}`, {
              skipLocationChange: false
            });
          } else if (userRole === 'Organization') {
            // Redirigir a la organización a sus ofertas para ver el postulante
            this.router.navigateByUrl(`/mis-ofertas-pasantia?highlightApplicant=${relatedEntityId}`, {
              skipLocationChange: false
            });
          }
        }
        break;
      case 'AGREEMENT_APPROVED':
      case 'AGREEMENT_REJECTED':
        if (relatedEntityType === 'AgreementRequest') {
          this.router.navigate(['/mis-convenios'], {
            queryParams: { highlightAgreement: relatedEntityId }
          });
        }
        break;
      default:
        break;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return 'Ahora mismo';
    } else if (minutes < 60) {
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (hours < 24) {
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (days < 7) {
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}

