import { ChangeDetectorRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductRequest, ProductResponse, ProductService } from '../../../../shared/services/product-service';
import { FormsModule } from '@angular/forms';
import { Media, MediaService, ProductImage } from '../../../../shared/services/media-service';
import { ToastService } from '../../../../shared/services/toast-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from '../../../../core/api/api-client.service';
import { AuthService } from '../../../auth/auth.service';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { SellerSidebarComponent } from '../../seller-sidebar/seller-sidebar.component';

@Component({
  selector: 'app-product-form',
  imports: [SellerSidebarComponent, FormsModule, RouterLink, IconComponent],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly api = inject(ApiClient);
  private readonly authService = inject(AuthService);


  mode: 'create' | 'edit' = 'create';
  productDetailsSignal = signal<ProductResponse | undefined>(undefined);
  productDetails = computed(() => this.productDetailsSignal());

  productId = signal<string>('');

  selectedImages: ProductImage[] = [];
  maxImages = 5;
  isLoading = signal(false);
  isSaving = signal(false);
  formSubmitted = signal(false);
  formErrors = signal<string[]>([]);
  currentUser = this.authService.getStoredUser();
  sellerInitials = computed(() => this.getInitials(this.currentUser?.name ?? ''));

  productInfo: ProductRequest = {
    name: '',
    description: '',
    price: 0,
    quantity: 100
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const productId = params.get('id');
      if (productId) {
        this.productId.set(productId);
        this.mode = 'edit';
        this.loadProductData();
        this.loadMediaData();

      }
    });
  }

  saveProduct() {
    this.formSubmitted.set(true);
    const validationErrors = this.validateProduct();
    this.formErrors.set(validationErrors);

    if (this.currentUser?.role !== 'SELLER') {
      const message = 'Only seller accounts can save products.';
      this.formErrors.set([message]);
      this.toastService.error(message);
      this.router.navigate(['/products']);
      return;
    }

    if (validationErrors.length > 0) {
      this.toastService.error(validationErrors[0]);
      return;
    }

    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.formErrors.set([]);

    if (this.mode === 'edit') {
      this.saveExistingProduct();
    } else {
      this.createProduct();
    }
  }

  private saveExistingProduct(): void {
    this.productService.updateProduct(this.productId(), this.productPayload()).subscribe({
      next: () => {
        this.syncExistingProductMedia();
      },
      error: (err: HttpErrorResponse) => {
        this.handleSaveError(err, 'Product could not be updated.');
      }
    });
  }

  private syncExistingProductMedia(): void {
    const files = this.selectedImageFiles();
    const request = files.length > 0
      ? this.mediaService.replaceProductMedia(this.productId(), files)
      : this.mediaService.deleteProductMedia(this.productId());

    request.subscribe({
      next: () => {
        this.finishSave('Product updated successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.handleSaveError(err, 'Product media could not be updated.');
      }
    });
  }

  private createProduct(): void {
    this.productService.publishProduct(this.productPayload()).subscribe({
      next: (product) => {
        const files = this.selectedImageFiles();

        if (files.length === 0) {
          this.finishSave('Product created successfully.');
          return;
        }

        this.mediaService.publishMedia(product.id, files).subscribe({
          next: () => {
            this.finishSave('Product created successfully.');
          },
          error: (err: HttpErrorResponse) => {
            this.handleSaveError(err, 'Product was created, but media upload failed.');
            this.router.navigate(['/seller/products', product.id, 'edit']);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.handleSaveError(err, 'Product could not be created.');
      }
    });
  }

  private finishSave(message: string): void {
    this.toastService.success(message);
    this.isSaving.set(false);
    this.router.navigate(['/seller']);
  }

  private handleSaveError(error: unknown, fallback: string): void {
    const message = this.api.getErrorMessage(error, fallback);
    this.formErrors.set([message]);
    this.toastService.error(message);
    this.isSaving.set(false);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const remainingSlots = Math.max(0, this.maxImages - this.selectedImages.length);
    if (remainingSlots === 0) {
      this.toastService.error(`You can attach up to ${this.maxImages} images.`);
      input.value = '';
      return;
    }

    const files = Array.from(input.files).slice(0, remainingSlots);
    const validFiles = files.filter((file) => this.isValidImage(file));

    if (validFiles.length !== files.length) {
      this.toastService.error('Only JPG, PNG, WEBP, or AVIF images up to 2 MB are allowed.');
    }

    const mappedFiles: ProductImage[] = validFiles.map(file => ({
      id: '',
      isNew: true,
      deleted: false,
      file,
      preview: URL.createObjectURL(file)
    }));

    this.selectedImages = [...this.selectedImages, ...mappedFiles];
    input.value = '';
  }

  deleteImage(fileToDelete: ProductImage): void {
    const item = this.selectedImages.find(
      item => item === fileToDelete
    );
    if (item) {
      URL.revokeObjectURL(item.preview);
    }
    this.selectedImages = this.selectedImages.filter(
      item => item !== fileToDelete
    );

  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(item => {
      URL.revokeObjectURL(item.preview);
    });
  }
  loadProductData() {
    this.isLoading.set(true);
    this.productService.getProduct(this.productId()).subscribe({
      next: (response: ProductResponse) => {
        if (!response.owner) {
          this.toastService.error('You can only edit products you own.');
          this.isLoading.set(false);
          this.router.navigate(['/products']);
          return;
        }

        this.productDetailsSignal.set(response);
        this.productInfo.name = response.name;
        this.productInfo.description = response.description;
        this.productInfo.price = response.price;
        this.productInfo.quantity = response.quantity;
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, 'Unable to load product.'));
        this.isLoading.set(false);
      }
    })
  }

  loadMediaData() {
    this.mediaService.getMediaByProduct(this.productId()).subscribe({
      next: (response: Media[]) => {
        this.selectedImages = [];
        response.forEach((media) => {
          const file = this.rawBase64ToFile(
            media.base64Image,
            `image-${media.id}`,
            media.contentType || 'image/jpeg'
          );
          this.selectedImages.push({
            id: media.id,
            file: file,
            preview: URL.createObjectURL(file),
            isNew: false,
            deleted: false
          });
        })
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, 'Unable to load product media.'));
      }
    })
  }

  rawBase64ToFile(
    base64: string,
    filename: string,
    mimeType: string
  ): File {
    const byteString = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }

    return new File([intArray], filename, { type: mimeType });
  }

  private selectedImageFiles(): File[] {
    return this.selectedImages.filter((image) => !image.deleted).map((image) => image.file);
  }

  private productPayload(): ProductRequest {
    return {
      name: this.productInfo.name.trim(),
      description: this.productInfo.description.trim(),
      price: Number(this.productInfo.price),
      quantity: Number(this.productInfo.quantity),
    };
  }

  private validateProduct(): string[] {
    const errors: string[] = [];
    const name = this.productInfo.name.trim();
    const description = this.productInfo.description.trim();
    const price = Number(this.productInfo.price);
    const quantity = Number(this.productInfo.quantity);

    if (name.length < 2) {
      errors.push('Product title must be at least 2 characters.');
    }

    if (description.length < 10) {
      errors.push('Description must be at least 10 characters.');
    }

    if (!Number.isFinite(price) || price <= 0) {
      errors.push('Enter a valid price greater than 0.');
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.push('Stock quantity must be 0 or greater.');
    }

    return errors;
  }

  private isValidImage(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    return allowedTypes.includes(file.type) && file.size <= 2 * 1024 * 1024;
  }

  private getInitials(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'U'
    );
  }
}
