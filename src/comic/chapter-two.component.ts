import { AfterViewInit, Component, ElementRef, output, viewChild } from '@angular/core';

@Component({
  selector: 'faro-chapter-two',
  styleUrl: './comic.component.css',
  template: `
    <main class="comic">
      <section class="cover" aria-labelledby="forest-title">
        <img class="cover-art" src="comic/marca.webp" fetchpriority="high"
          alt="Brasa ilumina un sello de eclipse grabado en la coraza del gólem caído.">
        <div class="cover-copy">
          <p class="small-title">Capítulo II</p>
          <h1 #title tabindex="-1" id="forest-title">El bosque<br>sin <em>alba</em></h1>
          <p>En el continente, las luces se apagan una tras otra.</p>
          <a class="scroll-link" href="#vardren">Seguir leyendo <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section class="story-beat">
        <span class="rule" aria-hidden="true"></span>
        <h2>La marca bajo la piedra</h2>
        <p>Brasa iluminó los restos del gólem. Bajo la coraza, Mara encontró una inscripción antigua, «Guarda la llama». Sobre ella, alguien había grabado el sello de Vardren.</p>
      </section>

      <figure class="panel mara" id="vardren">
        <img src="comic/vardren.webp" loading="lazy" decoding="async"
          alt="Vardren sostiene las llamas robadas bajo un eclipse negro.">
        <figcaption>
          <span class="small-title">El hombre que robó el amanecer</span>
          <p>«Fue uno de nosotros», dijo Mara. «Durante un eclipse aprendió a dar forma a las sombras. El sol deshacía sus criaturas. Ahora roba las llamas de los faros para que el eclipse dure para siempre».</p>
        </figcaption>
      </figure>

      <figure class="panel trail">
        <img src="comic/travesia.webp" loading="lazy" decoding="async"
          alt="La luz de Brasa traza una ruta en el agua hacia el Bosque del Alba.">
        <figcaption>
          <span class="small-title">La luz que queda</span>
          <p>Un barquero vio a las sombras llevar una llama al Bosque del Alba. Antes de zarpar, Brasa guardó una chispa del faro en el pecho. Su luz dibujó sobre el agua el camino al continente.</p>
        </figcaption>
      </figure>

      <section class="story-beat ending">
        <span class="rule" aria-hidden="true"></span>
        <h2>Un embarcadero entre las sombras</h2>
        <button class="play" type="button" (click)="land.emit()">Desembarcar en el Bosque del Alba <span aria-hidden="true">→</span></button>
      </section>
    </main>
  `,
})
export class ChapterTwoComponent implements AfterViewInit {
  readonly land = output<void>();
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');

  ngAfterViewInit() {
    this.title().nativeElement.focus({ preventScroll: true });
  }
}
