
import { TestBed } from '@angular/core/testing';
import { GlobalService } from './global-service';
import { environment } from '../../../environments/environment';

describe('GlobalService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    const service = TestBed.inject(GlobalService);
    expect(service).toBeTruthy();
  });

  it('should have the correct API base URL', () => {
    expect(GlobalService.clientIP).toBe(environment.apiBaseUrl);
  });

  it('should use the correct API URL', () => {
    expect(GlobalService.clientIP).toBe('http://localhost:8080/api');
  });

});
