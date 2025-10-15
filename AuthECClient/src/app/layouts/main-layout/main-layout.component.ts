import { Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { HideIfClaimsNotMetDirective } from '../../directives/hide-if-claims-not-met.directive';
import { claimReq } from "../../shared/utils/claimReq-utils";
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { BackendStatusBannerComponent } from '../../shared/components/backend-status-banner.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HideIfClaimsNotMetDirective, CommonModule, BackendStatusBannerComponent],
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
export class MainLayoutComponent {
  showHeaderMenu = true;
  showHeaderBar = true;

  constructor(private router: Router,
    private authService: AuthService) { }

  claimReq = claimReq

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showHeaderBar = window.scrollY === 0;
  }

  onLogout() {
    this.authService.deleteToken();
    this.router.navigateByUrl('/user/login');
  }
}
