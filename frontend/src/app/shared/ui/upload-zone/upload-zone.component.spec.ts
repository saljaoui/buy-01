import { TestBed } from '@angular/core/testing';

import { UploadZoneComponent, rejectReason } from './upload-zone.component';

describe('UploadZoneComponent', () => {
  it('rejectReason accepts a valid image', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' });

    expect(rejectReason(png, ['image/png'], 100)).toBeNull();
  });

  it('rejectReason refuses a wrong file type', () => {
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' });

    expect(rejectReason(gif, ['image/png'], 100)).toContain('only JPG');
  });

  it('rejectReason refuses a file that is too big', () => {
    const bigPng = new File([new Uint8Array(200)], 'a.png', { type: 'image/png' });

    expect(rejectReason(bigPng, ['image/png'], 100)).toContain('over the');
  });

  it('sends only valid files and lists the refused ones', () => {
    const fixture = TestBed.createComponent(UploadZoneComponent);
    fixture.detectChanges();
    const sent: File[][] = [];
    fixture.componentInstance.files.subscribe((files) => sent.push(files));

    fixture.componentInstance.accept([new File(['x'], 'ok.png', { type: 'image/png' }), new File(['x'], 'notes.txt', { type: 'text/plain' })]);
    fixture.detectChanges();

    expect(sent[0].map((f) => f.name)).toEqual(['ok.png']);
    expect(fixture.nativeElement.querySelector('[data-testid=upload-errors]').textContent).toContain('notes.txt');
  });

  it('shows "Photo limit reached" when no more files fit', () => {
    const fixture = TestBed.createComponent(UploadZoneComponent);
    fixture.componentRef.setInput('maxFiles', 0);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Photo limit reached');
  });
});
