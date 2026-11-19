import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ChapterTwoComponent } from '../comic/chapter-two.component';
import { ComicComponent } from '../comic/comic.component';
import { GameComponent } from '../game/game.component';

type Page = 'prologue' | 'island' | 'chapter-two' | 'forest';

@Component({
  selector: 'faro-root',
  standalone: true,
  imports: [ComicComponent, ChapterTwoComponent, GameComponent, NgTemplateOutlet],
  template: `
    <ng-template #loadActions>
      <div class="game-loading-actions">
        <button type="button" (click)="reloadPage()">Recargar página</button>
        <button type="button" class="secondary" (click)="returnHome()">Volver al prólogo</button>
      </div>
    </ng-template>

    @if (page() === 'prologue') {
      <faro-comic (enterGame)="goTo('island')" />
    } @else if (page() === 'chapter-two') {
      <faro-chapter-two (land)="goTo('forest')" />
    }

    @if (playing()) {
      @defer (when playing()) {
        <faro-game
          [forestChapter]="page() === 'forest'"
          (continueAdventure)="goTo('chapter-two')"
          (exitGame)="returnHome()" />
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
  readonly page = signal<Page>('prologue');
  readonly playing = computed(() => this.page() === 'island' || this.page() === 'forest');

  goTo(page: Page) {
    if (location.hash === '#tormenta' || location.hash === '#vardren') {
      history.replaceState(history.state, '', location.pathname + location.search);
    }

    this.page.set(page);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  returnHome() {
    this.goTo('prologue');
  }

  reloadPage() {
    window.location.reload();
  }
}
