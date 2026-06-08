import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiError {
  message: string;
  status?: number;
}

type HttpOptions = {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
};

type RuntimeConfig = {
  NEXT_PUBLIC_BACKEND_URL?: string;
  BUY01_BACKEND_URL?: string;
};

function runtimeConfig(): RuntimeConfig {
  const runtime = globalThis as typeof globalThis & {
    __BUY01_CONFIG__?: RuntimeConfig;
    NEXT_PUBLIC_BACKEND_URL?: string;
    BUY01_BACKEND_URL?: string;
  };

  return {
    NEXT_PUBLIC_BACKEND_URL:
      runtime.__BUY01_CONFIG__?.NEXT_PUBLIC_BACKEND_URL ?? runtime.NEXT_PUBLIC_BACKEND_URL,
    BUY01_BACKEND_URL: runtime.__BUY01_CONFIG__?.BUY01_BACKEND_URL ?? runtime.BUY01_BACKEND_URL,
  };
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const config = runtimeConfig();
  const configuredUrl =
    config.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    config.BUY01_BACKEND_URL?.trim() ||
    environment.apiBaseUrl;

  return normalizeBaseUrl(configuredUrl);
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  readonly baseUrl = resolveApiBaseUrl();

  url(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  get<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(this.url(path), options);
  }

  post<T>(path: string, body: unknown, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(this.url(path), body, options);
  }

  put<T>(path: string, body: unknown, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(this.url(path), body, options);
  }

  delete<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), options);
  }

  getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (this.hasMessage(error.error)) {
        return error.error.message;
      }

      if (error.status === 0) {
        return 'Unable to reach the backend server.';
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private hasMessage(value: unknown): value is ApiError {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof (value as { message?: unknown }).message === 'string' &&
      (value as { message: string }).message.trim().length > 0
    );
  }
}
