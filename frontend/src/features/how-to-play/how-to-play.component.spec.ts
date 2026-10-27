import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HowToPlayComponent } from './how-to-play.component';
import { Router } from '@angular/router';

describe('HowToPlayComponent', () => {
  let component: HowToPlayComponent;
  let fixture: ComponentFixture<HowToPlayComponent>;
  let routerSpy: { navigate: any };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HowToPlayComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HowToPlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the HowToPlayComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize at step 1', () => {
    expect(component.currentStep()).toBe(1);
    expect(component.totalSteps).toBe(5);
  });

  it('should advance to next step when nextStep() is called', () => {
    component.nextStep();
    expect(component.currentStep()).toBe(2);

    component.nextStep();
    expect(component.currentStep()).toBe(3);

    component.nextStep();
    expect(component.currentStep()).toBe(4);

    component.nextStep();
    expect(component.currentStep()).toBe(5);
  });

  it('should navigate to /game when nextStep() is called on the last step', () => {
    component.goToStep(5);
    component.nextStep();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should go back when prevStep() is called', () => {
    component.goToStep(3);
    component.prevStep();
    expect(component.currentStep()).toBe(2);
  });

  it('should navigate to home / when prevStep() is called on step 1', () => {
    component.goToStep(1);
    component.prevStep();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to home / when goHome() is called', () => {
    component.goHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should jump to a specific step with goToStep()', () => {
    component.goToStep(4);
    expect(component.currentStep()).toBe(4);
  });

  it('should navigate to /game on skip()', () => {
    component.skip();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should navigate to /game on playNow()', () => {
    component.playNow();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should open and close the rules modal', () => {
    expect(component.showRulesModal()).toBe(false);
    component.openRulesModal();
    expect(component.showRulesModal()).toBe(true);
    component.closeRulesModal();
    expect(component.showRulesModal()).toBe(false);
  });

  it('should contain card ranks including the ditto range for 8-4', () => {
    expect(component.cardRanks.length).toBe(9);
    expect(component.cardRanks[0].name).toBe('Ace');
    expect(component.cardRanks[6].isRange).toBe(true);
    expect(component.cardRanks[6].rank).toBe('8-4');
    expect(component.cardRanks[8].name).toBe('Two');
  });

  it('should handle keyboard navigation (ArrowRight and ArrowLeft)', () => {
    const arrowRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(arrowRight);
    expect(component.currentStep()).toBe(2);

    const arrowLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(arrowLeft);
    expect(component.currentStep()).toBe(1);
  });
});
