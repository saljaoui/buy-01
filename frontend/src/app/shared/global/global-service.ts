import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {

  static readonly clientIP = "http://localhost:8080/api";
}
