import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { HideIfClaimsNotMetDirective } from '../../directives/hide-if-claims-not-met.directive';
import { claimReq } from "../../shared/utils/claimReq-utils";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HideIfClaimsNotMetDirective, CommonModule],
  templateUrl: './main-layout.component.html',
  styles: ``
})
export class MainLayoutComponent {
  showHeaderMenu = true;

  constructor(private router: Router,
    private authService: AuthService) { }

  claimReq = claimReq

  onLogout() {
    this.authService.deleteToken();
    this.router.navigateByUrl('/user/login');
  }
}
