import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';

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
      currentStep: number;
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

    expect(cmp.currentStep).toBe(2);
    expect(el.querySelector('#name-error')!.textContent).toContain('Full name is required.');
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

    expect(cmp.currentStep).toBe(3);
    expect(el.querySelector('#terms-error')!.textContent).toContain('accept the terms');
    expect(register).not.toHaveBeenCalled();
  });
});
