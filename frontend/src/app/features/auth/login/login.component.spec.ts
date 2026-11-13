import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../auth.service';

describe('LoginComponent (reactive form)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;
  let auth: AuthService;

  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const submit = () => {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient()],
    });
    fixture = TestBed.createComponent(LoginComponent);
    el = fixture.nativeElement;
    auth = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('renders no error elements before the user interacts', () => {
    expect(el.querySelector('.err-msg')).toBeNull();
    expect(el.querySelector('#email')!.classList).not.toContain('is-invalid');
    expect(el.querySelector('#email')!.getAttribute('aria-describedby')).toBeNull();
  });

  it('removes the error element once the field becomes valid', () => {
    type('#email', 'bad');
    fixture.detectChanges();
    expect(el.querySelector('#email-error')).not.toBeNull();

    type('#email', 'a@b.com');
    fixture.detectChanges();
    expect(el.querySelector('#email-error')).toBeNull();
  });

  it('keeps each field icon inside the input wrapper, with errors outside it', () => {
    submit();
    for (const id of ['email', 'password']) {
      const wrap = el.querySelector(`#${id}`)!.closest('.input-wrap')!;
      expect(wrap.querySelector('.input-icon')).not.toBeNull();
      expect(wrap.querySelector('.err-msg')).toBeNull();
      expect(wrap.parentElement!.querySelector(`#${id}-error`)).not.toBeNull();
    }
    expect(el.querySelector('#pwToggle')!.closest('.input-wrap')).not.toBeNull();
  });

  it('shows inline errors on submit and does not call the API', () => {
    const login = vi.spyOn(auth, 'login');
    submit();

    expect(el.querySelector('#email-error')!.textContent).toContain('Email is required.');
    expect(el.querySelector('#password-error')!.textContent).toContain('Password is required.');
    expect(el.querySelector('#email')!.getAttribute('aria-invalid')).toBe('true');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows a specific message for a bad email and short password', () => {
    type('#email', 'not-an-email');
    type('#password', '123');
    fixture.detectChanges();

    expect(el.querySelector('#email-error')!.textContent).toContain('valid email');
    expect(el.querySelector('#password-error')!.textContent).toContain('at least 8 characters');
  });

  it('calls the API with trimmed values when the form is valid', () => {
    const login = vi.spyOn(auth, 'login').mockReturnValue(
      of({ token: 't', user: { id: '1', name: 'A', email: 'a@b.com', role: 'CLIENT' as const } }),
    );
    type('#email', '  a@b.com ');
    type('#password', 'password123');
    submit();

    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
  });

  it('stops the spinner and shows the server message on a failed login (401)', () => {
    vi.spyOn(auth, 'login').mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            url: 'http://localhost:8080/api/auth/login',
            error: { status: 401, message: 'Invalid credentials' },
          }),
      ),
    );
    type('#email', 'a@b.com');
    type('#password', 'wrongpassword');
    submit();

    const button = el.querySelector<HTMLButtonElement>('.btn-signin')!;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Sign in');
    expect(el.querySelector('#toast')!.classList).toContain('show');
    expect(el.querySelector('#toastMsg')!.textContent).toContain('Invalid credentials');
  });
});
