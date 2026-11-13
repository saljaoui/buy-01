import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Shared helpers so every Reactive Form shows errors the same way.
 *
 * Usage in a component:
 *   protected err = (name: string) => controlError(this.form.get(name), 'Email');
 * Usage in a template:
 *   <input formControlName="email" [class.is-invalid]="showError(form, 'email')" />
 *   @if (showError(form, 'email')) { <div class="err-msg">{{ err('email') }}</div> }
 */

/** Show an error only after the user left the field (blur) or tried to submit. */
export function showError(form: FormGroup, name: string): boolean {
  const control = form.get(name);
  return !!control && control.invalid && control.touched;
}

/** Turns Angular validation errors into a readable sentence. */
export function controlError(control: AbstractControl | null, label: string): string {
  const errors: ValidationErrors | null | undefined = control?.errors;
  if (!errors) {
    return '';
  }

  if (errors['required'] || errors['whitespace']) return `${label} is required.`;
  if (errors['email']) return 'Please enter a valid email address.';
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}.`;
  if (errors['pattern']) return `${label} has an invalid format.`;
  if (errors['mismatch']) return `${label} does not match.`;
  if (errors['server']) return String(errors['server']);

  return `${label} is invalid.`;
}

/** Like Validators.required, but also rejects "   " (only spaces). */
export const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim().length === 0 ? { whitespace: true } : null;

/** Group validator: two fields must be equal (e.g. password + confirm). Error goes on the second field. */
export function matchFields(field: string, confirmField: string): ValidatorFn {
  return (group) => {
    const a = group.get(field);
    const b = group.get(confirmField);
    if (!a || !b) return null;

    const mismatch = !!b.value && a.value !== b.value;
    const others = { ...(b.errors ?? {}) };
    delete others['mismatch'];

    b.setErrors(mismatch ? { ...others, mismatch: true } : Object.keys(others).length ? others : null);
    return null;
  };
}
