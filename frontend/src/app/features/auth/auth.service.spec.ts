
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';
import {
  AuthResponse,
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: AuthUser = {
    id: '1',
    name: 'Soufian',
    email: 'soufian@example.com',
    role: 'CLIENT',
    avatar: null,
  };

  const mockSession: AuthSession = {
    token: 'fake-jwt-token',
    user: mockUser,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a POST request to login', () => {
    const payload: LoginRequest = {
      email: 'soufian@example.com',
      password: 'password123',
    };

    const response: AuthResponse = {
      token: mockSession.token,
      user: mockUser,
    };

    service.login(payload).subscribe((data) => {
      expect(data).toEqual(mockSession);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/auth/login')
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(response);
  });

  it('should fetch current user if login response does not include a user', () => {
    service.login({
      email: 'soufian@example.com',
      password: 'password123',
    }).subscribe((data) => {
      expect(data).toEqual(mockSession);
    });

    const loginReq = httpMock.expectOne(
      (req) => req.url.endsWith('/auth/login')
    );

    loginReq.flush({
      token: mockSession.token,
    });

    const userReq = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    expect(userReq.request.method).toBe('GET');
    expect(userReq.request.headers.get('Authorization'))
      .toBe(`Bearer ${mockSession.token}`);

    userReq.flush(mockUser);
  });

  it('should send a POST request to register', () => {
    const payload: RegisterRequest = {
      name: 'Soufian',
      email: 'soufian@example.com',
      password: 'password123',
      role: 'CLIENT',
      avatar: null,
    };

    service.register(payload).subscribe((data) => {
      expect(data).toEqual(mockSession);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/auth/register')
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      token: mockSession.token,
      user: mockUser,
    });
  });

  it('should fetch current user if register response does not include a user', () => {
    const payload: RegisterRequest = {
      name: 'Soufian',
      email: 'soufian@example.com',
      password: 'password123',
      role: 'CLIENT',
    };

    service.register(payload).subscribe((data) => {
      expect(data).toEqual(mockSession);
    });

    const registerReq = httpMock.expectOne(
      (req) => req.url.endsWith('/auth/register')
    );

    registerReq.flush({
      token: mockSession.token,
    });

    const userReq = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    expect(userReq.request.method).toBe('GET');
    expect(userReq.request.headers.get('Authorization'))
      .toBe(`Bearer ${mockSession.token}`);

    userReq.flush(mockUser);
  });

  it('should return an error if the response does not include a token', () => {
    let receivedError: Error | undefined;

    service.login({
      email: 'soufian@example.com',
      password: 'password123',
    }).subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/auth/login')
    );

    req.flush({
      token: '',
      user: mockUser,
    });

    expect(receivedError?.message).toBe(
      'Authentication response did not include an access token.'
    );
  });

  it('should send a GET request to refresh current user', () => {
    service.refreshCurrentUser().subscribe((data) => {
      expect(data).toEqual(mockUser);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockUser);
  });

  it('should update stored user after refreshing current user', () => {
    service.storeSession(mockSession);

    const updatedUser: AuthUser = {
      ...mockUser,
      name: 'Updated Name',
    };

    service.refreshCurrentUser().subscribe((data) => {
      expect(data).toEqual(updatedUser);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    req.flush(updatedUser);

    expect(service.getStoredUser()).toEqual(updatedUser);
  });

  it('should store session in localStorage by default', () => {
    service.storeSession(mockSession);

    expect(localStorage.getItem('buy01.auth.token'))
      .toBe(mockSession.token);

    expect(JSON.parse(
      localStorage.getItem('buy01.auth.user')!
    )).toEqual(mockUser);
  });

  it('should store session in sessionStorage when persistent is false', () => {
    service.storeSession(mockSession, false);

    expect(sessionStorage.getItem('buy01.auth.token'))
      .toBe(mockSession.token);

    expect(sessionStorage.getItem('buy01.auth.user'))
      .toBe(JSON.stringify(mockUser));

    expect(localStorage.getItem('buy01.auth.token')).toBeNull();
  });

  it('should return stored token from localStorage', () => {
    service.storeSession(mockSession);

    expect(service.getStoredToken()).toBe(mockSession.token);
  });

  it('should return stored token from sessionStorage', () => {
    service.storeSession(mockSession, false);

    expect(service.getStoredToken()).toBe(mockSession.token);
  });

  it('should return stored user', () => {
    service.storeSession(mockSession);

    expect(service.getStoredUser()).toEqual(mockUser);
  });

  it('should return null when no user is stored', () => {
    expect(service.getStoredUser()).toBeNull();
  });

  it('should clear session when stored user JSON is invalid', () => {
    localStorage.setItem('buy01.auth.token', mockSession.token);
    localStorage.setItem('buy01.auth.user', 'invalid-json');

    expect(service.getStoredUser()).toBeNull();

    expect(localStorage.getItem('buy01.auth.token')).toBeNull();
    expect(localStorage.getItem('buy01.auth.user')).toBeNull();
  });

  it('should update user in localStorage', () => {
    service.storeSession(mockSession);

    const updatedUser: AuthUser = {
      ...mockUser,
      name: 'New Name',
    };

    service.updateStoredUser(updatedUser);

    expect(service.getStoredUser()).toEqual(updatedUser);
  });

  it('should update user in sessionStorage', () => {
    service.storeSession(mockSession, false);

    const updatedUser: AuthUser = {
      ...mockUser,
      name: 'New Name',
    };

    service.updateStoredUser(updatedUser);

    expect(JSON.parse(
      sessionStorage.getItem('buy01.auth.user')!
    )).toEqual(updatedUser);
  });

  it('should clear session from localStorage and sessionStorage', () => {
    service.storeSession(mockSession);

    service.clearSession();

    expect(service.getStoredToken()).toBeNull();
    expect(service.getStoredUser()).toBeNull();

    expect(localStorage.getItem('buy01.auth.token')).toBeNull();
    expect(localStorage.getItem('buy01.auth.user')).toBeNull();
    expect(sessionStorage.getItem('buy01.auth.token')).toBeNull();
    expect(sessionStorage.getItem('buy01.auth.user')).toBeNull();
  });
});
