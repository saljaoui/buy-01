
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MediaService, Media } from './media-service';
import { environment } from '../../../environments/environment';

describe('MediaService', () => {
  let service: MediaService;
  let httpMock: HttpTestingController;

  const mockMedia: Media = {
    id: '1',
    productId: 'product-1',
    imageUrl: '/uploads/laptop.png',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MediaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a POST request to upload media', () => {
    const productId = 'product-1';

    const file = new File(
      ['fake image content'],
      'laptop.png',
      { type: 'image/png' }
    );

    service.upload(productId, file).subscribe((data) => {
      expect(data).toEqual(mockMedia);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith('/media')
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const formData = req.request.body as FormData;

    expect(formData.get('file')).toBe(file);
    expect(formData.get('productId')).toBe(productId);

    req.flush(mockMedia);
  });

  it('should send a GET request to get media by product', () => {
    const productId = 'product-1';

    service.getMediaByProduct(productId).subscribe((data) => {
      expect(data).toEqual([mockMedia]);
    });

    const req = httpMock.expectOne(
      (req) => req.url.endsWith(`/media/product/${productId}`)
    );

    expect(req.request.method).toBe('GET');

    req.flush([mockMedia]);
  });

  it('should send a DELETE request to delete media', () => {
    const mediaId = 'media-1';

    service.deleteMedia(mediaId).subscribe();

    const req = httpMock.expectOne(
      (req) => req.url.endsWith(`/media/${mediaId}`)
    );

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  it('should return the complete image URL', () => {
    const result = service.imageUrl(mockMedia);

    expect(result).toBe(
      `${environment.apiBaseUrl}${mockMedia.imageUrl}`
    );
  });
});
