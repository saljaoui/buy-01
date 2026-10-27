import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ToastService } from '../../../shared/services/toast-service';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from '../../../core/api/api-client.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-product-details',
  imports: [
    FooterComponent,
    NavbarComponent,
    RouterLink,
    IconComponent
  ],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsComponent implements OnInit {

  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());

  mediaSignal = signal<Media[]>([]);
  medias = computed(() => this.mediaSignal());

  selectedImageSignal = signal<Media | undefined>(undefined);
  selectedImage = computed(() => this.selectedImageSignal());

  isLoading = signal(true);
  isMediaLoading = signal(true);

  errorMessage = signal<string | null>(null);
  mediaErrorMessage = signal<string | null>(null);

  isDeleting = signal(false);

  productId = '';

  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiClient);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage.set('Missing product id.');
        this.isLoading.set(false);
        this.isMediaLoading.set(false);
        return;
      }

      this.productId = id;

      this.findProduct(id);
      this.loadMedia(id);
    });
  }

  private findProduct(productId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProduct(productId).subscribe({
      next: (product: ProductResponse) => {
        this.productDetailsSignal.set(product);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (err.status === 404) {
          this.toastService.error(
            'The product you are looking for does not exist.'
          );
          this.router.navigate(['/not-found']);
        } else {
          this.errorMessage.set(
            this.api.getErrorMessage(err, 'Unable to load product.')
          );
        }
      }
    });
  }

  private loadMedia(productId: string): void {
    this.isMediaLoading.set(true);
    this.mediaErrorMessage.set(null);

    this.mediaService.getMediaByProduct(productId).subscribe({
      next: (mediaList: Media[]) => {
        this.mediaSignal.set(mediaList ?? []);

        if (mediaList?.length) {
          this.selectedImageSignal.set(mediaList[0]);
        }

        this.isMediaLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.mediaErrorMessage.set(
          this.api.getErrorMessage(err, 'Unable to load product images.')
        );

        this.mediaSignal.set([]);
        this.isMediaLoading.set(false);
      }
    });
  }

  selectImage(mediaId: string): void {
    const image = this.medias()
      .find(media => media.id === mediaId);

    this.selectedImageSignal.set(image);
  }

  imageUrl(media: Media): string {
    return `${environment.apiBaseUrl}${media.imageUrl}`;
  }

  updateProduct(): void {
    this.router.navigate([
      '/seller/products',
      this.productId,
      'edit'
    ]);
  }

  delete(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.productService.deleteProduct(this.productId).subscribe({
      next: () => {
        this.toastService.success('Product deleted successfully.');
        this.router.navigate(['/products']);
      },
      error: err => {
        this.toastService.error(
          this.api.getErrorMessage(err, 'Product could not be deleted.')
        );

        this.isDeleting.set(false);
      }
    });
  }
}