import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { GlobalService } from '../global/global-service';
import { LocalStorageService } from '../global/local-storage-service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);
  private readonly API = GlobalService.clientIP;

  getProducts() : Observable<any> {
    const token = this.storage.get('buy01.auth.token');
    if (!token) {
      this.router.navigate(['/login']);
      return EMPTY;
    }
    const headers = new HttpHeaders({
      'Authorization':'Bearer ' + token,
      'Content-Type':'application/json'
    })
    return this.http.get<any>(`${this.API}/products`, { headers });
  }

}
