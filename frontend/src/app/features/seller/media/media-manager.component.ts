import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, concat, finalize, forkJoin, map, of, switchMap, tap, toArray } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { MediaOrderService } from '../../../shared/services/media-order.service';
import { Media, MediaService } from '../../../shared/services/media-service';
import { ProductResponse, ProductService } from '../../../shared/services/product-service';
import { ToastService } from '../../../shared/services/toast-service';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { UploadZoneComponent, formatBytes } from '../../../shared/ui/upload-zone/upload-zone.component';
import { AuthService } from '../../auth/auth.service';
import { SellerShellService } from '../seller-layout/seller-shell.service';
import { MAX_PHOTOS } from '../products/product-form/product-form.component';

type SortMode = 'newest' | 'oldest' | 'name' | 'most';

export interface MediaGroup {
  product: ProductResponse;
  media: Media[];
}

interface PendingUpload {
  file: File;
  preview: string;
  progress: number | null;
  error: string | null;
}

@Component({
  selector: 'app-media-manager',
  imports: [FormsModule, RouterLink, IconComponent, PageHeaderComponent, EmptyStateComponent, UploadZoneComponent],
  templateUrl: './media-manager.component.html',
  styleUrl: './media-manager.component.scss',
})
export class MediaManagerComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);
  readonly mediaService = inject(MediaService);
  private readonly mediaOrder = inject(MediaOrderService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly api = inject(ApiClient);
  private readonly shell = inject(SellerShellService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lightboxRef = viewChild<ElementRef<HTMLDialogElement>>('lightbox');

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly formatBytes = formatBytes;

  readonly products = signal<ProductResponse[]>([]);
  readonly mediaByProduct = signal<Record<string, Media[]>>({});
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Toolbar
  readonly search = signal('');
  readonly productFilter = signal('all');
  readonly sort = signal<SortMode>('newest');

  // Upload panel
  readonly uploadOpen = signal(false);
  readonly uploadProductId = signal('');
  readonly pending = signal<PendingUpload[]>([]);
  readonly isUploading = signal(false);

  // Per-photo actions
  readonly busyMediaId = signal<string | null>(null);
  readonly busyProductId = signal<string | null>(null);

  // Lightbox
  readonly lightboxIndex = signal<number | null>(null);

  readonly totalMedia = computed(() => Object.values(this.mediaByProduct()).reduce((n, list) => n + list.length, 0));
  readonly productsWithMedia = computed(() => this.products().filter((p) => (this.mediaByProduct()[p.id] ?? []).length > 0).length);

  readonly groups = computed<MediaGroup[]>(() => {
    const q = this.search().trim().toLowerCase();
    const filter = this.productFilter();
    let list = this.products()
      .map((product) => ({ product, media: this.mediaByProduct()[product.id] ?? [] }))
      .filter((g) => g.media.length > 0)
      .filter((g) => filter === 'all' || g.product.id === filter)
      .filter((g) => !q || g.product.name.toLowerCase().includes(q));
    switch (this.sort()) {
      case 'oldest':
        list = [...list].reverse();
        break;
      case 'name':
        list = [...list].sort((a, b) => a.product.name.localeCompare(b.product.name));
        break;
      case 'most':
        list = [...list].sort((a, b) => b.media.length - a.media.length);
        break;
    }
    return list;
  });

  /** Every visible photo in order, for the lightbox's previous/next. */
  readonly visibleMedia = computed(() => this.groups().flatMap((g) => g.media.map((m, i) => ({ media: m, product: g.product, index: i, total: g.media.length }))));
  readonly lightboxItem = computed(() => {
    const i = this.lightboxIndex();
    return i === null ? null : (this.visibleMedia()[i] ?? null);
  });

  readonly uploadProduct = computed(() => this.products().find((p) => p.id === this.uploadProductId()) ?? null);
  readonly uploadRoom = computed(() => {
    const used = (this.mediaByProduct()[this.uploadProductId()] ?? []).length;
    return Math.max(0, MAX_PHOTOS - used - this.pending().length);
  });
  readonly productsWithRoom = computed(() =>
    this.products().map((p) => ({ product: p, used: (this.mediaByProduct()[p.id] ?? []).length })),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const user = this.auth.getStoredUser();
    if (!user) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.productService
      .getProductsOwnedBy(user.id)
      .pipe(
        tap((products) => this.products.set(products)),
        switchMap((products) => this.loadMedia(products)),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (byProduct) => {
          this.mediaByProduct.set(byProduct);
          this.syncShell();
          if (!this.uploadProductId() && this.products().length) {
            const firstWithRoom = this.productsWithRoom().find((r) => r.used < MAX_PHOTOS) ?? this.productsWithRoom()[0];
            this.uploadProductId.set(firstWithRoom.product.id);
          }
        },
        error: (err) => this.errorMessage.set(this.api.getErrorMessage(err, 'Your photos could not be loaded.')),
      });
  }

  private loadMedia(products: ProductResponse[]): Observable<Record<string, Media[]>> {
    if (products.length === 0) return of({});
    return forkJoin(
      products.map((p) => this.mediaService.getMediaByProduct(p.id).pipe(map((list) => [p.id, list] as const))),
    ).pipe(map((entries) => Object.fromEntries(entries)));
  }

  private syncShell(): void {
    const counts = Object.fromEntries(Object.entries(this.mediaByProduct()).map(([id, list]) => [id, list.length]));
    this.shell.setProducts(this.products(), counts);
  }

  url(media: Media): string {
    return this.mediaService.imageUrl(media);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.productFilter.set('all');
  }

  // ---------- Upload ----------

  protected openUpload(productId?: string): void {
    if (productId) this.uploadProductId.set(productId);
    this.uploadOpen.set(true);
    queueMicrotask(() => document.getElementById('upload-panel')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }));
  }

  protected closeUpload(): void {
    if (this.isUploading()) return;
    this.clearPending();
    this.uploadOpen.set(false);
  }

  protected selectUploadProduct(id: string): void {
    this.uploadProductId.set(id);
    // Keep only what still fits for the newly chosen product.
    const used = (this.mediaByProduct()[id] ?? []).length;
    const keep = Math.max(0, MAX_PHOTOS - used);
    const list = this.pending();
    list.slice(keep).forEach((p) => URL.revokeObjectURL(p.preview));
    this.pending.set(list.slice(0, keep));
  }

  protected addPending(files: File[]): void {
    const items = files.slice(0, this.uploadRoom()).map<PendingUpload>((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: null,
      error: null,
    }));
    this.pending.update((list) => [...list, ...items]);
  }

  protected removePending(item: PendingUpload): void {
    URL.revokeObjectURL(item.preview);
    this.pending.update((list) => list.filter((p) => p !== item));
  }

  private clearPending(): void {
    this.pending().forEach((p) => URL.revokeObjectURL(p.preview));
    this.pending.set([]);
  }

  protected upload(): void {
    const productId = this.uploadProductId();
    const items = this.pending().filter((p) => p.progress !== 100);
    if (!productId || items.length === 0 || this.isUploading()) return;
    this.isUploading.set(true);

    const steps = items.map((item) =>
      this.mediaService.uploadWithProgress(productId, item.file).pipe(
        tap((e) => this.patchPending(item, { progress: e.type === 'done' ? 100 : e.percent, error: null })),
        catchError((err) => {
          this.patchPending(item, { progress: null, error: this.api.getErrorMessage(err, 'Upload failed.') });
          return of(null);
        }),
      ),
    );

    concat(...steps)
      .pipe(
        toArray(),
        finalize(() => this.isUploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const failed = this.pending().filter((p) => p.error).length;
        const done = items.length - failed;
        if (done > 0) {
          this.toast.success(`${done} ${done === 1 ? 'photo' : 'photos'} added to ${this.uploadProduct()?.name ?? 'your product'}.`);
        }
        if (failed > 0) {
          this.toast.error(`${failed} ${failed === 1 ? 'photo' : 'photos'} could not be uploaded.`);
          // Keep the failed ones so they can be retried.
          const keep = this.pending().filter((p) => p.error);
          this.pending().filter((p) => !p.error).forEach((p) => URL.revokeObjectURL(p.preview));
          this.pending.set(keep);
        } else {
          this.clearPending();
          this.uploadOpen.set(false);
        }
        this.load();
      });
  }

  private patchPending(item: PendingUpload, patch: Partial<PendingUpload>): void {
    this.pending.update((list) => list.map((p) => (p === item ? { ...p, ...patch } : p)));
  }

  // ---------- Photo actions ----------

  protected setCover(group: MediaGroup, media: Media): void {
    if (this.busyMediaId() || group.media[0]?.id === media.id) return;
    this.busyMediaId.set(media.id);
    // Cover first, then the photos that came after it, then the ones before it: only the
    // photos in front of the new cover need to move (be re-uploaded).
    const at = group.media.findIndex((m) => m.id === media.id);
    const wanted = [...group.media.slice(at), ...group.media.slice(0, at)].map((m) => ({ kind: 'existing' as const, media: m }));
    this.mediaOrder
      .apply(group.product.id, group.media, wanted)
      .pipe(finalize(() => this.busyMediaId.set(null)))
      .subscribe({
        next: (list) => {
          this.mediaByProduct.update((all) => ({ ...all, [group.product.id]: list }));
          this.toast.success(`New cover for ${group.product.name}.`);
        },
        error: (err) => {
          this.toast.error(this.api.getErrorMessage(err, 'The cover could not be changed.'));
          this.load();
        },
      });
  }

  protected async deleteMedia(group: MediaGroup, media: Media): Promise<void> {
    if (this.busyMediaId()) return;
    const isCover = group.media[0]?.id === media.id;
    const ok = await this.confirm.ask({
      title: 'Delete this photo?',
      message: `It is removed from ${group.product.name}${isCover && group.media.length > 1 ? ', and the next photo becomes the cover' : ''}. This cannot be undone.`,
      confirmLabel: 'Delete photo',
      tone: 'danger',
    });
    if (!ok) return;
    this.busyMediaId.set(media.id);
    this.mediaService
      .deleteMedia(media.id)
      .pipe(finalize(() => this.busyMediaId.set(null)))
      .subscribe({
        next: () => {
          this.mediaByProduct.update((all) => ({ ...all, [group.product.id]: (all[group.product.id] ?? []).filter((m) => m.id !== media.id) }));
          this.syncShell();
          this.closeLightbox();
          this.toast.success('Photo deleted.');
        },
        error: (err) => this.toast.error(this.api.getErrorMessage(err, 'The photo could not be deleted.')),
      });
  }

  protected async deleteAll(group: MediaGroup): Promise<void> {
    if (this.busyProductId()) return;
    const ok = await this.confirm.ask({
      title: `Delete all ${group.media.length} photos?`,
      message: `${group.product.name} will have no photos left. Listings without photos sell far less.`,
      confirmLabel: 'Delete all photos',
      tone: 'danger',
    });
    if (!ok) return;
    this.busyProductId.set(group.product.id);
    forkJoin(group.media.map((m) => this.mediaService.deleteMedia(m.id)))
      .pipe(finalize(() => this.busyProductId.set(null)))
      .subscribe({
        next: () => {
          this.mediaByProduct.update((all) => ({ ...all, [group.product.id]: [] }));
          this.syncShell();
          this.toast.success(`All photos of ${group.product.name} were deleted.`);
        },
        error: (err) => {
          this.toast.error(this.api.getErrorMessage(err, 'Some photos could not be deleted.'));
          this.load();
        },
      });
  }

  // ---------- Lightbox ----------

  protected openLightbox(media: Media): void {
    const index = this.visibleMedia().findIndex((v) => v.media.id === media.id);
    if (index < 0) return;
    this.lightboxIndex.set(index);
    const dialog = this.lightboxRef()?.nativeElement;
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
  }

  protected closeLightbox(): void {
    const dialog = this.lightboxRef()?.nativeElement;
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    this.lightboxIndex.set(null);
  }

  protected step(delta: number): void {
    const total = this.visibleMedia().length;
    const i = this.lightboxIndex();
    if (i === null || total < 2) return;
    this.lightboxIndex.set((i + delta + total) % total);
  }

  protected onLightboxKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }

  protected onLightboxClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeLightbox();
  }
}
