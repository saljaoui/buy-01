import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthUser } from '../../features/auth/auth.models';
import { IconComponent } from '../icon/icon.component';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly cart = inject(CartService);

  protected currentUser = this.authService.getStoredUser();

  /**
   * Search text. The URL's ?q= is the single source of truth, shared with the catalog's own
   * search box: this box writes to it while you type on /products and follows it otherwise.
   */
  protected readonly searchText = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  private readonly typed$ = new Subject<string>();

  /** True for a moment after items are added, so the cart badge does a small bump. */
  protected readonly cartBump = signal(false);
  private lastCartCount = this.cart.count();
  private bumpTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const count = this.cart.count();
      if (count > this.lastCartCount) {
        this.cartBump.set(true);
        if (this.bumpTimer) clearTimeout(this.bumpTimer);
        this.bumpTimer = setTimeout(() => this.cartBump.set(false), 450);
      }
      this.lastCartCount = count;
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.bumpTimer) clearTimeout(this.bumpTimer);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q') ?? '';
      // Keep what the user is typing (e.g. a trailing space) if it already matches the URL.
      if (this.searchText().trim() !== q) {
        this.searchText.set(q);
      }
    });

    this.typed$
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((q) => this.writeQuery(q));
  }

  /** True on the catalog itself, where typing filters live. */
  private get onCatalog(): boolean {
    return this.router.url.split(/[?#]/)[0] === '/products';
  }

  /** Sellers can't buy, so they get no cart. */
  protected get canShop(): boolean {
    return this.currentUser?.role !== 'SELLER';
  }

  protected get isClient(): boolean {
    return this.currentUser?.role === 'CLIENT';
  }

  protected onSearchInput(value: string): void {
    this.searchText.set(value);
    if (this.onCatalog) {
      this.typed$.next(value.trim());
    }
  }

  protected search(event: Event, value: string): void {
    event.preventDefault();
    const q = value.trim();
    if (this.onCatalog) {
      this.writeQuery(q);
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    void this.router.navigate(['/products'], { queryParams: q ? { q } : {} });
  }

  /** On the catalog: change only ?q= (and reset the page), keeping the other filters. */
  private writeQuery(q: string): void {
    if (!this.onCatalog) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected get sellerDashboardLink(): string | null {
    return this.currentUser?.role === 'SELLER' ? '/seller' : null;
  }

  protected get profileLabel(): string {
    if (!this.currentUser) {
      return '';
    }

    return this.currentUser.role === 'SELLER' ? 'Seller profile' : 'Client account';
  }

  protected get userInitials(): string {
    return this.getUserInitials(this.currentUser);
  }

  protected logout(): void {
    this.authService.clearSession();
    this.currentUser = null;
    void this.router.navigate(['/login']);
  }

  private getUserInitials(user: AuthUser | null): string {
    if (!user?.name) {
      return 'U';
    }

    const initials = user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return initials || 'U';
  }
}
