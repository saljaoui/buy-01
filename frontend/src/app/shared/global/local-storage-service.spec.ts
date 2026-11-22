import { TestBed } from '@angular/core/testing';

import { LocalStorageService } from './local-storage-service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStorageService);
  });

  it('get returns null when the key does not exist', () => {
    const value = service.get('missing');

    expect(value).toBeNull();
  });

  it('set then get gives back the same object', () => {
    service.set('user', { id: 1, name: 'Amina' });

    const value = service.get('user');

    expect(value).toEqual({ id: 1, name: 'Amina' });
  });

  it('set stores the value as JSON', () => {
    service.set('age', 25);

    expect(localStorage.getItem('age')).toBe('25');
  });

  it('get returns the raw text when the value is not JSON', () => {
    localStorage.setItem('token', 'my-jwt-token');

    const value = service.get('token');

    expect(value).toBe('my-jwt-token');
  });
});
