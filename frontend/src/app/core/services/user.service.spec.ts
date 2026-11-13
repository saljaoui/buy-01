
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { UserService } from './user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: '1',
    name: 'Soufian',
    email: 'soufian@example.com',
    role: 'CLIENT',
    avatar: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a GET request to get current user', () => {
    service.getCurrentUser().subscribe((data) => {
      expect(data).toEqual(mockUser);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockUser);
  });

  it('should send a PUT request to update current user', () => {
    const payload = {
      name: 'New Name',
      avatar: 'https://example.com/avatar.png',
    };

    const updatedUser: User = {
      ...mockUser,
      ...payload,
    };

    service.updateCurrentUser(payload).subscribe((data) => {
      expect(data).toEqual(updatedUser);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/users/me')
    );

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

    req.flush(updatedUser);
  });
});
