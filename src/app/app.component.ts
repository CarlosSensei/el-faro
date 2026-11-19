import { NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ComicComponent } from '../comic/comic.component';
import { GameComponent } from '../game/game.component';

@Component({
  selector: 'faro-root',
  standalone: true,
  imports: [ComicComponent, GameComponent, NgTemplateOutlet],
  template: `
    <ng-template #loadActions>
      <div class="game-loading-actions">
        <button type="button" (click)="reloadPage()">Recargar página</button>
        <button type="button" class="secondary" (click)="returnHome()">Volver al prólogo</button>
      </div>
    </ng-template>

    @if (!playing()) {
      <faro-comic (enterGame)="start()" />
    }

    @if (playing()) {
      @defer (when playing()) {
        <faro-game (exitGame)="returnHome()" />
      } @loading (after 200ms) {
        <main class="game-loading">
          <p role="status">Cargando el archipiélago…</p>
          <ng-container [ngTemplateOutlet]="loadActions" />
        </main>
      } @error {
        <main class="game-loading">
          <p role="alert">No se pudo cargar el juego. Recarga la página para volver a intentarlo.</p>
          <ng-container [ngTemplateOutlet]="loadActions" />
        </main>
      }
    }
  `,
})
export class AppComponent {
  readonly playing = signal(false);

  start() {
    if (location.hash === '#tormenta') {
      history.replaceState(history.state, '', location.pathname + location.search);
    }

    this.playing.set(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  returnHome() {
    this.playing.set(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  reloadPage() {
    window.location.reload();
  }
}
