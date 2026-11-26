import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatchAbandonedComponent } from './match-abandoned.component';

describe('MatchAbandonedComponent', () => {
  let component: MatchAbandonedComponent;
  let fixture: ComponentFixture<MatchAbandonedComponent>;
  let routerSpy: { navigate: any };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MatchAbandonedComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchAbandonedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the MatchAbandonedComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render the default title "Match Abandoned"', () => {
    const el: HTMLElement = fixture.nativeElement;
    const h1 = el.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Match Abandoned');
  });

  it('should render custom title when input is provided', () => {
    fixture.componentRef.setInput('title', 'Game Terminated');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const h1 = el.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Game Terminated');
  });

  it('should render the default subtitle', () => {
    const el: HTMLElement = fixture.nativeElement;
    const p = el.querySelector('p');
    expect(p?.textContent).toContain('The match was not completed');
    expect(p?.textContent).toContain('and has been abandoned.');
  });

  it('should render custom subtitle when input is provided', () => {
    fixture.componentRef.setInput('subtitle', 'Custom notice text');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const p = el.querySelector('p');
    expect(p?.textContent?.trim()).toBe('Custom notice text');
  });

  it('should render both protection notice and rematch notice in the info card', () => {
    const el: HTMLElement = fixture.nativeElement;
    const textContent = el.textContent || '';
    expect(textContent).toContain('This match will not affect your points, XP, or rank.');
    expect(textContent).toContain('You can start a new match anytime and continue playing.');
  });

  it('should render fanned cards and alert warning badge in graphic area', () => {
    const el: HTMLElement = fixture.nativeElement;
    const alertSvg = el.querySelector('svg linearGradient#alertGrad');
    expect(alertSvg).toBeTruthy();
  });

  it('should render 2 app-button components for actions', () => {
    const el: HTMLElement = fixture.nativeElement;
    const appButtons = el.querySelectorAll('app-button');
    expect(appButtons.length).toBe(2);
  });

  it('should emit playAgain event and navigate to /game when "Play Again" button is clicked', () => {
    const playAgainSpy = vi.fn();
    component.playAgain.subscribe(playAgainSpy);

    const el: HTMLElement = fixture.nativeElement;
    const playAgainBtn = el.querySelector('.play-again-btn button') as HTMLButtonElement;
    expect(playAgainBtn).toBeTruthy();

    playAgainBtn.click();
    expect(playAgainSpy).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should emit backToHome event and navigate to / when "Back to Home" button is clicked', () => {
    const backToHomeSpy = vi.fn();
    component.backToHome.subscribe(backToHomeSpy);

    const el: HTMLElement = fixture.nativeElement;
    const backHomeBtn = el.querySelector('.back-home-btn button') as HTMLButtonElement;
    expect(backHomeBtn).toBeTruthy();

    backHomeBtn.click();
    expect(backToHomeSpy).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});
