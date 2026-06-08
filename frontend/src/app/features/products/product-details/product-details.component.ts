import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MediaService, MediaUploadData } from '../../../shared/services/media-service';
import { ToastService } from '../../../shared/services/toast-service';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from '../../../core/api/api-client.service';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-product-details',
  imports: [FooterComponent, NavbarComponent, RouterLink, IconComponent],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsComponent implements OnInit {
  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());

  MediasDetailsSignal = signal<MediaUploadData[] | undefined>(undefined);
  MediaDetails = computed(() => this.MediasDetailsSignal());

  selectedImageSignal = signal<MediaUploadData | undefined>(undefined);
  selectedImage = computed(() => this.selectedImageSignal());

  isLoading = signal(true);
  isMediaLoading = signal(true);
  errorMessage = signal<string | null>(null);
  mediaErrorMessage = signal<string | null>(null);
  isDeleting = signal(false);

  productId: string = '';
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiClient);



  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.productId = productId;
        this.findProduct(productId);
        this.loadMedia(productId);
      } else {
        this.errorMessage.set('Missing product id.');
        this.isLoading.set(false);
        this.isMediaLoading.set(false);
      }
    });
  }
  findProduct(productId: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productService.getProduct(productId).subscribe({
      next: (response: ProductResponse) => {
        this.productDetailsSignal.set(response);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        switch (err.status) {
          case 404:
            this.toastService.error('The product you’re looking for doesn’t exist or may have been removed.');
            this.router.navigate(['/not-found']);
            break;
        
          default:
            this.errorMessage.set(
              this.api.getErrorMessage(err, 'Unable to load this product.'),
            );
            break;
        }
      }
    })
  }
  loadMedia(productId: string) {
    this.isMediaLoading.set(true);
    this.mediaErrorMessage.set(null);

    this.mediaService.getMediaByProduct(productId).subscribe({
      next: (response: MediaUploadData[]) => {
        this.MediasDetailsSignal.set(response ?? []);
        if (response?.[0]) {
          this.selectedImageSignal.set(response[0]);
        }
        this.isMediaLoading.set(false);
      },
      error: (err) => {
        this.mediaErrorMessage.set(
          this.api.getErrorMessage(err, 'Unable to load product images.'),
        );
        this.MediasDetailsSignal.set([]);
        this.isMediaLoading.set(false);
      }
    })
  }
  selectImage(selectedId: string) {
    const selectedImage = this.MediaDetails()?.filter((media) => {
      return media.id == selectedId;
    })[0];
    this.selectedImageSignal.set(selectedImage);
  }
  updateProduct() {
    this.router.navigate(['/seller/products', this.productId, 'edit']);
  }

  delete() {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.productService.deleteProduct(this.productId).subscribe({
      next: () => {
        this.toastService.success("Product deleted successfully.");
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, "Product could not be deleted."));
        this.isDeleting.set(false);
      }
    })
  }

  imageDataUrl(media: MediaUploadData): string {
    return this.mediaService.toDataUrl(media);
  }
}
