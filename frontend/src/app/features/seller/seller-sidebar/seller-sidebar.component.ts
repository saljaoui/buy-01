import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppIconName, IconComponent } from '../../../shared/icon/icon.component';

export type SellerNavItem = 'dashboard' | 'products' | 'media' | 'orders' | 'profile' | 'product-form';

interface NavLink {
  id: SellerNavItem;
  label: string;
  icon: AppIconName;
  link: string;
  fragment?: string;
  /** Count shown as a badge; hidden when 0. */
  count?: number;
  countLabel?: string;
}

@Component({
  selector: 'app-seller-sidebar',
  imports: [RouterLink, IconComponent],
  templateUrl: './seller-sidebar.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class SellerSidebarComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly activeItem = input<SellerNavItem>('dashboard');
  readonly collapsed = input(false);
  readonly productCount = input(0);
  readonly mediaCount = input(0);
  readonly ordersNeedingAction = input(0);
  readonly name = input('Seller');
  readonly email = input('');
  readonly avatar = input<string | null>(null);
  readonly initials = input('S');

  readonly toggleCollapse = output<void>();
  readonly signOut = output<void>();

  protected readonly menuOpen = signal(false);

  protected readonly groups = computed<{ label: string; links: NavLink[] }[]>(() => [
    {
      label: 'Overview',
      links: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard', link: '/seller' }],
    },
    {
      label: 'Catalog',
      links: [
        {
          id: 'products',
          label: 'Products',
          icon: 'shopping-bag',
          link: '/seller',
          fragment: 'products',
          count: this.productCount(),
          countLabel: 'products',
        },
        {
          id: 'media',
          label: 'Media library',
          icon: 'media',
          link: '/seller/media',
          count: this.mediaCount(),
          countLabel: 'photos',
        },
      ],
    },
    {
      label: 'Sales',
      links: [
        {
          id: 'orders',
          label: 'Orders',
          icon: 'package',
          link: '/seller/orders',
          count: this.ordersNeedingAction(),
          countLabel: 'orders need action',
        },
      ],
    },
    {
      label: 'Account',
      links: [{ id: 'profile', label: 'Profile', icon: 'profile', link: '/seller/profile' }],
    },
  ]);

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    const menu = this.host.nativeElement.querySelector('.seller-account');
    if (menu && !menu.contains(event.target as Node)) this.menuOpen.set(false);
  }

  protected doSignOut(): void {
    this.menuOpen.set(false);
    this.signOut.emit();
  }
}
