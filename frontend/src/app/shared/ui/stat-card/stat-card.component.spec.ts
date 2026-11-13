import { TestBed } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('announces the final value and trend, and draws a sparkline', async () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Revenue');
    fixture.componentRef.setInput('format', 'currency');
    fixture.componentRef.setInput('value', 1234);
    fixture.componentRef.setInput('trend', 25);
    fixture.componentRef.setInput('series', [1, 3, 2, 5]);
    fixture.componentRef.setInput('badge', 'Last 14 days');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sr-only')!.textContent).toContain('$1,234');
    expect(el.querySelector('.sc-trend')!.getAttribute('aria-label')).toContain('+25%');
    expect(el.querySelector('.sc-spark-line')!.getAttribute('d')).toMatch(/^M0/);
    expect(el.querySelector('.sc-badge')!.textContent).toContain('Last 14 days');
  });
});
