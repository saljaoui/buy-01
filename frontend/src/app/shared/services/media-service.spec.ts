import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Media, MediaService } from './media-service';
import { environment } from '../../../environments/environment';

describe('MediaService', () => {
  let service: MediaService;
  let httpMock: HttpTestingController;
  const photo: Media = { id: '1', productId: 'p1', imageUrl: '/uploads/lamp.png' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MediaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('upload sends a POST with the file and the product id', () => {
    const file = new File(['image'], 'lamp.png', { type: 'image/png' });

    service.upload('p1', file).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/media`);
    req.flush(photo);

    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('file')).toBe(file);
    expect((req.request.body as FormData).get('productId')).toBe('p1');
  });

  it('getMediaByProduct sends a GET and returns the photos', () => {
    let result: Media[] = [];

    service.getMediaByProduct('p1').subscribe((list) => (result = list));
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/media/product/p1`);
    req.flush([photo]);

    expect(req.request.method).toBe('GET');
    expect(result).toEqual([photo]);
  });

  it('deleteMedia sends a DELETE', () => {
    service.deleteMedia('1').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/media/1`);
    req.flush(null);

    expect(req.request.method).toBe('DELETE');
  });

  it('imageUrl adds the API address in front of the image path', () => {
    const url = service.imageUrl(photo);

    expect(url).toBe(`${environment.apiBaseUrl}/uploads/lamp.png`);
  });
});
