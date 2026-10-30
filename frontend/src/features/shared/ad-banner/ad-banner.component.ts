import { Component, input, computed, afterNextRender, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Component({
  selector: 'app-ad-banner',
  templateUrl: './ad-banner.component.html'
})
export class AdBannerComponent {
  private platformId = inject(PLATFORM_ID);

  /** Height of the ad container in pixels (clamped between 50px and 60px) */
  readonly heightPx = input<number>(54);

  /** AdSense or AdMob ad unit ID */
  readonly adSlotId = input<string>('');

  /** AdSense client ID (e.g. ca-pub-xxxxxxxxxxxxxxxx) */
  readonly adClient = input<string>('');

  /** When true, renders a clean mockup placeholder instead of trying to load external ad scripts */
  readonly isTestMode = input<boolean>(true);

  /** Label displayed above the ad banner */
  readonly label = input<string>('ADVERTISEMENT');

  /** Clamped container height strictly adhering to the 50px–60px allocation */
  readonly clampedHeight = computed(() => Math.max(50, Math.min(60, this.heightPx() || 54)));

  constructor() {
    afterNextRender(() => {
      if (!this.isTestMode() && this.adSlotId() && isPlatformBrowser(this.platformId)) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          console.warn('AdBannerComponent: Failed to initialize Google ad slot', err);
        }
      }
    });
  }
}
