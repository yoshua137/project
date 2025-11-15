import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { HideIfClaimsNotMetDirective } from '../../directives/hide-if-claims-not-met.directive';
import { claimReq } from "../../shared/utils/claimReq-utils";
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { BackendStatusBannerComponent } from '../../shared/components/backend-status-banner.component';
import { NotificationBellComponent } from '../../shared/components/notification-bell.component';
import { UserService } from '../../shared/services/user.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HideIfClaimsNotMetDirective, CommonModule, BackendStatusBannerComponent, NotificationBellComponent],
  templateUrl: './main-layout.component.html',
  styles: ``,
  animations: [
    trigger('slideDownUp', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateY(-100%)', opacity: 0 }))
      ])
    ]),
    trigger('navSlide', [
      transition(':enter', []), // no-op para evitar advertencias
      transition('* => *', [
        animate('300ms cubic-bezier(0.4,0,0.2,1)')
      ])
    ])
  ]
})
export class MainLayoutComponent implements OnInit {
  showHeaderMenu = true;
  showHeaderBar = true;
  profilePhotoUrl: string | null = null;
  isPhotoLoading = false;
  profileInitials = '?';
  showProfileMenu = false;

  constructor(private router: Router,
    public authService: AuthService,
    private userService: UserService) { }

  claimReq = claimReq

  ngOnInit(): void {
    this.loadProfilePhoto();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showHeaderBar = window.scrollY === 0;
  }

  @HostListener('document:click')
  closeProfileMenu() {
    this.showProfileMenu = false;
  }

  onLogout() {
    this.authService.deleteToken();
    this.router.navigateByUrl('/user/login');
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  navigateToProfile() {
    this.showProfileMenu = false;
    this.router.navigate(['/perfil']);
  }

  logoutFromMenu() {
    this.showProfileMenu = false;
    this.onLogout();
  }

  private loadProfilePhoto() {
    if (!this.authService.isLoggedIn()) {
      this.profilePhotoUrl = null;
      this.profileInitials = '?';
      return;
    }
    this.isPhotoLoading = true;
    this.userService.getUserProfile().subscribe({
      next: (profile: any) => {
        this.profilePhotoUrl = profile.photoUrl ?? profile.PhotoUrl ?? null;
        this.profileInitials = this.computeInitials(profile.fullName ?? profile.FullName, profile.email ?? profile.Email);
        this.isPhotoLoading = false;
      },
      error: () => {
        this.profilePhotoUrl = null;
        this.profileInitials = '?';
        this.isPhotoLoading = false;
      }
    });
  }

  private computeInitials(fullName?: string, email?: string): string {
    const source = fullName?.trim();
    if (source) {
      const parts = source.split(/\s+/).filter(Boolean);
      if (parts.length) {
        return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
      }
    }
    if (email && email.length) {
      return email[0].toUpperCase();
    }
    return '?';
  }
}
