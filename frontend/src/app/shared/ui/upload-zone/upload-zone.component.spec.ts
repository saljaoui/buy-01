import { TestBed } from '@angular/core/testing';

import { UploadZoneComponent, rejectReason } from './upload-zone.component';

const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

describe('UploadZoneComponent', () => {
  it('rejectReason checks type and size', () => {
    expect(rejectReason(file('a.png', 'image/png', 10), ['image/png'], 100)).toBeNull();
    expect(rejectReason(file('a.gif', 'image/gif', 10), ['image/png'], 100)).toContain('only JPG');
    expect(rejectReason(file('a.png', 'image/png', 200), ['image/png'], 100)).toContain('over the');
  });

  it('emits only valid files, within the room left, and lists what was rejected', () => {
    const fixture = TestBed.createComponent(UploadZoneComponent);
    fixture.componentRef.setInput('maxFiles', 1);
    fixture.detectChanges();
    const emitted: File[][] = [];
    fixture.componentInstance.files.subscribe((f) => emitted.push(f));

    fixture.componentInstance.accept([
      file('ok.png', 'image/png', 10),
      file('second.png', 'image/png', 10),
      file('notes.txt', 'text/plain', 10),
    ]);
    fixture.detectChanges();

    expect(emitted).toEqual([[expect.objectContaining({ name: 'ok.png' })]]);
    const errors = fixture.nativeElement.querySelector('[data-testid=upload-errors]').textContent;
    expect(errors).toContain('notes.txt');
    expect(errors).toContain('1 skipped');
  });

  it('shows the limit state when no more files fit', () => {
    const fixture = TestBed.createComponent(UploadZoneComponent);
    fixture.componentRef.setInput('maxFiles', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Photo limit reached');
  });
});
