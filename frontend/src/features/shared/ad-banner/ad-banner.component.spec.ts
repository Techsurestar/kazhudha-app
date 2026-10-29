import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdBannerComponent } from './ad-banner.component';

describe('AdBannerComponent', () => {
  let component: AdBannerComponent;
  let fixture: ComponentFixture<AdBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdBannerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create the AdBannerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should clamp height between 50px and 60px', () => {
    component.heightPx = 40; // Too small
    expect(component.clampedHeight).toBe(50);

    component.heightPx = 75; // Too large
    expect(component.clampedHeight).toBe(60);

    component.heightPx = 56; // In range
    expect(component.clampedHeight).toBe(56);
  });

  it('should render test mode placeholder by default', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Mobile Banner Slot (320×50)');
    expect(el.textContent).toContain('ADVERTISEMENT');
    expect(el.querySelector('ins.adsbygoogle')).toBeNull();
  });

  it('should render custom label', () => {
    component.label = 'SPONSORED';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('SPONSORED');
  });

  it('should render live adsbygoogle container when not in test mode and adSlotId is provided', () => {
    component.isTestMode = false;
    component.adSlotId = '1234567890';
    component.adClient = 'ca-pub-9999999999999999';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const ins = el.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute('data-ad-slot')).toBe('1234567890');
    expect(ins?.getAttribute('data-ad-client')).toBe('ca-pub-9999999999999999');
  });
});
