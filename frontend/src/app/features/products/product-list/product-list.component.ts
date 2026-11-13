import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { AuthService } from '../../auth/auth.service';
import { ProductSearchQuery, ProductSort } from '../../../core/models/commerce.models';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductCardComponent, ProductCardLayout } from '../../../shared/products/product-card/product-card.component';
import { productInitial } from '../../../shared/products/stock';
import { MediaService } from '../../../shared/services/media-service';
import { Page, ProductResponse, ProductService } from '../../../shared/services/product-service';

const SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc', 'name'];

/** How many products the hero stack shows. */
const HERO_SIZE = 3;

/** Height of the sticky navbar; the filter bar sticks right under it. */
const NAVBAR_HEIGHT = 69;

export interface HeroItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

@Component({
  selector: 'app-product-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CurrencyPipe,
    NgOptimizedImage,
    FooterComponent,
    NavbarComponent,
    IconComponent,
    ProductCardComponent,
  ],
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Who is looking: drives the hero buttons. Read once; signing in/out navigates away. */
  protected readonly user = signal(inject(AuthService).getAuthenticatedUser());
  protected readonly role = computed(() => this.user()?.role ?? 'GUEST');

  /** Hero stack: the first products of the unfiltered catalog, independent of the filters below. */
  protected readonly heroItems = signal<HeroItem[]>([]);
  protected readonly heroLoading = signal(true);
  protected readonly catalogTotal = signal(0);
  /** Pointer position over the hero visual, -0.5..0.5 on each axis, for the parallax. */
  protected readonly tilt = signal({ x: 0, y: 0 });

  /** True once the filter bar is stuck under the navbar; it then gets more compact. */
  protected readonly filtersStuck = signal(false);
  /** Cards fade in on the first load only, not on every filter change. */
  protected readonly animateCards = signal(true);
  private loadCount = 0;

  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);
  /** One product gets a wide feature card, two get landscape cards. */
  protected readonly cardLayout = computed<ProductCardLayout>(() => {
    const n = this.productList().length;
    return n === 1 ? 'feature' : n === 2 ? 'wide' : 'tile';
  });

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

  constructor() {
    afterNextRender(() => this.watchFilterBar());
  }

  ngOnInit(): void {
    this.loadHero();

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
        this.animateCards.set(this.loadCount++ === 0);
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
    const urlQuery = params.get('q') ?? '';
    const typed = this.filters.controls.q.value;
    this.filters.setValue(
      {
        // The URL holds the trimmed query; don't strip a space the user is still typing.
        q: typed.trim() === urlQuery ? typed : urlQuery,
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

  // ---------- Hero ----------

  private loadHero(): void {
    this.productService
      .searchProducts({ sort: 'newest', page: 0, size: HERO_SIZE })
      .pipe(
        switchMap((page) => {
          this.catalogTotal.set(page.totalElements);
          if (page.content.length === 0) return of<HeroItem[]>([]);
          return forkJoin(
            page.content.map((product) =>
              this.mediaService.getMediaByProduct(product.id).pipe(
                map((media): HeroItem => ({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: media.length > 0 ? this.mediaService.imageUrl(media[0]) : null,
                })),
                catchError(() => of<HeroItem>({ id: product.id, name: product.name, price: product.price, image: null })),
              ),
            ),
          );
        }),
        catchError(() => of<HeroItem[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.heroItems.set(items);
        this.heroLoading.set(false);
      });
  }

  protected onHeroPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.tilt.set({
      x: round((event.clientX - rect.left) / rect.width - 0.5),
      y: round((event.clientY - rect.top) / rect.height - 0.5),
    });
  }

  protected resetTilt(): void {
    this.tilt.set({ x: 0, y: 0 });
  }

  /** First letter for products without a photo. */
  protected initial(name: string): string {
    return productInitial(name);
  }

  // ---------- Sticky filter bar ----------

  private watchFilterBar(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const sentinel = this.host.nativeElement.querySelector('.filter-sentinel');
    if (!sentinel) return;

    // The page scrolls inside .storefront-shell, not the window.
    const root = this.host.nativeElement.querySelector('.storefront-shell');
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        this.filtersStuck.set(!entry.isIntersecting && entry.boundingClientRect.top < rootTop + NAVBAR_HEIGHT);
      },
      { root, rootMargin: `-${NAVBAR_HEIGHT}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    this.destroyRef.onDestroy(() => observer.disconnect());
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

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
