import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient,
    private authService: AuthService) { }

  getUserProfile() {
    return this.http.get(environment.apiBaseUrl + '/userprofile');
  }

  uploadProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<{ photoUrl: string }>(environment.apiBaseUrl + '/userprofile/photo', formData);
  }
}
