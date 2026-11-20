import { TestBed } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('shows the value as money when the format is currency', async () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Revenue');
    fixture.componentRef.setInput('format', 'currency');
    fixture.componentRef.setInput('value', 1234);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.sr-only').textContent).toContain('$1,234');
  });

  it('shows the trend with a plus sign', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Revenue');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('trend', 25);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sc-trend').getAttribute('aria-label')).toContain('+25%');
  });

  it('shows the badge text', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Revenue');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('badge', 'Last 14 days');

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sc-badge').textContent).toContain('Last 14 days');
  });
});
