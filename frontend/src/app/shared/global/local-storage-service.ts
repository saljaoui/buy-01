import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  get<T = unknown>(key: string): T | string | null {
    const value = localStorage.getItem(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value; // return raw string (like JWT)
    }
  }

  set<T>(key: string, value: T): void {
    if (localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}
