import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, forkJoin, map, of } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { ProductSearchQuery, ProductSort } from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { MediaService } from '../../../shared/services/media-service';
import { Page, ProductResponse, ProductService } from '../../../shared/services/product-service';

const SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc', 'name'];

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe, FooterComponent, NavbarComponent, IconComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  productListSignal = signal<ProductResponse[]>([]);
  productList = computed(() => this.productListSignal());
  productCount = computed(() => this.totalElements());
  productImages = signal<Record<string, string>>({});
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = 12;

  /** Search + facets. Mirrors the URL query (?q=&min=&max=&stock=&sort=&page=). */
  readonly filters = this.fb.nonNullable.group({
    q: [''],
    minPrice: this.fb.control<number | null>(null),
    maxPrice: this.fb.control<number | null>(null),
    inStock: [false],
    sort: ['newest' as ProductSort],
  });

  readonly sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'name', label: 'Name A–Z' },
  ];

  /** True when any filter is narrowing the results. */
  readonly hasActiveFilters = signal(false);

  ngOnInit(): void {
    // The URL is the source of truth: reload whenever it changes.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.syncFormFromUrl(params);
      this.loadProducts();
    });

    // Typing in the filters updates the URL (debounced), which triggers a reload above.
    this.filters.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pushFiltersToUrl(0));
  }

  protected scrollCatalog(): void {
    const element = document.getElementById('catalog');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.productService.searchProducts(this.currentQuery()).subscribe({
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

  clearFilters(): void {
    this.filters.reset({ q: '', minPrice: null, maxPrice: null, inStock: false, sort: 'newest' }, { emitEvent: false });
    this.pushFiltersToUrl(0);
  }

  private currentQuery(): ProductSearchQuery {
    const v = this.filters.getRawValue();
    return {
      q: v.q,
      minPrice: toNumber(v.minPrice),
      maxPrice: toNumber(v.maxPrice),
      inStock: v.inStock,
      sort: v.sort,
      page: this.currentPage(),
      size: this.pageSize,
    };
  }

  private syncFormFromUrl(params: ParamMap): void {
    const sort = params.get('sort') as ProductSort | null;
    this.filters.setValue(
      {
        q: params.get('q') ?? '',
        minPrice: toNumber(params.get('min')),
        maxPrice: toNumber(params.get('max')),
        inStock: params.get('stock') === '1',
        sort: sort && SORTS.includes(sort) ? sort : 'newest',
      },
      { emitEvent: false },
    );
    this.currentPage.set(Math.max(0, Number(params.get('page') ?? 0) || 0));
    const v = this.filters.getRawValue();
    this.hasActiveFilters.set(!!(v.q || v.minPrice !== null || v.maxPrice !== null || v.inStock || v.sort !== 'newest'));
  }

  private pushFiltersToUrl(page: number): void {
    const v = this.filters.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: v.q?.trim() || null,
        min: toNumber(v.minPrice),
        max: toNumber(v.maxPrice),
        stock: v.inStock ? 1 : null,
        sort: v.sort !== 'newest' ? v.sort : null,
        page: page > 0 ? page : null,
      },
      replaceUrl: true,
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
    this.pushFiltersToUrl(page);
    this.scrollCatalog();
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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
