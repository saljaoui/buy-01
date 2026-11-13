import { Location } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, map, of, startWith, switchMap } from 'rxjs';

import { ApiClient } from '../../../../core/api/api-client.service';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { controlError, notBlank, showError } from '../../../../shared/forms/form-errors';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { ProductCardComponent } from '../../../../shared/products/product-card/product-card.component';
import { stockBadge } from '../../../../shared/products/stock';
import { MediaOrderService, PhotoSource, planOrder } from '../../../../shared/services/media-order.service';
import { Media, MediaService } from '../../../../shared/services/media-service';
import { ProductRequest, ProductResponse, ProductService } from '../../../../shared/services/product-service';
import { ToastService } from '../../../../shared/services/toast-service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { UploadZoneComponent } from '../../../../shared/ui/upload-zone/upload-zone.component';
import { AuthService } from '../../../auth/auth.service';
import { SellerShellService } from '../../seller-layout/seller-shell.service';

export const MAX_PHOTOS = 3;
const DESCRIPTION_MAX = 2000;

/** A photo row in the form: stored already, or picked and waiting for Save. */
export interface PhotoItem {
  key: string;
  source: PhotoSource;
  preview: string;
  /** Upload progress during Save (0..100), null when not uploading. */
  progress: number | null;
}

let photoKey = 0;

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, PageHeaderComponent, UploadZoneComponent, ProductCardComponent],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ProductFormComponent implements OnDestroy, HasUnsavedChanges {
  private readonly productService = inject(ProductService);
  private readonly mediaService = inject(MediaService);
  private readonly mediaOrder = inject(MediaOrderService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly shell = inject(SellerShellService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly user = inject(AuthService).getStoredUser();

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  readonly mode = signal<'create' | 'edit'>('create');
  readonly productId = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly saveStep = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);

  /** Photos as the seller wants them; the first one is the cover. */
  readonly photos = signal<PhotoItem[]>([]);
  /** Photos stored on the server when the page loaded (or after the last save). */
  private storedMedia: Media[] = [];
  private saved = false;
  protected readonly dragKey = signal<string | null>(null);

  // Same rules as the backend ProductRequest (@NotBlank, @Positive, @Min(0)).
  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(100)]),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      notBlank,
      Validators.minLength(10),
      Validators.maxLength(DESCRIPTION_MAX),
    ]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    quantity: this.fb.control<number | null>(10, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]),
  });

  /** Live form value, so the preview and checklist update as the seller types. */
  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue()), map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly showError = showError;
  private readonly labels: Record<string, string> = {
    name: 'Title',
    description: 'Description',
    price: 'Price',
    quantity: 'Stock',
  };

  readonly checklist = computed(() => {
    const v = this.value();
    return [
      { id: 'name', label: 'A clear title', done: (v.name ?? '').trim().length >= 2 },
      { id: 'description', label: 'A description (10+ characters)', done: (v.description ?? '').trim().length >= 10 },
      { id: 'price', label: 'A price above $0', done: Number(v.price) > 0 },
      { id: 'quantity', label: 'Stock set', done: v.quantity !== null && `${v.quantity}` !== '' && Number(v.quantity) >= 0 },
      { id: 'photos', label: 'At least one photo', done: this.photos().length > 0 },
    ];
  });
  readonly checklistDone = computed(() => this.checklist().filter((c) => c.done).length);

  /** What buyers will see in the catalog. */
  readonly preview = computed<ProductResponse>(() => {
    const v = this.value();
    return {
      id: this.productId() || 'preview',
      name: (v.name ?? '').trim() || 'Your product title',
      description: (v.description ?? '').trim() || 'Your description appears here, two lines in the catalog.',
      price: Number(v.price) > 0 ? Number(v.price) : 0,
      quantity: Number(v.quantity ?? 0),
      owner: false,
    };
  });
  readonly previewImage = computed(() => this.photos()[0]?.preview ?? null);
  readonly previewBadge = computed(() => stockBadge(Number(this.value().quantity ?? 0)));
  readonly descriptionLength = computed(() => (this.value().description ?? '').length);

  readonly photosChanged = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.mode.set('edit');
      this.productId.set(id);
      this.load(id);
    });
  }

  ngOnDestroy(): void {
    for (const p of this.photos()) if (p.source.kind === 'new') URL.revokeObjectURL(p.preview);
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form.dirty || this.photosChanged());
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  err(name: string): string {
    if (name === 'quantity' && this.form.controls.quantity.hasError('pattern')) return 'Stock must be a whole number.';
    if (name === 'price' && this.form.controls.price.hasError('min')) return 'Price must be more than $0.';
    return controlError(this.form.get(name), this.labels[name] ?? name);
  }

  // ---------- Loading (edit) ----------

  private load(id: string): void {
    this.isLoading.set(true);
    this.productService
      .getProduct(id)
      .pipe(
        switchMap((product) => {
          if (!product.owner) throw new Error('not-owner');
          return this.mediaService.getMediaByProduct(id).pipe(map((media) => ({ product, media })));
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ product, media }) => {
          this.form.reset({
            name: product.name,
            description: product.description,
            price: product.price,
            quantity: product.quantity,
          });
          this.storedMedia = media;
          this.photos.set(media.map((m) => this.existingItem(m)));
          this.photosChanged.set(false);
        },
        error: (err) => {
          if (err instanceof Error && err.message === 'not-owner') {
            this.toast.error('You can only edit products you own.');
          } else {
            this.toast.error(this.api.getErrorMessage(err, 'Unable to load this product.'));
          }
          this.saved = true; // nothing to lose
          void this.router.navigate(['/seller']);
        },
      });
  }

  private existingItem(media: Media): PhotoItem {
    return { key: `p${photoKey++}`, source: { kind: 'existing', media }, preview: this.mediaService.imageUrl(media), progress: null };
  }

  // ---------- Stock stepper ----------

  protected stepStock(delta: number): void {
    const control = this.form.controls.quantity;
    const next = Math.max(0, Math.floor(Number(control.value ?? 0)) + delta);
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
  }

  // ---------- Photos ----------

  protected addFiles(files: File[]): void {
    const room = MAX_PHOTOS - this.photos().length;
    const items = files.slice(0, room).map<PhotoItem>((file) => ({
      key: `p${photoKey++}`,
      source: { kind: 'new', file },
      preview: URL.createObjectURL(file),
      progress: null,
    }));
    if (!items.length) return;
    this.photos.update((list) => [...list, ...items]);
    this.photosChanged.set(true);
  }

  protected removePhoto(item: PhotoItem): void {
    if (item.source.kind === 'new') URL.revokeObjectURL(item.preview);
    this.photos.update((list) => list.filter((p) => p.key !== item.key));
    this.photosChanged.set(true);
  }

  protected movePhoto(index: number, delta: number): void {
    const list = [...this.photos()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.photos.set(list);
    this.photosChanged.set(true);
  }

  protected makeCover(index: number): void {
    if (index === 0) return;
    const list = [...this.photos()];
    const [item] = list.splice(index, 1);
    this.photos.set([item, ...list]);
    this.photosChanged.set(true);
  }

  // Drag to reorder (mouse); the arrow buttons do the same for keyboard and touch.
  protected onDragStart(key: string, event: DragEvent): void {
    this.dragKey.set(key);
    event.dataTransfer?.setData('text/plain', key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOverPhoto(event: DragEvent): void {
    if (this.dragKey()) event.preventDefault();
  }

  protected onDropPhoto(targetKey: string, event: DragEvent): void {
    event.preventDefault();
    const from = this.photos().findIndex((p) => p.key === this.dragKey());
    const to = this.photos().findIndex((p) => p.key === targetKey);
    this.dragKey.set(null);
    if (from < 0 || to < 0 || from === to) return;
    const list = [...this.photos()];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    this.photos.set(list);
    this.photosChanged.set(true);
  }

  // ---------- Save ----------

  protected cancel(): void {
    void this.router.navigate(this.mode() === 'edit' ? ['/products', this.productId()] : ['/seller']);
  }

  save(): void {
    if (this.isSaving()) return;
    this.form.markAllAsTouched();
    if (this.user?.role !== 'SELLER') {
      this.toast.error('Only seller accounts can save products.');
      return;
    }
    if (this.form.invalid) {
      this.toast.error('Please fix the highlighted fields.');
      queueMicrotask(() => document.querySelector<HTMLElement>('.pf-form .is-invalid')?.focus());
      return;
    }

    this.isSaving.set(true);
    this.serverError.set(null);
    const creating = this.mode() === 'create';
    this.saveStep.set(creating ? 'Creating product…' : 'Saving details…');

    const product$: Observable<ProductResponse | void> = creating
      ? this.productService.publishProduct(this.payload())
      : this.productService.updateProduct(this.productId(), this.payload());

    product$
      .pipe(
        switchMap((result) => {
          if (creating && result) {
            // From here on the product exists: a failed upload can be retried as an edit.
            this.mode.set('edit');
            this.productId.set(result.id);
            this.storedMedia = [];
          }
          return this.savePhotos(this.productId());
        }),
        finalize(() => {
          this.isSaving.set(false);
          this.saveStep.set(null);
          this.photos.update((list) => list.map((p) => ({ ...p, progress: null })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved = true;
          this.shell.refresh();
          this.toast.success(creating ? 'Product published.' : 'Changes saved.', 5000, {
            label: 'View product',
            link: `/products/${this.productId()}`,
          });
          void this.router.navigate(['/products', this.productId()]);
        },
        error: (err) => {
          const message = this.api.getErrorMessage(err, 'The product could not be saved.');
          this.serverError.set(
            creating && this.mode() === 'edit' ? `The product was created, but a photo failed: ${message} Press Save to try again.` : message,
          );
          this.toast.error(message);
          if (creating && this.mode() === 'edit') {
            // Point the URL at the edit page without leaving this page, so pending photos stay.
            this.location.replaceState(`/seller/products/${this.productId()}/edit`);
          }
        },
      });
  }

  private savePhotos(productId: string): Observable<unknown> {
    if (!this.photosChanged()) return of(null);
    const wanted = this.photos().map((p) => p.source);
    // Rows after the longest already-ordered prefix are (re-)uploaded; show their progress.
    const { keep } = planOrder(this.storedMedia, wanted);
    this.saveStep.set('Uploading photos…');
    return this.mediaOrder
      .apply(productId, this.storedMedia, wanted, (i, percent) =>
        this.photos.update((list) => list.map((p, idx) => (idx === keep + i ? { ...p, progress: percent } : p))),
      )
      .pipe(
        map((media) => {
          for (const p of this.photos()) if (p.source.kind === 'new') URL.revokeObjectURL(p.preview);
          this.storedMedia = media;
          this.photos.set(media.map((m) => this.existingItem(m)));
          this.photosChanged.set(false);
          return media;
        }),
      );
  }

  private payload(): ProductRequest {
    const { name, description, price, quantity } = this.form.getRawValue();
    return {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      quantity: Number(quantity),
    };
  }
}
