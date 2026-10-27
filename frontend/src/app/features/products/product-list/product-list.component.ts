import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { MediaService } from '../../../shared/services/media-service';
import { Page, ProductResponse, ProductService } from '../../../shared/services/product-service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FooterComponent, NavbarComponent, IconComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent implements OnInit {
  ngOnInit(): void {
    this.loadProducts();
  }
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly api = inject(ApiClient);

  productListSignal = signal<ProductResponse[]>([]);
  productList = computed(() => this.productListSignal());
  productCount = computed(() => this.productList().length);
  productImages = signal<Record<string, string>>({});
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = 12;

  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.productService.getProducts(this.currentPage(), this.pageSize).subscribe({
      next: (page: Page<ProductResponse>) => {
        this.productListSignal.set(page.content);
        this.totalPages.set(page.totalPages);
        this.totalElements.set(page.totalElements);
        this.isLoading.set(false);
        this.loadProductImages(page.content);
      },
      error: (err) => {
        this.errorMessage.set(this.api.getErrorMessage(err, 'Unable to load products right now.'));
        this.isLoading.set(false);
      },
    });
  }

  private loadProductImages(products: ProductResponse[]): void {
    this.productImages.set({});
    if (products.length === 0) return;
    forkJoin(
      products.map((product) =>
        this.mediaService.getMediaByProduct(product.id).pipe(
          map((mediaList) => (mediaList.length > 0 ? mediaList[0] : null)),
          catchError(() => of(null)),
        ),
      ),
    ).subscribe({
      next: (mediaList) => {
        const imageMap: Record<string, string> = {};
        products.forEach((product, index) => {
          const media = mediaList[index];
          console.log('Media for product', product.id, media);
          if (media) {
            imageMap[product.id] = this.mediaService.imageUrl(media);
          }
        });
        this.productImages.set(imageMap);
      },
    });
  }

  getProductImage(productId: string): string | null {
    return this.productImages()[productId] ?? null;
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadProducts();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  pageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }
}
