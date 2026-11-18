import { Component, signal } from '@angular/core';
import { ComicComponent } from '../comic/comic.component';
import { GameComponent } from '../game/game.component';

@Component({
  selector: 'faro-root',
  standalone: true,
  imports: [ComicComponent, GameComponent],
  template: `
    @if (!playing()) {
      <faro-comic (enterGame)="start()" />
    }

    @defer (when playing()) {
      <faro-game />
    } @loading {
      <p class="game-loading" role="status">Cargando el archipiélago…</p>
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
}
