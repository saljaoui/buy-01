import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

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

  it('shows no errors before the user interacts', () => {
    expect(el.querySelector('#email-error')!.textContent!.trim()).toBe('');
    expect(el.querySelector('#email')!.classList).not.toContain('is-invalid');
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
});
