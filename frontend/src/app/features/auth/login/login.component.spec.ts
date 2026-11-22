import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [LoginComponent], providers: [provideRouter([]), provideHttpClient()] });
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(LoginComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  function submit() {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows required errors and does not call the API when the form is empty', () => {
    const login = vi.spyOn(auth, 'login');

    submit();

    expect(el.querySelector('#email-error')!.textContent).toContain('Email is required.');
    expect(el.querySelector('#password-error')!.textContent).toContain('Password is required.');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows a message for a bad email and a short password', () => {
    type('#email', 'not-an-email');
    type('#password', '123');
    fixture.detectChanges();

    expect(el.querySelector('#email-error')!.textContent).toContain('valid email');
    expect(el.querySelector('#password-error')!.textContent).toContain('at least 8 characters');
  });

  it('calls login with trimmed values when the form is valid', () => {
    const login = vi.spyOn(auth, 'login').mockReturnValue(of({ token: 't', user: { id: '1', name: 'A', email: 'a@b.com', role: 'CLIENT' } }));
    type('#email', '  a@b.com ');
    type('#password', 'password123');

    submit();

    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
  });

  it('saves the session and sends a seller to /seller after login', () => {
    vi.spyOn(auth, 'login').mockReturnValue(of({ token: 't', user: { id: '1', name: 'A', email: 'a@b.com', role: 'SELLER' } }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type('#email', 'a@b.com');
    type('#password', 'password123');

    submit();

    expect(auth.getStoredToken()).toBe('t');
    expect(navigate).toHaveBeenCalledWith('/seller');
  });

  it('shows the server message when login fails', () => {
    const error = new HttpErrorResponse({ status: 401, url: '/auth/login', error: { message: 'Invalid credentials' } });
    vi.spyOn(auth, 'login').mockReturnValue(throwError(() => error));
    type('#email', 'a@b.com');
    type('#password', 'wrongpassword');

    submit();

    expect(el.querySelector('#toastMsg')!.textContent).toContain('Invalid credentials');
    expect(el.querySelector<HTMLButtonElement>('.btn-signin')!.disabled).toBe(false);
  });
});
