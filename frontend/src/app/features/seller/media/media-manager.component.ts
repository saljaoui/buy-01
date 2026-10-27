import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiClient } from '../../../core/api/api-client.service';
import { AuthUser } from '../../auth/auth.models';
import { AuthService } from '../../auth/auth.service';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { SellerSidebarComponent } from '../seller-sidebar/seller-sidebar.component';
import { ToastService } from '../../../shared/services/toast-service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

type SortMode = 'newest' | 'oldest' | 'name';

interface MediaAsset {
  id: string;
  media: Media;
  productId: string;
  productName: string;
  fileName: string;
  order: number;
}

@Component({
  selector: 'app-media-manager',
  imports: [SellerSidebarComponent, FormsModule, RouterLink, IconComponent],
  templateUrl: './media-manager.component.html',
  styleUrl: './media-manager.component.scss',
})
export class MediaManagerComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);

  user = signal<AuthUser | null>(null);
  products = signal<ProductResponse[]>([]);
  mediaAssets = signal<MediaAsset[]>([]);
  selectedFiles = signal<File[]>([]);
  uploadProductId = signal('');
  filterProductId = signal('all');
  selectedAssetId = signal<string | null>(null);
  searchTerm = signal('');
  sortMode = signal<SortMode>('newest');

  isLoadingProducts = signal(true);
  isLoadingMedia = signal(false);
  isUploading = signal(false);
  deletingAssetId = signal<string | null>(null);
  isClearingProductMedia = signal(false);
  errorMessage = signal<string | null>(null);
  uploadError = signal<string | null>(null);

  userInitials = computed(() => this.getInitials(this.user()?.name ?? ''));
  totalProducts = computed(() => this.products().length);
  selectedProduct = computed(() =>
    this.products().find((product) => product.id === this.uploadProductId()) ?? null,
  );
  filteredAssets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const productFilter = this.filterProductId();
    const sortedAssets = [...this.mediaAssets()].sort((left, right) => {
      if (this.sortMode() === 'oldest') {
        return left.order - right.order;
      }
      if (this.sortMode() === 'name') {
        return left.fileName.localeCompare(right.fileName);
      }
      return right.order - left.order;
    });
    return sortedAssets.filter((asset) => {
      const matchesProduct = productFilter === 'all' || asset.productId === productFilter;
      const matchesSearch =
        !term ||
        asset.fileName.toLowerCase().includes(term) ||
        asset.productName.toLowerCase().includes(term);
      return matchesProduct && matchesSearch;
    });
  });
  selectedAsset = computed(() => {
    const assets = this.filteredAssets();
    return assets.find((asset) => asset.id === this.selectedAssetId()) ?? assets[0] ?? null;
  });
  selectedProductMediaCount = computed(() => {
    const productId = this.uploadProductId();
    return productId
      ? this.mediaAssets().filter((asset) => asset.productId === productId).length
      : 0;
  });
  selectedFileSummary = computed(() => {
    const files = this.selectedFiles();
    if (files.length === 0) {
      return 'No files selected';
    }
    return `${files.length} ${files.length === 1 ? 'file' : 'files'} ready`;
  });

  ngOnInit(): void {
    const storedUser = this.authService.getStoredUser();
    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }
    if (storedUser.role !== 'SELLER') {
      this.router.navigate(['/products']);
      return;
    }
    this.user.set(storedUser);
    this.loadProducts(storedUser.id);
  }

  loadProducts(userId = this.user()?.id): void {
    if (!userId) {
      this.errorMessage.set('Unable to identify the current seller.');
      this.isLoadingProducts.set(false);
      return;
    }
    this.isLoadingProducts.set(true);
    this.isLoadingMedia.set(false);
    this.errorMessage.set(null);
    this.productService.getProductsOwnedBy(userId).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoadingProducts.set(false);
        if (products.length === 0) {
          this.uploadProductId.set('');
          this.filterProductId.set('all');
          this.mediaAssets.set([]);
          this.selectedFiles.set([]);
          return;
        }
        const currentProductId = this.uploadProductId();
        const nextProduct =
          products.find((product) => product.id === currentProductId) ?? products[0];
        this.uploadProductId.set(nextProduct.id);
        this.filterProductId.set(nextProduct.id);
        this.loadMedia();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Unable to load seller products.'));
        this.isLoadingProducts.set(false);
      },
    });
  }

  loadMedia(): void {
    const products = this.products();
    if (products.length === 0) {
      this.mediaAssets.set([]);
      this.isLoadingMedia.set(false);
      return;
    }
    this.isLoadingMedia.set(true);
    this.errorMessage.set(null);
    forkJoin(
      products.map((product, productIndex) =>
        this.mediaService.getMediaByProduct(product.id).pipe(
          map((mediaList) =>
            mediaList.map((media, mediaIndex) =>
              this.toMediaAsset(media, product, productIndex, mediaIndex),
            ),
          ),
        ),
      ),
    ).subscribe({
      next: (mediaGroups) => {
        const assets = mediaGroups.flat();
        this.mediaAssets.set(assets);
        this.ensureSelectedAssetExists(assets);
        this.isLoadingMedia.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.api.getErrorMessage(error, 'Unable to load product media.'));
        this.isLoadingMedia.set(false);
      },
    });
  }

  selectUploadProduct(productId: string): void {
    this.uploadProductId.set(productId);
    if (productId) {
      this.filterProductId.set(productId);
    }
  }

  updateFilterProduct(productId: string): void {
    this.filterProductId.set(productId || 'all');
    this.selectedAssetId.set(null);
  }

  updateSortMode(value: string): void {
    if (value === 'oldest' || value === 'name') {
      this.sortMode.set(value);
      return;
    }
    this.sortMode.set('newest');
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.selectedAssetId.set(null);
  }

  showAllAssets(): void {
    this.filterProductId.set('all');
    this.selectedAssetId.set(null);
  }

  selectAsset(asset: MediaAsset): void {
    this.selectedAssetId.set(asset.id);
  }

  openAsset(asset: MediaAsset | null): void {
    if (!asset) {
      return;
    }
    this.selectedAssetId.set(asset.id);
    window.open(this.mediaService.imageUrl(asset.media), '_blank', 'noopener,noreferrer');
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    if (!this.uploadProductId()) {
      this.setUploadError('Select a product before choosing media.');
      return;
    }
    const validFiles = files.filter((file) => this.isValidImage(file));
    if (validFiles.length !== files.length) {
      this.setUploadError('Only JPG, PNG, WEBP, or AVIF images up to 2 MB are allowed.');
    } else {
      this.uploadError.set(null);
    }
    if (validFiles.length === 0) {
      return;
    }
    this.selectedFiles.set([...this.selectedFiles(), ...validFiles]);
  }

  clearSelectedFiles(): void {
    this.selectedFiles.set([]);
    this.uploadError.set(null);
  }

  uploadSelectedFiles(): void {
    const productId = this.uploadProductId();
    const files = this.selectedFiles();
    if (!productId) {
      this.setUploadError('Select a product before uploading media.');
      return;
    }
    if (files.length === 0) {
      this.setUploadError('Choose at least one image to upload.');
      return;
    }
    this.isUploading.set(true);
    this.uploadError.set(null);
    let uploaded = 0;
    files.forEach((file) => {
      this.mediaService.upload(productId, file).subscribe({
        next: () => {
          uploaded++;
          if (uploaded === files.length) {
            this.toastService.success('Media uploaded successfully.');
            this.selectedFiles.set([]);
            this.isUploading.set(false);
            this.filterProductId.set(productId);
            this.loadMedia();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.setUploadError(this.api.getErrorMessage(error, 'Media upload failed.'));
          this.isUploading.set(false);
        },
      });
    });
  }

  deleteAsset(asset: MediaAsset): void {
    const confirmed = window.confirm(`Delete ${asset.fileName} from ${asset.productName}?`);
    if (!confirmed) {
      return;
    }
    this.deletingAssetId.set(asset.id);
    this.mediaService.deleteMedia(asset.media.id).subscribe({
      next: () => {
        this.toastService.success('Media deleted successfully.');
        this.deletingAssetId.set(null);
        this.selectedAssetId.set(null);
        this.loadMedia();
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(this.api.getErrorMessage(error, 'Media could not be deleted.'));
        this.deletingAssetId.set(null);
      },
    });
  }

  clearSelectedProductMedia(): void {
    const product = this.selectedProduct();
    if (!product || this.selectedProductMediaCount() === 0) {
      return;
    }
    const confirmed = window.confirm(`Delete all media for ${product.name}?`);
    if (!confirmed) {
      return;
    }
    this.isClearingProductMedia.set(true);
    const assets = this.mediaAssets().filter((a) => a.productId === product.id);
    let deleted = 0;
    assets.forEach((asset) => {
      this.mediaService.deleteMedia(asset.media.id).subscribe({
        next: () => {
          deleted++;
          if (deleted === assets.length) {
            this.toastService.success('Product media deleted successfully.');
            this.isClearingProductMedia.set(false);
            this.selectedAssetId.set(null);
            this.loadMedia();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error(this.api.getErrorMessage(error, 'Product media could not be deleted.'));
          this.isClearingProductMedia.set(false);
        },
      });
    });
  }

  mediaCountFor(productId: string): number {
    return this.mediaAssets().filter((asset) => asset.productId === productId).length;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  private toMediaAsset(media: Media, product: ProductResponse, productIndex: number, mediaIndex: number): MediaAsset {
    const assetNumber = mediaIndex + 1;
    return {
      id: media.id,
      media,
      productId: product.id,
      productName: product.name || 'Untitled product',
      fileName: `${this.slugify(product.name || 'product')}-${assetNumber}`,
      order: productIndex * 1000 + mediaIndex,
    };
  }

  private ensureSelectedAssetExists(assets: MediaAsset[]): void {
    const selectedId = this.selectedAssetId();
    if (selectedId && assets.some((asset) => asset.id === selectedId)) {
      return;
    }
    this.selectedAssetId.set(assets[0]?.id ?? null);
  }

  private isValidImage(file: File): boolean {
    return ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE;
  }

  private setUploadError(message: string): void {
    this.uploadError.set(message);
    this.toastService.error(message);
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'product';
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
