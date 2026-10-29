import { Component, Input, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-banner.component.html'
})
export class AdBannerComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /** Height of the ad container in pixels (clamped between 50px and 60px) */
  @Input() heightPx: number = 54;

  /** AdSense or AdMob ad unit ID */
  @Input() adSlotId: string = '';

  /** AdSense client ID (e.g. ca-pub-xxxxxxxxxxxxxxxx) */
  @Input() adClient: string = '';

  /** When true, renders a clean mockup placeholder instead of trying to load external ad scripts */
  @Input() isTestMode: boolean = true;

  /** Label displayed above the ad banner */
  @Input() label: string = 'ADVERTISEMENT';

  get clampedHeight(): number {
    return Math.max(50, Math.min(60, this.heightPx || 54));
  }

  ngAfterViewInit(): void {
    if (!this.isTestMode && this.adSlotId && isPlatformBrowser(this.platformId)) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('AdBannerComponent: Failed to initialize Google ad slot', err);
      }
    }
  }
}
