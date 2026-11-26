import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;
  let routerSpy: { navigate: any };

  beforeEach(async () => {
    routerSpy = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the button component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply primary variant classes by default', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.classList.contains('btn-primary')).toBe(true);
    expect(btn.classList.contains('btn-md')).toBe(true);
    expect(btn.classList.contains('w-full')).toBe(true);
  });

  it('should apply secondary variant and custom size when provided', () => {
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.componentRef.setInput('size', 'sm');
    fixture.componentRef.setInput('fullWidth', false);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.classList.contains('btn-secondary')).toBe(true);
    expect(btn.classList.contains('btn-sm')).toBe(true);
    expect(btn.classList.contains('w-full')).toBe(false);
  });

  it('should show loading spinner and disable button when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    const spinner = fixture.nativeElement.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('should emit clicked event on click when enabled', () => {
    const clickSpy = vi.fn();
    component.clicked.subscribe(clickSpy);

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();

    expect(clickSpy).toHaveBeenCalled();
  });

  it('should not emit clicked event when disabled or loading', () => {
    const clickSpy = vi.fn();
    component.clicked.subscribe(clickSpy);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component.handleClick(new MouseEvent('click'));
    expect(clickSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    component.handleClick(new MouseEvent('click'));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should navigate to route when routerLink is provided', () => {
    fixture.componentRef.setInput('routerLink', '/game');
    fixture.detectChanges();

    component.handleClick(new MouseEvent('click'));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });
});
