import { ChangeDetectorRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProductRequest, ProductResponse, ProductService } from '../../../../shared/services/product-service';
import { Media, MediaService, ProductImage } from '../../../../shared/services/media-service';
import { ToastService } from '../../../../shared/services/toast-service';
import { ApiClient } from '../../../../core/api/api-client.service';
import { AuthService } from '../../../auth/auth.service';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { SellerSidebarComponent } from '../../seller-sidebar/seller-sidebar.component';

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

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
  productId = signal<string>('');
  productDetails = signal<ProductResponse | undefined>(undefined);
  isLoading = signal(false);
  isSaving = signal(false);
  formSubmitted = signal(false);
  formErrors = signal<string[]>([]);

  productInfo: ProductRequest = { name: '', description: '', price: 0, quantity: 100 };
  selectedImages: ProductImage[] = [];
  maxImages = MAX_IMAGES;
  currentUser = this.authService.getStoredUser();
  sellerInitials = computed(() => this.getInitials(this.currentUser?.name ?? ''));

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.mode = 'edit';
      this.productId.set(id);
      this.loadProductData();
      this.loadMediaData();
    });
  }

  ngOnDestroy(): void {
    this.selectedImages.forEach((image) => {
      if (image.isNew) URL.revokeObjectURL(image.preview);
    });
  }

  private loadProductData(): void {
    this.isLoading.set(true);
    this.productService.getProduct(this.productId()).subscribe({
      next: (product) => {
        if (!product.owner) {
          this.toastService.error('You can only edit products you own.');
          this.router.navigate(['/products']);
          return;
        }
        this.productDetails.set(product);
        this.productInfo = {
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
        };
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, 'Unable to load product.'));
        this.isLoading.set(false);
      },
    });
  }

  private loadMediaData(): void {
    this.mediaService.getMediaByProduct(this.productId()).subscribe({
      next: (mediaList) => {
        this.selectedImages = mediaList.map((media) => this.toProductImage(media));
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.error(this.api.getErrorMessage(err, 'Unable to load product media.'));
      },
    });
  }

  private toProductImage(media: Media): ProductImage {
    return {
      id: media.id,
      file: new File([], media.id),
      preview: this.mediaService.imageUrl(media),
      isNew: false,
      deleted: false,
    };
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const remainingSlots = this.maxImages - this.selectedImages.length;
    if (remainingSlots <= 0) {
      this.toastService.error(`You can attach up to ${this.maxImages} images.`);
      input.value = '';
      return;
    }
    const files = Array.from(input.files).slice(0, remainingSlots);
    const validFiles = files.filter((file) => this.isValidImage(file));
    if (validFiles.length !== files.length) {
      this.toastService.error('Only JPG, PNG, WEBP, or AVIF images up to 2 MB are allowed.');
    }
    const images: ProductImage[] = validFiles.map((file) => ({
      id: '',
      file,
      preview: URL.createObjectURL(file),
      isNew: true,
      deleted: false,
    }));
    this.selectedImages = [...this.selectedImages, ...images];
    input.value = '';
  }

  deleteImage(image: ProductImage): void {
    if (image.isNew) {
      URL.revokeObjectURL(image.preview);
      this.selectedImages = this.selectedImages.filter((item) => item !== image);
      return;
    }
    image.deleted = true;
    this.selectedImages = this.selectedImages.filter((item) => item !== image);
  }

  private isValidImage(file: File): boolean {
    return ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE;
  }

  saveProduct(): void {
    this.formSubmitted.set(true);
    if (this.currentUser?.role !== 'SELLER') {
      this.rejectSave('Only seller accounts can save products.');
      this.router.navigate(['/products']);
      return;
    }
    const errors = this.validateProduct();
    if (errors.length > 0) {
      this.formErrors.set(errors);
      this.toastService.error(errors[0]);
      return;
    }
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.formErrors.set([]);
    if (this.mode === 'edit') {
      this.updateProduct();
    } else {
      this.createProduct();
    }
  }

  private createProduct(): void {
    this.productService.publishProduct(this.productPayload()).subscribe({
      next: (product) => {
        this.uploadImagesFor(product.id, 'Product created successfully.');
      },
      error: (err) => {
        this.rejectSave(this.api.getErrorMessage(err, 'Product could not be created.'));
      },
    });
  }

  private updateProduct(): void {
    this.productService.updateProduct(this.productId(), this.productPayload()).subscribe({
      next: () => {
        this.syncImagesFor(this.productId(), 'Product updated successfully.');
      },
      error: (err) => {
        this.rejectSave(this.api.getErrorMessage(err, 'Product could not be updated.'));
      },
    });
  }

  private uploadImagesFor(productId: string, successMessage: string): void {
    const files = this.activeImageFiles();
    if (files.length === 0) {
      this.finishSave(successMessage);
      return;
    }
    let uploaded = 0;
    files.forEach((file) => {
      this.mediaService.upload(productId, file).subscribe({
        next: () => {
          uploaded++;
          if (uploaded === files.length) this.finishSave(successMessage);
        },
        error: (err) => {
          this.rejectSave(this.api.getErrorMessage(err, 'Product created but image upload failed.'));
        },
      });
    });
  }

  private syncImagesFor(productId: string, successMessage: string): void {
    const newFiles = this.activeImageFiles();
    const deletedImages = this.selectedImages.filter((image) => image.deleted);
    deletedImages.forEach((image) => {
      this.mediaService.deleteMedia(image.id).subscribe();
    });
    if (newFiles.length === 0) {
      this.finishSave(successMessage);
      return;
    }
    let uploaded = 0;
    newFiles.forEach((file) => {
      this.mediaService.upload(productId, file).subscribe({
        next: () => {
          uploaded++;
          if (uploaded === newFiles.length) this.finishSave(successMessage);
        },
        error: (err) => {
          this.rejectSave(this.api.getErrorMessage(err, 'Product media update failed.'));
        },
      });
    });
  }

  private finishSave(message: string): void {
    this.toastService.success(message);
    this.isSaving.set(false);
    this.router.navigate(['/seller']);
  }

  private rejectSave(message: string): void {
    this.formErrors.set([message]);
    this.toastService.error(message);
    this.isSaving.set(false);
  }

  private activeImageFiles(): File[] {
    return this.selectedImages
      .filter((image) => image.isNew && !image.deleted)
      .map((image) => image.file);
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
    const { name, description, price, quantity } = this.productInfo;
    if (name.trim().length < 2) errors.push('Product title must be at least 2 characters.');
    if (description.trim().length < 10) errors.push('Description must be at least 10 characters.');
    if (!Number.isFinite(Number(price)) || Number(price) <= 0)
      errors.push('Enter a valid price greater than 0.');
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)
      errors.push('Stock quantity must be 0 or greater.');
    return errors;
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
