import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { SellerNavItem, SellerSidebarComponent } from '../seller-sidebar/seller-sidebar.component';
import { SellerSearchComponent } from '../seller-search/seller-search.component';
import { SellerShellService } from './seller-shell.service';

const RAIL_KEY = 'buy01.seller.rail';

/**
 * Shell for every /seller page: sidebar (icon rail on demand, drawer on phones), a slim
 * topbar (breadcrumb, search, orders indicator, View store) and ONE centred container
 * that every page renders into. Page title + main action live in each page's header.
 */
@Component({
  selector: 'app-seller-layout',
  imports: [RouterOutlet, RouterLink, SellerSidebarComponent, SellerSearchComponent, IconComponent],
  templateUrl: './seller-layout.component.html',
  host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class SellerLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly shell = inject(SellerShellService);

  protected readonly url = signal(this.router.url);
  protected readonly user = signal(this.auth.getStoredUser());
  protected readonly menuOpen = signal(false);
  protected readonly collapsed = signal(readRail());

  protected readonly activeItem = computed<SellerNavItem>(() => activeItemFor(this.url()));
  protected readonly crumb = computed(() => crumbFor(this.url()));
  protected readonly initials = computed(() => initialsOf(this.user()?.name ?? ''));

  constructor() {
    this.shell.ensureLoaded();
    // Profile page saved a new name or photo: show it right away.
    effect(() => {
      this.shell.profileVersion();
      untracked(() => this.user.set(this.auth.getStoredUser()));
    });
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.url.set(e.urlAfterRedirects);
        this.user.set(this.auth.getStoredUser()); // picks up a renamed profile / new avatar
        this.menuOpen.set(false);
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleRail(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0');
    } catch {
      /* storage disabled: the choice just isn't remembered */
    }
  }

  protected signOut(): void {
    this.auth.clearSession();
    this.shell.reset();
    void this.router.navigate(['/login']);
  }
}

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
}

export function activeItemFor(url: string): SellerNavItem {
  const [path, fragment] = url.split('#');
  const clean = path.split('?')[0];
  if (clean.startsWith('/seller/products')) return 'products';
  if (clean.startsWith('/seller/media')) return 'media';
  if (clean.startsWith('/seller/orders')) return 'orders';
  if (clean.startsWith('/seller/profile')) return 'profile';
  if (fragment === 'products') return 'products';
  return 'dashboard';
}

/** Label of the current page for the breadcrumb. */
export function crumbFor(url: string): string {
  const clean = url.split(/[?#]/)[0];
  if (clean === '/seller/products/new') return 'New product';
  if (/^\/seller\/products\/[^/]+\/edit$/.test(clean)) return 'Edit product';
  if (clean.startsWith('/seller/media')) return 'Media library';
  if (clean.startsWith('/seller/orders')) return 'Orders';
  if (clean.startsWith('/seller/profile')) return 'Profile';
  return 'Dashboard';
}

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || 'S';
}
