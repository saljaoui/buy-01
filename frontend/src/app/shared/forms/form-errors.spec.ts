import { FormControl, FormGroup, Validators } from '@angular/forms';

import { controlError, matchFields, notBlank, showError } from './form-errors';

describe('form-errors helpers', () => {
  it('showError is false until the field is touched', () => {
    const form = new FormGroup({ email: new FormControl('', Validators.required) });
    expect(showError(form, 'email')).toBe(false);
    form.controls.email.markAsTouched();
    expect(showError(form, 'email')).toBe(true);
  });

  it('controlError builds readable messages', () => {
    expect(controlError(new FormControl('', Validators.required), 'Email')).toBe('Email is required.');
    expect(controlError(new FormControl('x', Validators.email), 'Email')).toBe('Please enter a valid email address.');
    expect(controlError(new FormControl('abc', Validators.minLength(8)), 'Password')).toBe(
      'Password must be at least 8 characters.',
    );
    expect(controlError(new FormControl(0, Validators.min(0.01)), 'Price')).toBe('Price must be at least 0.01.');
    expect(controlError(new FormControl('ok'), 'Name')).toBe('');
  });

  it('notBlank rejects only-spaces', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ whitespace: true });
    expect(notBlank(new FormControl(' a '))).toBeNull();
  });

  it('matchFields sets mismatch on the confirm field', () => {
    const form = new FormGroup(
      { password: new FormControl('secret123'), confirm: new FormControl('other') },
      { validators: matchFields('password', 'confirm') },
    );
    expect(form.controls.confirm.hasError('mismatch')).toBe(true);
    form.controls.confirm.setValue('secret123');
    expect(form.controls.confirm.valid).toBe(true);
  });
});
