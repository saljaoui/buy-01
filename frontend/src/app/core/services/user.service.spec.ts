import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const user: User = { id: '1', name: 'Amina', email: 'amina@x.com', role: 'CLIENT', avatar: null };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCurrentUser sends a GET to /users/me and returns the user', () => {
    let result: User | undefined;

    service.getCurrentUser().subscribe((u) => (result = u));
    const req = httpMock.expectOne((r) => r.url.endsWith('/users/me'));
    req.flush(user);

    expect(req.request.method).toBe('GET');
    expect(result).toEqual(user);
  });

  it('updateCurrentUser sends a PUT with the new name and avatar', () => {
    let result: User | undefined;
    const body = { name: 'New Name', avatar: '/media/avatar.png' };

    service.updateCurrentUser(body).subscribe((u) => (result = u));
    const req = httpMock.expectOne((r) => r.url.endsWith('/users/me'));
    req.flush({ ...user, ...body });

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(result?.name).toBe('New Name');
  });
});
