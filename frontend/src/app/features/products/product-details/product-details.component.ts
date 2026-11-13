import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { ProductCardComponent } from '../../../shared/products/product-card/product-card.component';
import { productInitial, stockBadge } from '../../../shared/products/stock';
import { CartService } from '../../../shared/services/cart.service';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';
import { AuthService } from '../../auth/auth.service';

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error';

/** How many products "You might also like" shows. */
const RELATED_SIZE = 4;
/** Horizontal distance (px) a touch must travel to count as a swipe. */
const SWIPE_DISTANCE = 40;

@Component({
  selector: 'app-product-details',
  imports: [
    CurrencyPipe,
    NgOptimizedImage,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsComponent {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly toast = inject(ToastService);
  private readonly cart = inject(CartService);
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // ---------- Page ----------

  protected readonly status = signal<PageStatus>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly product = signal<ProductResponse | null>(null);
  private productId = '';

  /** Who is looking. Signing in or out navigates away, so reading it once is enough. */
  protected readonly role = signal(inject(AuthService).getAuthenticatedUser()?.role ?? 'GUEST');
  protected readonly isOwner = computed(() => !!this.product()?.owner);
  /** Sellers manage products; only guests and clients buy. */
  protected readonly canBuy = computed(() => !this.isOwner() && this.role() !== 'SELLER');

  // ---------- Gallery ----------

  protected readonly media = signal<Media[]>([]);
  protected readonly mediaLoading = signal(true);
  protected readonly activeIndex = signal(0);
  protected readonly activeImage = computed(() => this.media()[this.activeIndex()] ?? null);
  /** False until the active photo has loaded; a skeleton covers the stage meanwhile. */
  protected readonly imageLoaded = signal(false);
  /** Hover-zoom focus point in % of the stage, or null when not zooming. */
  protected readonly zoom = signal<{ x: number; y: number } | null>(null);
  protected readonly lightboxOpen = signal(false);
  private readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');
  private swipeStartX: number | null = null;
  /** A swipe also fires a click; this stops that click from opening the lightbox. */
  private justSwiped = false;

  // ---------- Buying ----------

  protected readonly quantity = signal(1);
  protected readonly adding = signal(false);
  protected readonly isDeleting = signal(false);

  protected readonly stock = computed(() => Math.max(0, this.product()?.quantity ?? 0));
  protected readonly badge = computed(() => stockBadge(this.stock()));
  protected readonly inCart = computed(() => this.cart.quantityOf(this.product()?.id ?? ''));
  /** How many more can still go in the cart without passing the stock. */
  protected readonly canAddMore = computed(() => Math.max(0, this.stock() - this.inCart()));
  protected readonly maxQuantity = computed(() => Math.max(1, this.canAddMore()));
  protected readonly addDisabled = computed(() => this.adding() || this.canAddMore() === 0);
  protected readonly addLabel = computed(() => {
    if (this.stock() === 0) return 'Out of stock';
    if (this.canAddMore() === 0) return 'All in your cart';
    return 'Add to cart';
  });

  // ---------- You might also like ----------

  protected readonly related = signal<ProductResponse[]>([]);
  protected readonly relatedImages = signal<Record<string, string>>({});

  protected readonly initial = computed(() => productInitial(this.product()?.name ?? ''));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => this.load(params.get('id')));

    // Keep the chosen quantity inside the limits when the stock or the cart changes.
    effect(() => {
      const max = this.maxQuantity();
      if (untracked(this.quantity) > max) this.quantity.set(max);
    });
  }

  // ---------- Loading ----------

  private load(id: string | null): void {
    this.product.set(null);
    this.media.set([]);
    this.related.set([]);
    this.relatedImages.set({});
    this.activeIndex.set(0);
    this.imageLoaded.set(false);
    this.quantity.set(1);
    this.errorMessage.set(null);
    this.host.nativeElement.querySelector('.storefront-shell')?.scrollTo?.({ top: 0 });

    if (!id) {
      this.status.set('not-found');
      return;
    }
    this.productId = id;
    this.status.set('loading');
    this.loadProduct(id);
    this.loadMedia(id);
    this.loadRelated(id);
  }

  protected retry(): void {
    this.load(this.productId);
  }

  private loadProduct(id: string): void {
    this.productService
      .getProduct(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.status.set('ready');
          this.title.setTitle(`${product.name} · Buy01`);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404 || err.status === 400) {
            this.status.set('not-found');
            this.title.setTitle('Product not found · Buy01');
            return;
          }
          this.errorMessage.set(this.api.getErrorMessage(err, 'Unable to load this product.'));
          this.status.set('error');
        },
      });
  }

  private loadMedia(id: string): void {
    this.mediaLoading.set(true);
    this.mediaService
      .getMediaByProduct(id)
      .pipe(
        catchError(() => of<Media[]>([])),
        finalize(() => this.mediaLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.media.set(list ?? []));
  }

  /** Other products from the existing products endpoint; the section hides if there are none. */
  private loadRelated(id: string): void {
    this.productService
      .searchProducts({ page: 0, size: RELATED_SIZE + 1 })
      .pipe(
        map((page) => page.content.filter((p) => p.id !== id).slice(0, RELATED_SIZE)),
        catchError(() => of<ProductResponse[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => {
        this.related.set(products);
        if (products.length === 0) return;
        forkJoin(
          products.map((p) =>
            this.mediaService.getMediaByProduct(p.id).pipe(
              map((list) => (list.length > 0 ? this.mediaService.imageUrl(list[0]) : null)),
              catchError(() => of(null)),
            ),
          ),
        )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((urls) => {
            const images: Record<string, string> = {};
            products.forEach((p, i) => {
              if (urls[i]) images[p.id] = urls[i]!;
            });
            this.relatedImages.set(images);
          });
      });
  }

  imageUrl(media: Media): string {
    return this.mediaService.imageUrl(media);
  }

  protected photoAlt(index: number): string {
    const name = this.product()?.name ?? 'Product';
    const total = this.media().length;
    return total > 1 ? `${name}, photo ${index + 1} of ${total}` : name;
  }

  // ---------- Gallery ----------

  protected select(index: number): void {
    const total = this.media().length;
    if (total === 0) return;
    const next = ((index % total) + total) % total;
    if (next === this.activeIndex()) return;
    this.activeIndex.set(next);
    this.imageLoaded.set(false);
    this.zoom.set(null);
  }

  protected next(): void {
    this.select(this.activeIndex() + 1);
  }

  protected prev(): void {
    this.select(this.activeIndex() - 1);
  }

  /** Left/right arrows anywhere in the gallery (stage, arrows, thumbnails) or in the lightbox. */
  protected onGalleryKeydown(event: KeyboardEvent): void {
    if (this.media().length < 2) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    if (event.key === 'ArrowRight') this.next();
    else this.prev();

    // If a thumbnail had focus, move focus to the new active one.
    const target = event.target as HTMLElement | null;
    if (target?.closest('.thumb-strip')) {
      this.host.nativeElement
        .querySelector<HTMLButtonElement>(`[data-thumb="${this.activeIndex()}"]`)
        ?.focus();
    }
  }

  protected onStagePointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.activeImage()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.zoom.set({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    });
  }

  protected endZoom(): void {
    this.zoom.set(null);
  }

  protected onSwipeStart(event: PointerEvent): void {
    this.swipeStartX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected onSwipeEnd(event: PointerEvent): void {
    if (this.swipeStartX === null) return;
    const dx = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(dx) < SWIPE_DISTANCE) return;
    this.justSwiped = true;
    setTimeout(() => (this.justSwiped = false), 350);
    if (dx < 0) this.next();
    else this.prev();
  }

  protected openLightbox(): void {
    if (!this.activeImage() || this.justSwiped) return;
    this.zoom.set(null);
    this.lightboxOpen.set(true);
    const dialog = this.lightbox()?.nativeElement;
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  protected closeLightbox(): void {
    const dialog = this.lightbox()?.nativeElement;
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    this.lightboxOpen.set(false);
  }

  /** A click on the dark backdrop (the dialog itself, not its content) closes it. */
  protected onLightboxClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeLightbox();
  }

  // ---------- Buying ----------

  protected changeQuantity(delta: number): void {
    this.quantity.set(Math.min(this.maxQuantity(), Math.max(1, this.quantity() + delta)));
  }

  /**
   * The cart lives in the browser, so before adding we ask the server for the product again:
   * that gives a real loading state, the current stock, and the server's message if it fails.
   */
  protected addToCart(): void {
    const product = this.product();
    if (!product || this.addDisabled() || !this.canBuy()) return;

    if (this.role() === 'GUEST') {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const wanted = this.quantity();
    this.adding.set(true);
    this.productService
      .getProduct(product.id)
      .pipe(
        finalize(() => this.adding.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (fresh) => {
          this.product.set(fresh);
          const room = Math.max(0, fresh.quantity - this.cart.quantityOf(fresh.id));

          if (room === 0) {
            this.toast.error(
              fresh.quantity <= 0 ? 'Sorry, this product just sold out.' : 'You already have all available stock in your cart.',
            );
            return;
          }
          if (wanted > room) {
            this.quantity.set(room);
            this.toast.error(`Only ${room} more available. We lowered the quantity, try again.`);
            return;
          }

          const first = this.media()[0];
          this.cart.add(
            {
              productId: fresh.id,
              name: fresh.name,
              price: fresh.price,
              stock: fresh.quantity,
              imageUrl: first ? this.imageUrl(first) : null,
            },
            wanted,
          );
          this.quantity.set(1);
          this.toast.success(`Added to cart: ${wanted} × ${fresh.name}`, 5000, { label: 'View cart', link: '/cart' });
        },
        error: (err: unknown) => {
          this.toast.error(this.api.getErrorMessage(err, 'Could not add this product to your cart.'));
        },
      });
  }

  // ---------- Owner ----------

  protected delete(): void {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.productService
      .deleteProduct(this.productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Product deleted.');
          void this.router.navigate(['/products']);
        },
        error: (err) => {
          this.toast.error(this.api.getErrorMessage(err, 'Product could not be deleted.'));
          this.isDeleting.set(false);
        },
      });
  }
}
