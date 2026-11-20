import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { AuthSession, AuthUser } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const user: AuthUser = { id: '1', name: 'Amina', email: 'amina@x.com', role: 'CLIENT', avatar: null };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('login posts the credentials and returns the session', () => {
    let session: AuthSession | undefined;

    service.login({ email: 'amina@x.com', password: 'password123' }).subscribe((s) => (session = s));
    const req = httpMock.expectOne((r) => r.url.endsWith('/auth/login'));
    req.flush({ token: 'jwt-token', user });

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'amina@x.com', password: 'password123' });
    expect(session).toEqual({ token: 'jwt-token', user });
  });

  it('register posts the new account', () => {
    const account = { name: 'Amina', email: 'amina@x.com', password: 'password123', role: 'CLIENT' as const };

    service.register(account).subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/auth/register'));
    req.flush({ token: 'jwt-token', user });

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(account);
  });

  it('login fails when the server sends no token', () => {
    let error: Error | undefined;

    service.login({ email: 'amina@x.com', password: 'password123' }).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.endsWith('/auth/login')).flush({ token: '', user });

    expect(error?.message).toBe('Authentication response did not include an access token.');
  });

  it('storeSession saves the token in localStorage by default', () => {
    service.storeSession({ token: 'jwt-token', user });

    expect(localStorage.getItem('buy01.auth.token')).toBe('jwt-token');
    expect(service.getStoredUser()).toEqual(user);
  });

  it('storeSession uses sessionStorage when not persistent', () => {
    service.storeSession({ token: 'jwt-token', user }, false);

    expect(sessionStorage.getItem('buy01.auth.token')).toBe('jwt-token');
    expect(localStorage.getItem('buy01.auth.token')).toBeNull();
  });

  it('clearSession removes the token and the user', () => {
    service.storeSession({ token: 'jwt-token', user });

    service.clearSession();

    expect(service.getStoredToken()).toBeNull();
    expect(service.getStoredUser()).toBeNull();
  });

  it('getAuthenticatedUser returns null and clears the session when the token is expired', () => {
    const expiredToken = 'header.' + btoa(JSON.stringify({ exp: 1 })) + '.signature';
    service.storeSession({ token: expiredToken, user });

    const result = service.getAuthenticatedUser();

    expect(result).toBeNull();
    expect(service.getStoredToken()).toBeNull();
  });

  it('isTokenExpired returns true for a malformed token', () => {
    const expired = service.isTokenExpired('not-a-jwt');

    expect(expired).toBe(true);
  });
});
