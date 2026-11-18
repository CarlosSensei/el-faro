import { AfterViewInit, Component, ElementRef, OnDestroy, output, viewChildren } from '@angular/core';

@Component({
  selector: 'faro-comic',
  standalone: true,
  styleUrl: './comic.component.css',
  template: `
    <main class="comic">
      <section class="cover" aria-labelledby="comic-title">
        <img
          class="cover-art"
          src="comic/portada.webp"
          fetchpriority="high"
          alt="Un relámpago ilumina el faro apagado mientras los barcos luchan contra el oleaje.">
        <div class="cover-copy">
          <p class="small-title">Prólogo ilustrado</p>
          <h1 id="comic-title">
            El Faro de<br>
            las <em>Brasas</em>
          </h1>
          <p>La noche en que el mar se quedó sin luz.</p>
          <a class="scroll-link" href="#tormenta">Leer el prólogo <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section id="tormenta" class="story-beat" aria-labelledby="storm-title">
        <span class="rule" aria-hidden="true"></span>
        <h2 id="storm-title">La última luz</h2>
        <p>
          Durante generaciones, el faro guio a los barcos entre los arrecifes. Cuando llegó la tormenta,
          su llama desapareció. Desde la costa aún podían verse las velas. Ninguna encontraba el camino
          de vuelta.
        </p>
      </section>

      <figure #panel class="panel mara">
        <img
          src="comic/mara.webp"
          loading="lazy"
          decoding="async"
          alt="Mara entrega una espada al aprendiz en una cabaña iluminada.
            Brasa, la pequeña salamandra, brilla sobre el farol.">
        <figcaption>
          <span class="small-title">Mara, guardiana del faro</span>
          <p>«Si queda una brasa en el santuario, aún podemos guiar a los barcos a casa.»</p>
        </figcaption>
      </figure>

      <figure #panel class="panel trail">
        <img
          src="comic/brasa.webp"
          loading="lazy"
          decoding="async"
          alt="El aprendiz y Brasa contemplan el arco de piedra que se alza sobre el acantilado.">
        <figcaption>
          <span class="small-title">El sendero del acantilado</span>
          <p>
            Tras el arco espera el Guardián de Ceniza. La espada puede abrir su coraza. Solo Brasa puede
            iluminar lo que esconde.
          </p>
        </figcaption>
      </figure>

      <section #panel class="story-beat ending" aria-labelledby="end-title">
        <span class="rule" aria-hidden="true"></span>
        <h2 id="end-title">El faro te espera</h2>
        <button type="button" class="play" (click)="enterGame.emit()">
          Entrar al juego <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  `,
})
export class ComicComponent implements AfterViewInit, OnDestroy {
  readonly enterGame = output<void>();
  private readonly panels = viewChildren<ElementRef<HTMLElement>>('panel');
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in-view');
        this.observer?.unobserve(entry.target);
      }
    }, { threshold: .12 });

    for (const panel of this.panels()) {
      this.observer.observe(panel.nativeElement);
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
