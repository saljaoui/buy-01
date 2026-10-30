
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage-service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(LocalStorageService);

    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null when key does not exist', () => {
    expect(service.get('user')).toBeNull();
  });

  it('should return parsed JSON data', () => {
    const user = {
      id: 1,
      name: 'Soufian',
    };

    localStorage.setItem('user', JSON.stringify(user));

    expect(service.get('user')).toEqual(user);
  });

  it('should return raw string when value is not valid JSON', () => {
    const token = 'my-jwt-token';

    localStorage.setItem('token', token);

    expect(service.get('token')).toBe(token);
  });

  it('should return stored number', () => {
    localStorage.setItem('age', JSON.stringify(25));

    expect(service.get<number>('age')).toBe(25);
  });

  it('should return stored boolean', () => {
    localStorage.setItem('active', JSON.stringify(true));

    expect(service.get<boolean>('active')).toBe(true);
  });

  it('should store a string value', () => {
    service.set('name', 'Soufian');

    expect(localStorage.getItem('name')).toBe('"Soufian"');
  });

  it('should store an object as JSON', () => {
    const user = {
      id: 1,
      name: 'Soufian',
    };

    service.set('user', user);

    expect(localStorage.getItem('user')).toBe(
      JSON.stringify(user)
    );
  });

  it('should store a number', () => {
    service.set('age', 25);

    expect(localStorage.getItem('age')).toBe('25');
  });

  it('should store a boolean', () => {
    service.set('active', true);

    expect(localStorage.getItem('active')).toBe('true');
  });
});
