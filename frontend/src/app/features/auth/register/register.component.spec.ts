import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { AuthService } from '../auth.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let el: HTMLElement;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [RegisterComponent], providers: [provideRouter([]), provideHttpClient()] });
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(RegisterComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  function click(selector: string) {
    el.querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  }

  it('stays on step 2 when the account details are invalid', () => {
    click('#step1 .btn-register');
    click('#step2 .btn-register');

    expect(el.querySelector('#ls2')!.classList).toContain('active');
    expect(el.querySelector('#name-error')!.textContent).toContain('Full name is required.');
  });

  it('shows an error when the passwords do not match', () => {
    type('#password', 'password123');
    type('#confirmPw', 'password999');
    fixture.detectChanges();

    expect(el.querySelector('#confirmPassword-error')!.textContent).toContain("Passwords don't match.");
  });

  it('does not call the API when the terms are not accepted', () => {
    const register = vi.spyOn(auth, 'register');
    type('#name', 'Amina');
    type('#email', 'amina@x.com');
    type('#password', 'password123');
    type('#confirmPw', 'password123');

    click('#submitBtn');

    expect(el.querySelector('#terms-error')!.textContent).toContain('accept the terms');
    expect(register).not.toHaveBeenCalled();
  });

  it('calls register with the form values when everything is valid', () => {
    const register = vi.spyOn(auth, 'register').mockReturnValue(of({ token: 't', user: { id: '1', name: 'Amina', email: 'amina@x.com', role: 'CLIENT' } }));
    type('#name', ' Amina ');
    type('#email', 'amina@x.com ');
    type('#password', 'password123');
    type('#confirmPw', 'password123');
    click('#terms');

    click('#submitBtn');

    expect(register).toHaveBeenCalledWith({ name: 'Amina', email: 'amina@x.com', password: 'password123', role: 'CLIENT' });
  });

  it('goes back to step 2 and shows the message when the email is taken (409)', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Email is already in use' } });
    vi.spyOn(auth, 'register').mockReturnValue(throwError(() => error));
    type('#name', 'Amina');
    type('#email', 'taken@x.com');
    type('#password', 'password123');
    type('#confirmPw', 'password123');
    click('#terms');

    click('#submitBtn');

    expect(el.querySelector('#ls2')!.classList).toContain('active');
    expect(el.querySelector('#email-error')!.textContent).toContain('Email is already in use');
  });
});
