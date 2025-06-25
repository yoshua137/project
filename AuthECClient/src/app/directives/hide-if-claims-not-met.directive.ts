import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth.service';

@Directive({
  selector: '[appHideIfClaimsNotMet]',
  standalone: true
})
export class HideIfClaimsNotMetDirective implements OnInit {
  @Input("appHideIfClaimsNotMet") claimReq!: Function;

  constructor(private authService: AuthService,
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    let claims: any = null;
    try {
      claims = this.authService.getClaims();
    } catch (e) {
      // No hay token o está mal formado
      claims = null;
    }
    if (!claims || !this.claimReq(claims)) {
      this.elementRef.nativeElement.style.display = "none";
    }
  }

}
