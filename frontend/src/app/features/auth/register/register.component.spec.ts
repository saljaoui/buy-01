import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { AuthService } from '../auth.service';

describe('RegisterComponent (reactive form)', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    // Access protected members for testing.
    const cmp = fixture.componentInstance as unknown as {
      form: FormGroup;
      currentStep(): number;
      isSubmitting(): boolean;
      goToStep(step: 1 | 2 | 3): void;
      submit(): void;
      err(name: string): string;
    };
    return { fixture, cmp, el: fixture.nativeElement as HTMLElement };
  };

  it('blocks step 3 while account details are invalid and shows inline errors', () => {
    const { fixture, cmp, el } = setup();
    cmp.goToStep(2);
    cmp.goToStep(3);
    fixture.detectChanges();

    expect(cmp.currentStep()).toBe(2);
    expect(el.querySelector('#name-error')!.textContent).toContain('Full name is required.');
  });

  it('renders no error elements on a fresh form', () => {
    const { cmp, fixture, el } = setup();
    cmp.goToStep(2);
    fixture.detectChanges();

    expect(el.querySelector('.err-msg')).toBeNull();
    expect(el.querySelector('.ok-msg')).toBeNull();
  });

  it('renders no error for valid fields, even after they were touched', () => {
    const { cmp, fixture, el } = setup();
    cmp.form.patchValue({ name: 'Soufian', password: 'password123', confirmPassword: 'password123' });
    cmp.form.markAllAsTouched();
    cmp.goToStep(2);
    fixture.detectChanges();

    expect(el.querySelector('#name-error')).toBeNull();
    expect(el.querySelector('#password-error')).toBeNull();
    expect(el.querySelector('#confirmPassword-error')).toBeNull();
    expect(el.querySelector('#email-error')).not.toBeNull(); // still empty -> required
  });

  it('keeps icons inside the input wrapper; hints, strength meter and errors stay outside', () => {
    const { cmp, fixture, el } = setup();
    cmp.form.patchValue({ email: 'a@b.com', password: 'short' });
    cmp.form.markAllAsTouched();
    cmp.goToStep(2);
    fixture.detectChanges();

    for (const id of ['name', 'email', 'password', 'confirmPw']) {
      const wrap = el.querySelector(`#${id}`)!.closest('.input-wrap')!;
      expect(wrap.querySelector('.f-icon')).not.toBeNull();
      expect(wrap.querySelector('.err-msg, .ok-msg, .pw-strength')).toBeNull();
    }
    expect(el.querySelector('.ok-msg')).not.toBeNull();
    expect(el.querySelector('#password-error')).not.toBeNull();
  });

  it('reports mismatching passwords', () => {
    const { cmp } = setup();
    cmp.form.patchValue({ password: 'password123', confirmPassword: 'password999' });
    expect(cmp.err('confirmPassword')).toBe("Passwords don't match.");
  });

  it('requires the terms checkbox before calling the API', () => {
    const { fixture, cmp, el } = setup();
    const register = vi.spyOn(TestBed.inject(AuthService), 'register');
    cmp.form.patchValue({
      name: 'Soufian',
      email: 's@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    cmp.goToStep(3);
    cmp.submit();
    fixture.detectChanges();

    expect(cmp.currentStep()).toBe(3);
    expect(el.querySelector('#terms-error')!.textContent).toContain('accept the terms');
    expect(register).not.toHaveBeenCalled();
  });

  it('on 409 stops the spinner, shows the server message and returns to step 2', () => {
    const { fixture, cmp, el } = setup();
    const message = 'Email is already in use';
    vi.spyOn(TestBed.inject(AuthService), 'register').mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            url: 'http://localhost:8080/api/auth/register',
            error: { status: 409, error: 'Conflict', message },
          }),
      ),
    );
    cmp.form.patchValue({
      role: 'SELLER',
      name: 'Soufian',
      email: 'taken@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      terms: true,
    });
    cmp.goToStep(3);
    cmp.submit();
    fixture.detectChanges();

    expect(cmp.isSubmitting()).toBe(false);
    expect(cmp.currentStep()).toBe(2);
    expect(el.querySelector('#toastMsg')!.textContent).toContain(message);
    expect(el.querySelector('#email-error')!.textContent).toContain(message);

    // Editing the email clears the server error.
    cmp.form.controls['email'].setValue('fresh@example.com');
    expect(cmp.form.controls['email'].valid).toBe(true);
  });
});
