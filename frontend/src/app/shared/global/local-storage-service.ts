import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  get(key: string) : any {
    const value = localStorage.getItem(key);

    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value; // return raw string (like JWT)
    }
  }

  set(key : string, value : any) {
    if (localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}
