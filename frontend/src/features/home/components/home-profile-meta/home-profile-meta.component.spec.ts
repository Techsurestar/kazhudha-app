import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeProfileMetaComponent } from './home-profile-meta.component';
import { Component, signal } from '@angular/core';

describe('HomeProfileMetaComponent', () => {
  let component: HomeProfileMetaComponent;
  let fixture: ComponentFixture<HomeProfileMetaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeProfileMetaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeProfileMetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the HomeProfileMetaComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render default profile info matching guest mode', () => {
    const el = fixture.nativeElement as HTMLElement;

    const nameEl = el.querySelector('.profile-player-name');
    expect(nameEl?.textContent?.trim()).toBe('Guest Player');

    const badgeEl = el.querySelector('.mode-badge-pill');
    expect(badgeEl?.textContent?.trim()).toContain('Guest Mode');

    const subtitleEl = el.querySelector('.profile-subtitle');
    expect(subtitleEl?.textContent?.trim()).toBe("You're playing as a guest");

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe('/avatar/guest_avatar.webp');
    expect(imgEl.getAttribute('alt')).toBe('Guest Player Avatar');
  });

  it('should render custom player info when inputs are provided', () => {
    fixture.componentRef.setInput('playerName', 'Ace Donkey');
    fixture.componentRef.setInput('badgeText', 'VIP Member');
    fixture.componentRef.setInput('subtitle', 'Ready for high stakes');
    fixture.componentRef.setInput('avatarSrc', '/avatar/custom.webp');
    fixture.componentRef.setInput('avatarAlt', 'Ace Donkey Avatar');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-player-name')?.textContent?.trim()).toBe('Ace Donkey');
    expect(el.querySelector('.mode-badge-pill')?.textContent?.trim()).toContain('VIP Member');
    expect(el.querySelector('.profile-subtitle')?.textContent?.trim()).toBe('Ready for high stakes');

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl.getAttribute('src')).toBe('/avatar/custom.webp');
    expect(imgEl.getAttribute('alt')).toBe('Ace Donkey Avatar');
  });

  it('should accept alternate input aliases name, mode, statusText, and avatarUrl', () => {
    fixture.componentRef.setInput('name', 'Lucky Player');
    fixture.componentRef.setInput('mode', 'Tournament Mode');
    fixture.componentRef.setInput('statusText', 'Competing in Finals');
    fixture.componentRef.setInput('avatarUrl', '/avatar/tournament.webp');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-player-name')?.textContent?.trim()).toBe('Lucky Player');
    expect(el.querySelector('.mode-badge-pill')?.textContent?.trim()).toContain('Tournament Mode');
    expect(el.querySelector('.profile-subtitle')?.textContent?.trim()).toBe('Competing in Finals');

    const imgEl = el.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    expect(imgEl.getAttribute('src')).toBe('/avatar/tournament.webp');
  });

  it('should emit profileClick when the card is clicked', () => {
    let clicked = false;
    component.profileClick.subscribe(() => {
      clicked = true;
    });

    const card = fixture.nativeElement.querySelector('.home-profile-meta') as HTMLElement;
    card.click();
    expect(clicked).toBe(true);
  });

  it('should emit avatarClick and profileClick when avatar is clicked', () => {
    let avatarClicked = false;
    let profileClicked = false;

    component.avatarClick.subscribe(() => {
      avatarClicked = true;
    });
    component.profileClick.subscribe(() => {
      profileClicked = true;
    });

    const avatarRing = fixture.nativeElement.querySelector('.avatar-gold-ring') as HTMLElement;
    avatarRing.click();
    expect(avatarClicked).toBe(true);
    expect(profileClicked).toBe(true);
  });

  it('should emit badgeClick when the mode badge pill is clicked', () => {
    let badgeClicked = false;
    component.badgeClick.subscribe(() => {
      badgeClicked = true;
    });

    const badge = fixture.nativeElement.querySelector('.mode-badge-pill') as HTMLElement;
    badge.click();
    expect(badgeClicked).toBe(true);
  });

  it('should fallback to assets/app-logo.png if avatar image fails to load', () => {
    const imgEl = fixture.nativeElement.querySelector('.avatar-gold-ring img') as HTMLImageElement;
    const errorEvent = new Event('error');
    imgEl.dispatchEvent(errorEvent);

    expect(imgEl.src).toContain('assets/app-logo.png');
  });
});
