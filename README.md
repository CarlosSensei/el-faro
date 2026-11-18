# El Faro de las Brasas

Prototipo de RPG de acción 3D. El aprendiz y su salamandra se enfrentan al Guardián de Ceniza en un santuario sobre el mar.

## Ejecutar en local

Requiere Node.js 22.12 o superior y un navegador de escritorio con WebGL 2.

```sh
npm ci
npm start
```

Abre http://localhost:4200. El comando `npm run build` genera la web estática en `dist/faro/browser/`.

## Jugar

| Tecla | Acción |
| --- | --- |
| WASD o flechas | Moverse |
| Espacio | Esquivar |
| J | Atacar con la espada |
| E | Invocar la luz de la salamandra |

El primer golpe del guardián es de práctica y no quita vida. El círculo rojo se llena antes del impacto. Pulsa Espacio sin dirección para alejarte del guardián durante la carga. Entra en el círculo dorado y pulsa J. Después, desde el círculo turquesa, pulsa E. El primer combo puede hacerse sin límite de tiempo. En las rondas siguientes tienes cinco segundos para usar la espada y seis para lanzar la luz. Tres impactos de luz completan el combate.

## Código

- `src/main.ts` arranca Angular y `src/app/` contiene el componente raíz.
- `src/comic/` reúne el prólogo ilustrado y sus estilos.
- `src/game/game.component.ts` conecta la interfaz del juego con el motor.
- `src/game/game.types.ts` define los estados compartidos del combate y el prólogo.
- `src/game/engine/arena.ts` coordina el bucle de juego, la cámara, los controles y el combate.
- `src/game/engine/combat/` contiene las colisiones y los efectos del combate.
- `src/game/engine/entities/` construye los personajes con geometría de Three.js.
- `src/game/engine/world/` genera los escenarios y las texturas procedurales.
- `src/game/engine/audio/` genera los efectos de sonido.
- `src/styles.css` contiene los estilos globales.

## Prólogo

Pulsa «Explorar la isla» para recorrer la costa, la aldea y el sendero en una sola escena. Usa **F** para hablar con Mara y recoger la espada. En el sendero puedes practicar **E** junto al sello. Cuando quieras combatir, acércate al arco al pie del faro y pulsa **F**. Si pierdes, puedes reintentar allí mismo. «Practicar combate» abre directamente el enfrentamiento.

## Sonido y animación

Activa el botón «Sonido no» para escuchar los efectos sintetizados de espada, coraza, esquiva, golpe y luz. El juego comienza en silencio. Si el sistema solicita movimiento reducido, se omiten las partículas y se reducen las animaciones decorativas.

## Escenarios

El aprendiz colisiona con las casas, las rocas del sendero, Mara, el pedestal y los postes del arco. Puedes deslizarte por los bordes manteniendo una dirección diagonal. Las texturas de piedra, teja, madera, hierba y agua se generan en el navegador, sin descargar imágenes.

## Introducción ilustrada

La página inicial cuenta el prólogo en tres ilustraciones originales. Desplázate hasta el final y pulsa «Entrar al juego» para cargar el motor 3D y abrir el menú. Las imágenes WebP están en `public/comic/` y se copian en la compilación estática.
