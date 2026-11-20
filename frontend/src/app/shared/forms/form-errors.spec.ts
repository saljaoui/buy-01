import { FormControl, FormGroup, Validators } from '@angular/forms';

import { controlError, matchFields, notBlank, showError } from './form-errors';

describe('form-errors', () => {
  it('showError is false until the field is touched', () => {
    const form = new FormGroup({ email: new FormControl('', Validators.required) });
    expect(showError(form, 'email')).toBe(false);

    form.controls.email.markAsTouched();

    expect(showError(form, 'email')).toBe(true);
  });

  it('controlError says a required field is required', () => {
    const message = controlError(new FormControl('', Validators.required), 'Email');

    expect(message).toBe('Email is required.');
  });

  it('controlError explains the minimum length', () => {
    const message = controlError(new FormControl('abc', Validators.minLength(8)), 'Password');

    expect(message).toBe('Password must be at least 8 characters.');
  });

  it('controlError returns an empty text when the field is valid', () => {
    const message = controlError(new FormControl('ok'), 'Name');

    expect(message).toBe('');
  });

  it('notBlank rejects a value with only spaces', () => {
    const result = notBlank(new FormControl('   '));

    expect(result).toEqual({ whitespace: true });
  });

  it('matchFields marks the confirm field when the two values differ', () => {
    const form = new FormGroup(
      { password: new FormControl('secret123'), confirm: new FormControl('other') },
      { validators: matchFields('password', 'confirm') },
    );

    expect(form.controls.confirm.hasError('mismatch')).toBe(true);
  });
});
