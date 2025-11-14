import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TOKEN_KEY } from '../constants';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) { }

  registerStudent(formData: any) {
    formData.gender = "Female";
    formData.age = 35;
    return this.http.post(environment.apiBaseUrl + '/signup/student', formData);
  }

  registerOrganization(formData: any) {
    formData.gender = "Female";
    formData.age = 35;
    return this.http.post(environment.apiBaseUrl + '/signup/organization', formData);
  }

  registerTeacher(formData: any) {
    formData.gender = "Female";
    formData.age = 35;
    return this.http.post(environment.apiBaseUrl + '/signup/teacher', formData);
  }

  registerDirector(formData: any) {
    formData.gender = "Female";
    formData.age = 35;
    return this.http.post(environment.apiBaseUrl + '/signup/director', formData);
  }

  signin(formData: any) {
    return this.http.post(environment.apiBaseUrl + '/signin', formData);
  }

  signinWithGoogle(credential: string) {
    return this.http.post(environment.apiBaseUrl + '/signin/google', { credential });
  }

  isLoggedIn() {
    const token = this.getToken();
    // Verificar que el token exista, no esté vacío y tenga formato básico válido
    if (!token || token.trim() === '') {
      return false;
    }
    // Verificar formato JWT básico (debe tener 3 partes separadas por puntos)
    const parts = token.split('.');
    return parts.length === 3;
  }

  saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  deleteToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  getClaims(){
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(window.atob(parts[1]));
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }

  /**
   * Valida si el token JWT es válido y no está expirado
   * @returns true si el token es válido, false si está expirado o no existe
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    
    // Verificar que el token exista y no esté vacío
    if (!token || token.trim() === '') {
      return false;
    }

    // Verificar formato básico del JWT (debe tener 3 partes separadas por puntos)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Token con formato inválido');
      return false;
    }

    try {
      const claims = this.getClaims();
      
      // Verificar que se pudieron decodificar los claims
      if (!claims) {
        console.warn('No se pudieron decodificar los claims del token');
        return false;
      }
      
      // Verificar si existe el claim 'exp' (expiration)
      if (!claims.exp) {
        console.warn('Token no tiene claim de expiración');
        return false;
      }

      // Comparar tiempo de expiración con tiempo actual
      // exp está en segundos, Date.now() está en milisegundos
      const expirationDate = new Date(claims.exp * 1000);
      const now = new Date();

      const isExpired = now > expirationDate;

      if (isExpired) {
        console.warn('Token expirado', {
          expirationDate: expirationDate.toLocaleString(),
          currentDate: now.toLocaleString()
        });
      }

      return !isExpired;
    } catch (error) {
      console.error('Error al validar token:', error);
      return false;
    }
  }

  /**
   * Obtiene el tiempo restante del token en minutos
   * @returns minutos restantes o null si el token no es válido
   */
  getTokenRemainingTime(): number | null {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const claims = this.getClaims();
      
      if (!claims.exp) {
        return null;
      }

      const expirationDate = new Date(claims.exp * 1000);
      const now = new Date();
      const remainingMs = expirationDate.getTime() - now.getTime();
      
      // Convertir de milisegundos a minutos
      const remainingMinutes = Math.floor(remainingMs / 1000 / 60);

      return remainingMinutes > 0 ? remainingMinutes : 0;
    } catch (error) {
      console.error('Error al calcular tiempo restante:', error);
      return null;
    }
  }

  /**
   * Logout del usuario: elimina token y redirige a login
   */
  logout() {
    this.deleteToken();
  }

}
