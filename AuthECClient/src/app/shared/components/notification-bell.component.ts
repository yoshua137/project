import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../services/notification.service';
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
        class="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header del dropdown -->
        <div class="flex items-center justify-between p-4 border-b bg-blue-50">
          <h3 class="text-lg font-bold text-gray-800">Notificaciones</h3>
          <div class="flex items-center gap-2">
            <button
              *ngIf="unreadCount > 0"
              (click)="markAllAsRead()"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar todas como leídas
            </button>
            <button
              (click)="refresh()"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              title="Actualizar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Lista de notificaciones -->
        <div class="overflow-y-auto flex-1">
          <div *ngIf="notifications.length === 0" class="p-4 text-center text-gray-500">
            No hay notificaciones
          </div>
          <div
            *ngFor="let notification of notifications"
            class="p-4 border-b hover:bg-gray-50 transition cursor-pointer"
            [class.bg-blue-50]="!notification.isRead"
            (click)="handleNotificationClick(notification)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4
                    class="font-semibold text-gray-800"
                    [class.font-bold]="!notification.isRead"
                  >
                    {{ notification.title }}
                  </h4>
                  <span
                    *ngIf="!notification.isRead"
                    class="h-2 w-2 bg-blue-600 rounded-full"
                  ></span>
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ notification.message }}</p>
                <p class="text-xs text-gray-400">
                  {{ formatDate(notification.createdAt) }}
                </p>
              </div>
              <div class="flex flex-col gap-1">
                <button
                  *ngIf="!notification.isRead"
                  (click)="markAsRead(notification.id); $event.stopPropagation()"
                  class="text-xs text-blue-600 hover:text-blue-800"
                  title="Marcar como leída"
                >
                  ✓
                </button>
                <button
                  (click)="deleteNotification(notification.id); $event.stopPropagation()"
                  class="text-xs text-red-600 hover:text-red-800"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Estilos para el scrollbar del dropdown */
    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }
    .overflow-y-auto::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showDropdown = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router
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
    document.addEventListener('click', this.closeDropdownOnClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.closeDropdownOnClickOutside.bind(this));
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.notificationService.refresh();
    }
  }

  closeDropdownOnClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const notificationBell = target.closest('app-notification-bell');
    if (!notificationBell) {
      this.showDropdown = false;
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
          this.router.navigate(['/mis-ofertas-pasantia'], {
            queryParams: { highlightApplicant: relatedEntityId }
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

