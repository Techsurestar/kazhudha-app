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

  it('should render the Hint button and Information button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(2);

    expect(el.textContent).toContain('Hint');
    expect(el.textContent).toContain('Info');
    expect(el.textContent).not.toContain('New');
  });

  it('should render the text area badge between the info and hint buttons', () => {
    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.text-area-badge');
    expect(badge).not.toBeNull();

    const nav = el.querySelector('nav');
    const children = Array.from(nav?.children || []);
    expect(children.length).toBe(3);
    expect(children[0].tagName.toLowerCase()).toBe('button'); // Info button on left
    expect(children[1].classList.contains('text-area-badge')).toBe(true); // Badge in middle
    expect(children[2].tagName.toLowerCase()).toBe('button'); // Hint button on right
  });

  it('should display text in the text area badge when badgeText input is provided', () => {
    fixture.componentRef.setInput('badgeText', 'Your Turn');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.text-area-badge');
    expect(badge?.textContent).toContain('Your Turn');
  });

  it('should render the information button with icon and initial off state', () => {
    const el: HTMLElement = fixture.nativeElement;
    const infoBtn = el.querySelector('button[aria-label="Information"]') as HTMLButtonElement;
    expect(infoBtn).not.toBeNull();
    expect(infoBtn.querySelector('info-icon, svg')).not.toBeNull();
    expect(infoBtn.getAttribute('aria-pressed')).toBe('false');
    expect(infoBtn.classList.contains('is-off')).toBe(true);
    expect(infoBtn.classList.contains('is-on')).toBe(false);
  });

  it('should toggle on/off state when information button is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const infoBtn = el.querySelector('button[aria-label="Information"]') as HTMLButtonElement;

    // Initially off
    expect(component.effectiveIsInfoOn()).toBe(false);

    // Toggle on
    infoBtn.click();
    fixture.detectChanges();
    expect(component.effectiveIsInfoOn()).toBe(true);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('true');
    expect(infoBtn.classList.contains('is-on')).toBe(true);

    // Toggle off
    infoBtn.click();
    fixture.detectChanges();
    expect(component.effectiveIsInfoOn()).toBe(false);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('false');
    expect(infoBtn.classList.contains('is-off')).toBe(true);
  });

  it('should respect input on/off state', () => {
    fixture.componentRef.setInput('isInfoOn', true);
    fixture.detectChanges();

    const infoBtn = fixture.nativeElement.querySelector('button[aria-label="Information"]') as HTMLButtonElement;
    expect(component.effectiveIsInfoOn()).toBe(true);
    expect(infoBtn.getAttribute('aria-pressed')).toBe('true');
    expect(infoBtn.classList.contains('is-on')).toBe(true);
  });

  it('should emit hint event when Hint button is clicked', () => {
    let triggered = false;
    component.hint.subscribe(() => {
      triggered = true;
    });

    const hintBtn = fixture.nativeElement.querySelector('button[aria-label="Get move hint"]') as HTMLButtonElement;
    hintBtn.click();

    expect(triggered).toBe(true);
  });

  it('should not emit events when button is disabled', () => {
    fixture.componentRef.setInput('isHintDisabled', true);
    fixture.detectChanges();

    let hintEmitted = false;
    component.hint.subscribe(() => (hintEmitted = true));

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(hintEmitted).toBe(false);
  });
});
