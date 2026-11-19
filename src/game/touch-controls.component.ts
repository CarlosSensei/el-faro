import { Component, input, OnChanges, OnDestroy, output, signal, SimpleChanges } from '@angular/core';
import type { GameAction } from './game.types';

export const ACTION_LABELS: Record<GameAction, string> = {
  F: 'Interactuar',
  Espacio: 'Esquivar',
  J: 'Espada',
  E: 'Luz',
};

const EXPLORATION_ACTIONS: readonly GameAction[] = ['F', 'E'];
const BATTLE_ACTIONS: readonly GameAction[] = ['Espacio', 'J', 'E'];
const DEAD_ZONE = .15;

@Component({
  selector: 'faro-touch-controls',
  standalone: true,
  host: {
    '(window:blur)': 'resetJoystick()',
    '(document:visibilitychange)': 'resetJoystick()',
    '(contextmenu)': '$event.preventDefault()',
  },
  template: `
    <div
      class="joystick"
      role="img"
      aria-label="Joystick de movimiento"
      (pointerdown)="startJoystick($event)"
      (pointermove)="moveJoystick($event)"
      (pointerup)="endJoystick($event)"
      (pointercancel)="endJoystick($event)"
      (lostpointercapture)="endJoystick($event)">
      <span class="direction up" aria-hidden="true">▴</span>
      <span class="direction left" aria-hidden="true">◂</span>
      <span class="direction right" aria-hidden="true">▸</span>
      <span class="direction down" aria-hidden="true">▾</span>
      <span
        class="thumb"
        [style.translate]="thumb().x + 'px ' + thumb().y + 'px'"
        aria-hidden="true"></span>
    </div>
    <div class="touch-actions" role="group" aria-label="Acciones táctiles">
      @for (action of exploring() ? explorationActions : battleActions; track action) {
        <button
          type="button"
          [attr.data-action]="action"
          [class.prompted]="prompt() === action"
          [disabled]="exploring() && prompt() !== action"
          (pointerdown)="pressAction($event, action)"
          (click)="clickAction($event, action)">
          {{ labels[action] }}
        </button>
      }
    </div>
  `,
  styleUrl: './touch-controls.component.css',
})
export class TouchControlsComponent implements OnChanges, OnDestroy {
  readonly exploring = input.required<boolean>();
  readonly prompt = input.required<GameAction | ''>();
  readonly movement = output<{ x: number; y: number }>();
  readonly action = output<GameAction>();
  readonly thumb = signal({ x: 0, y: 0 });
  readonly explorationActions = EXPLORATION_ACTIONS;
  readonly battleActions = BATTLE_ACTIONS;
  readonly labels = ACTION_LABELS;

  private pointer?: { id: number; pad: HTMLElement };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['exploring']) this.resetJoystick();
  }

  ngOnDestroy() {
    this.resetJoystick();
  }

  startJoystick(event: PointerEvent) {
    if (event.button !== 0 || this.pointer) return;
    event.preventDefault();
    const pad = event.currentTarget as HTMLElement;
    pad.setPointerCapture(event.pointerId);
    this.pointer = { id: event.pointerId, pad };
    this.moveJoystick(event);
  }

  moveJoystick(event: PointerEvent) {
    if (this.pointer?.id !== event.pointerId) return;
    const { left, top, width, height } = this.pointer.pad.getBoundingClientRect();
    const x = event.clientX - left - width / 2;
    const y = event.clientY - top - height / 2;
    const radius = width * .29;
    const distance = Math.hypot(x, y);
    const thumbScale = distance > radius ? radius / distance : 1;
    const strength = Math.min(1, Math.max(0, (distance / radius - DEAD_ZONE) / (1 - DEAD_ZONE)));
    const movementScale = distance > 0 ? strength / distance : 0;
    this.thumb.set({ x: x * thumbScale, y: y * thumbScale });
    this.movement.emit({ x: x * movementScale, y: y * movementScale });
  }

  endJoystick(event: PointerEvent) {
    if (this.pointer?.id === event.pointerId) this.resetJoystick();
  }

  resetJoystick() {
    const pointer = this.pointer;
    if (!pointer) return;
    this.pointer = undefined;
    if (pointer.pad.hasPointerCapture(pointer.id)) pointer.pad.releasePointerCapture(pointer.id);
    this.thumb.set({ x: 0, y: 0 });
    this.movement.emit({ x: 0, y: 0 });
  }

  pressAction(event: PointerEvent, action: GameAction) {
    if (event.button !== 0) return;
    event.preventDefault();
    this.action.emit(action);
  }

  clickAction(event: MouseEvent, action: GameAction) {
    if (event.detail === 0) this.action.emit(action);
  }
}
