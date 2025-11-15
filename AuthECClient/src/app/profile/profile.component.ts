import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth.service';
import { UserService } from '../shared/services/user.service';

interface UserProfile {
  email: string;
  fullName: string;
  career?: string;
  photoUrl?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = false;
  error = '';
  claims: any = null;
  profilePhotoUrl: string | null = null;
  uploadingPhoto = false;
  uploadError = '';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.claims = this.authService.getClaims();
    this.fetchProfile();
  }

  fetchProfile(): void {
    this.loading = true;
    this.error = '';
    this.userService.getUserProfile().subscribe({
      next: (res: any) => {
        this.profile = {
          email: res.email ?? res.Email ?? '',
          fullName: res.fullName ?? res.FullName ?? '',
          career: res.career ?? this.claims?.career ?? this.claims?.Career,
          photoUrl: res.photoUrl ?? res.PhotoUrl
        };
        this.profilePhotoUrl = this.profile.photoUrl ?? null;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar tu perfil. Intenta nuevamente en unos segundos.';
        this.loading = false;
      }
    });
  }

  get roleLabel(): string {
    const roleClaim = this.claims?.role
      ?? this.claims?.Role
      ?? this.claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      ?? '';
    const role = roleClaim.toString();
    if (!role) return 'Sin rol asignado';
    const map: Record<string, string> = {
      'Student': 'Estudiante',
      'Teacher': 'Docente',
      'Director': 'Director(a)',
      'Organization': 'Organización',
      'Admin': 'Administrador'
    };
    const translated = role.split(',')
      .map((r: string) => map[r.trim()] ?? r.trim())
      .filter((value: string, index: number, self: string[]) => value && self.indexOf(value) === index);
    return translated.join(', ');
  }

  get career(): string {
    return this.profile?.career
      ?? this.claims?.career
      ?? this.claims?.Career
      ?? 'No especificada';
  }

  get showCareerSection(): boolean {
    const normalized = this.roleLabel
      .toLowerCase()
      .split(',')
      .map(part => part.trim());
    return !normalized.includes('organización');
  }

  get initials(): string {
    if (this.profile?.fullName) {
      const parts = this.profile.fullName.split(' ').filter(Boolean);
      return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    }
    return '??';
  }

  get hasPhoto(): boolean {
    return !!this.profilePhotoUrl;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.uploadError = 'El archivo debe ser una imagen.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uploadError = 'La imagen no puede superar los 2MB.';
      return;
    }
    this.uploadError = '';
    this.uploadingPhoto = true;
    this.userService.uploadProfilePhoto(file).subscribe({
      next: res => {
        this.profilePhotoUrl = res.photoUrl;
        if (this.profile) {
          this.profile.photoUrl = res.photoUrl;
        }
        this.uploadingPhoto = false;
      },
      error: err => {
        this.uploadError = err.error?.message ?? 'No se pudo actualizar la foto.';
        this.uploadingPhoto = false;
      }
    });
  }
}

