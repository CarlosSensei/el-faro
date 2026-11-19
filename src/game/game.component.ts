import { AfterViewInit, Component, ElementRef, OnDestroy, output, signal, viewChild } from '@angular/core';
import { Arena } from './engine/arena';
import type { Battle, GameAction, Journey } from './game.types';
import { ACTION_LABELS, TouchControlsComponent } from './touch-controls.component';

@Component({
  selector: 'faro-game',
  standalone: true,
  imports: [TouchControlsComponent],
  template: `
    @let route = journey();
    @let combat = battle();
    @let touchActive = touchEnabled() && !error() && (route ? !route.dialogue : combat.phase === 'playing');
    <main
      #gameMain
      tabindex="-1"
      aria-label="El Faro de las Brasas, juego"
      [class.touch-layout]="touchEnabled()"
      [class.touch-active]="touchActive">
      <header>
        <span class="wordmark">✦ &nbsp; EL FARO DE LAS BRASAS</span>
        <div class="header-actions">
          <span class="chapter">PRÓLOGO / {{ areaName() }}</span>
          @if (!error()) {
            <button
              type="button"
              class="audio-toggle"
              aria-label="Efectos de sonido"
              [attr.aria-pressed]="audioEnabled()"
              [disabled]="!!journey()?.dialogue"
              (click)="toggleAudio($event)">
              {{ audioEnabled() ? 'Sonido sí' : 'Sonido no' }}
            </button>
          }
        </div>
      </header>

      <section class="stage" aria-label="Escena del juego">
        <div #viewport class="viewport" tabindex="-1"></div>

        @if (!journey()) {
          <div class="hud">
            <div>
              <label>Aprendiz</label>
              <progress aria-label="Vida del aprendiz" [value]="battle().health" max="5"></progress>
            </div>
            <div>
              <label>Guardián de ceniza</label>
              <progress class="boss" aria-label="Vida del guardián" [value]="battle().boss" max="3"></progress>
            </div>
          </div>
        }

        @if (route) {
          @if (route.dialogue) {
            <div class="veil">
              <article role="dialog" aria-modal="true" aria-labelledby="mara-title">
                <span class="eyebrow">ALDEA DEL FARO</span>
                <h1 id="mara-title">Mara</h1>
                <p>
                  La luz del faro se apagó anoche. Los barcos siguen ahí fuera. Llévate mi espada y a
                  Brasa. Podéis practicar su luz en el tótem del sendero. Cuando lleguéis al faro,
                  buscad una grieta en la coraza del guardián.
                </p>
                <button #dialogueButton (click)="continueDialogue()">
                  Recoger espada y continuar <span aria-hidden="true">→</span>
                </button>
              </article>
            </div>
          } @else {
            <p class="hint" role="status">
              @if (route.action) {
                @if (touchEnabled()) {
                  <strong class="hint-action">{{ actionLabels[route.action] }}</strong>
                } @else {
                  <kbd>{{ route.action }}</kbd>
                }
              }
              <span>{{ route.objective }}</span>
            </p>
          }
        } @else if (battle().phase !== 'playing' || error()) {
          <div class="veil">
            <article>
              <span class="eyebrow">✦ &nbsp; {{ areaName() }}</span>
              <h1>{{ title() }}</h1>
              <p>{{ description() }}</p>
              @if (!error()) {
                <button (click)="start()">
                  {{ buttonLabel() }} <span aria-hidden="true">→</span>
                </button>
                @if (battle().phase === 'ready') {
                  <button class="secondary" (click)="practice()">Practicar combate</button>
                }
                @if (battle().phase === 'won' || battle().phase === 'lost') {
                  <button type="button" class="secondary" (click)="exitGame.emit()">Salir</button>
                }
              }
            </article>
          </div>
        } @else {
          <p class="hint" role="status" [attr.data-cue]="combat.cue">
            @if (combat.action) {
              @if (touchEnabled()) {
                <strong class="hint-action">{{ actionLabels[combat.action] }}</strong>
              } @else {
                <kbd>{{ combat.action }}</kbd>
              }
            }
            <span>{{ touchEnabled() && combat.cue === 'charging'
              ? 'Sal del círculo rojo. Suelta el joystick y toca Esquivar para alejarte.'
              : combat.hint }}</span>
          </p>
        }
      </section>

      @if (touchActive) {
        <faro-touch-controls
          [exploring]="!!route"
          [prompt]="route ? route.action : combat.action"
          (movement)="moveWithTouch($event)"
          (action)="actWithTouch($event)" />
      } @else if (!touchEnabled()) {
        <footer>
          <span><kbd>W A S D</kbd> o <kbd>↑ ← ↓ →</kbd> Mover</span>
          <span><kbd>F</kbd> Interactuar</span>
          <span><kbd>J</kbd> Espada</span>
          <span><kbd>Espacio</kbd> Esquivar</span>
          <span><kbd>E</kbd> Luz</span>
        </footer>
      }
    </main>
  `,
})
export class GameComponent implements AfterViewInit, OnDestroy {
  private readonly gameMain = viewChild.required<ElementRef<HTMLElement>>('gameMain');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly dialogueButton = viewChild<ElementRef<HTMLButtonElement>>('dialogueButton');
  private readonly touchMedia = window.matchMedia('(any-pointer: coarse)');
  private arena?: Arena;

  readonly touchEnabled = signal(this.touchMedia.matches);
  readonly actionLabels = ACTION_LABELS;
  readonly exitGame = output<void>();
  readonly journey = signal<Journey | null>(null);
  readonly battle = signal<Battle>({
    phase: 'ready',
    health: 5,
    boss: 3,
    hint: '',
    action: '',
    cue: 'waiting',
  });
  readonly error = signal(false);
  readonly audioEnabled = signal(false);
  readonly audioPending = signal(false);

  private readonly updateTouchEnabled = () => {
    this.arena?.setTouchMovement(0, 0);
    this.touchEnabled.set(this.touchMedia.matches);
  };

  moveWithTouch({ x, y }: { x: number; y: number }) {
    this.arena?.setTouchMovement(x, y);
  }

  actWithTouch(action: GameAction) {
    this.arena?.performAction(action);
  }

  async toggleAudio(event: MouseEvent) {
    if (!this.arena || this.audioPending()) return;

    if (event.detail && (this.journey() || this.battle().phase === 'playing')) {
      this.viewport().nativeElement.focus();
    }

    this.audioPending.set(true);
    try {
      this.audioEnabled.set(await this.arena.setAudio(!this.audioEnabled()));
    } finally {
      this.audioPending.set(false);
    }
  }

  ngAfterViewInit() {
    this.gameMain().nativeElement.focus({ preventScroll: true });
    this.touchMedia.addEventListener('change', this.updateTouchEnabled);

    try {
      this.arena = new Arena(
        this.viewport().nativeElement,
        state => this.battle.set(state),
        route => {
          this.journey.set(route);
          if (route?.dialogue) {
            requestAnimationFrame(() => this.dialogueButton()?.nativeElement.focus());
          }
        },
      );
    } catch (error) {
      console.error(error);
      this.error.set(true);
    }
  }

  ngOnDestroy() {
    this.touchMedia.removeEventListener('change', this.updateTouchEnabled);
    this.arena?.dispose();
  }

  start() {
    if (this.battle().phase === 'lost') this.arena?.start();
    else this.arena?.beginJourney();
  }

  practice() {
    this.arena?.start();
  }

  continueDialogue() {
    this.arena?.continueDialogue();
  }

  areaName() {
    const area = this.journey()?.area;

    switch (area) {
      case 'village':
        return 'ALDEA DEL FARO';
      case 'trail':
        return 'SENDERO DEL ACANTILADO';
      case 'lighthouse':
        return 'FARO';
      case 'coast':
        return 'COSTA DE LAS BRASAS';
      default:
        return this.battle().phase === 'ready'
          ? 'ARCHIPIÉLAGO DE LAS BRASAS'
          : 'EL SANTUARIO';
    }
  }

  buttonLabel() {
    switch (this.battle().phase) {
      case 'lost':
        return 'Reintentar combate';
      case 'won':
        return 'Rejugar el prólogo';
      default:
        return 'Explorar la isla';
    }
  }

  title() {
    if (this.error()) return 'La arena no se pudo abrir';

    switch (this.battle().phase) {
      case 'won':
        return 'El faro vuelve a arder';
      case 'lost':
        return 'La brasa se apaga';
      default:
        return 'El Faro de las Brasas';
    }
  }

  description() {
    if (this.error()) return 'La escena 3D necesita un navegador con WebGL 2 disponible.';

    switch (this.battle().phase) {
      case 'won':
        return 'La salamandra lleva la primera chispa al faro. Los barcos ya pueden volver a casa.';
      case 'lost':
        return 'Sal del círculo rojo antes del golpe. Acércate cuando el guardián quede expuesto.';
      default:
        return 'El faro se ha apagado y los barcos siguen en el mar. '
          + 'Busca a Mara en la aldea y descubre cómo devolverles la luz.';
    }
  }
}

