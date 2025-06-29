import { Component, AfterViewInit } from '@angular/core';
import { RegistrationComponent } from './registration/registration.component';
import { ChildrenOutletContexts, RouterOutlet } from '@angular/router';
import { trigger, style, animate, transition, query } from "@angular/animations";

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [RegistrationComponent, RouterOutlet],
  templateUrl: './user.component.html',
  styles: ``,
  animations: [
    trigger('routerFadeIn', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0 }),
          animate('1s ease-in-out', style({ opacity: 1 }))
        ], { optional: true }),
      ])
    ])
  ]
})
export class UserComponent implements AfterViewInit {
  showLogin: boolean = true;

  constructor(private context: ChildrenOutletContexts) { }

  ngAfterViewInit(): void {
    const tryPlayVideoBg = () => {
      const vid = document.getElementById('bgVideo') as HTMLVideoElement | null;
      if (vid) {
        vid.muted = true;
        vid.removeAttribute('controls');
        vid.volume = 0;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setTimeout(() => { vid.play().catch(()=>{}); }, 500);
          });
        }
      }
    };
    tryPlayVideoBg();
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) tryPlayVideoBg();
    });
  }

  getRouteUrl() {
    return this.context.getContext('primary')?.route?.url;
  }

}
