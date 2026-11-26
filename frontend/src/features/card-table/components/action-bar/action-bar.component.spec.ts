import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionBarComponent } from './action-bar.component';

describe('ActionBarComponent', () => {
  let component: ActionBarComponent;
  let fixture: ComponentFixture<ActionBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ActionBarComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render the Information button and not Hint button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(1);

    expect(el.textContent).toContain('Info');
    expect(el.textContent).not.toContain('Hint');
    expect(el.textContent).not.toContain('New');
  });

  it('should render the text area badge next to the info button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.text-area-badge');
    expect(badge).not.toBeNull();

    const nav = el.querySelector('nav');
    const children = Array.from(nav?.children || []);
    expect(children.length).toBe(2);
    expect(children[0].tagName.toLowerCase()).toBe('button'); // Info button on left
    expect(children[1].classList.contains('text-area-badge')).toBe(true); // Badge in middle
  });

  it('should display text in the text area badge when badgeText input is provided', () => {
    fixture.componentRef.setInput('badgeText', 'Your Turn');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.text-area-badge');
    expect(badge?.textContent).toContain('Your Turn');
  });

  it('should not display the info message in the text area badge if the Information button is in Off state', () => {
    fixture.componentRef.setInput('badgeText', 'Your Turn');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.text-area-badge');
    expect(badge?.textContent).toContain('Your Turn');

    // Turn Information button off
    const infoBtn = fixture.nativeElement.querySelector('button[aria-label="Information"]') as HTMLButtonElement;
    infoBtn.click();
    fixture.detectChanges();

    expect(component.effectiveIsInfoOn()).toBe(false);
    expect(component.effectiveBadgeText()).toBe('');
    expect(badge?.textContent?.trim()).toBe('');

    // Turn Information button back on
    infoBtn.click();
    fixture.detectChanges();

    expect(component.effectiveIsInfoOn()).toBe(true);
    expect(component.effectiveBadgeText()).toBe('Your Turn');
    expect(badge?.textContent).toContain('Your Turn');
  });

  it('should not display text in the text area badge when isInfoActive is false', () => {
    fixture.componentRef.setInput('badgeText', 'Your Turn');
    fixture.componentRef.setInput('isInfoActive', false);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.text-area-badge');
    expect(component.effectiveIsInfoOn()).toBe(false);
    expect(component.effectiveBadgeText()).toBe('');
    expect(badge?.textContent?.trim()).toBe('');
  });

  it('should render the information button with icon and initial on state', () => {
    const el: HTMLElement = fixture.nativeElement;
    const infoBtn = el.querySelector('button[aria-label="Information"]') as HTMLButtonElement;
    expect(infoBtn).not.toBeNull();
    expect(infoBtn.querySelector('info-icon, svg')).not.toBeNull();
    expect(infoBtn.getAttribute('aria-pressed')).toBe('true');
    expect(infoBtn.classList.contains('is-on')).toBe(true);
    expect(infoBtn.classList.contains('is-off')).toBe(false);
  });

  it('should toggle on/off state when information button is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const infoBtn = el.querySelector('button[aria-label="Information"]') as HTMLButtonElement;

    // Initially on
    expect(component.effectiveIsInfoOn()).toBe(true);

    // Toggle off
    infoBtn.click();
    fixture.detectChanges();
    expect(component.effectiveIsInfoOn()).toBe(false);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('false');
    expect(infoBtn.classList.contains('is-off')).toBe(true);

    // Toggle on
    infoBtn.click();
    fixture.detectChanges();
    expect(component.effectiveIsInfoOn()).toBe(true);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('true');
    expect(infoBtn.classList.contains('is-on')).toBe(true);
  });

  it('should respect input on/off state', () => {
    fixture.componentRef.setInput('isInfoOn', false);
    fixture.detectChanges();

    const infoBtn = fixture.nativeElement.querySelector('button[aria-label="Information"]') as HTMLButtonElement;
    expect(component.effectiveIsInfoOn()).toBe(false);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('false');
    expect(infoBtn.classList.contains('is-off')).toBe(true);
  });
});
