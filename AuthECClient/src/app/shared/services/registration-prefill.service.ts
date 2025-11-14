import { Injectable } from '@angular/core';

export interface RegistrationPrefillData {
  role: string;
  email: string;
  fullName: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationPrefillService {

  private readonly storageKey = 'registration_prefill';

  setPrefill(data: RegistrationPrefillData): void {
    const map = this.readMap();
    map[data.role] = data;
    sessionStorage.setItem(this.storageKey, JSON.stringify(map));
  }

  consumePrefill(role: string): RegistrationPrefillData | null {
    const map = this.readMap();
    const data = map[role] ?? null;
    if (data) {
      delete map[role];
      sessionStorage.setItem(this.storageKey, JSON.stringify(map));
    }
    return data;
  }

  private readMap(): Record<string, RegistrationPrefillData> {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(this.storageKey);
      return {};
    }
  }
}

