import * as T from 'three';

type SurfaceType = 'stone' | 'tiles' | 'grass' | 'water' | 'timber';

const TEXTURE_SIZE = 128;
const DETAIL_COUNT = 480;
const PALETTES = {
  stone: ['#676869', '#96918a', '#bdb8a6', '#dad6c4'],
  tiles: ['#722c25', '#a74e38', '#c36b4f', '#db8967'],
  grass: ['#547351', '#799658', '#a4b66c', '#bfb780'],
  water: ['#56888a', '#75aab2', '#8ab9b8', '#b0d5cc'],
  timber: ['#624d39', '#88694d', '#a28261', '#bca184'],
} as const;

export function createSurfaceTexture(kind: SurfaceType, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo crear el contexto 2D para generar una textura.');
  }

  const colors = PALETTES[kind];
  let seed = 219;
  const nextRandom = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };

  context.fillStyle = colors[0];
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const hasCoursedPattern = kind === 'stone' || kind === 'tiles' || kind === 'timber';
  if (hasCoursedPattern) {
    const rowHeight = kind === 'timber' ? 32 : 16;
    const columnWidth = kind === 'tiles' ? 16 : 32;

    for (let y = 0; y < TEXTURE_SIZE; y += rowHeight) {
      const rowOffset = (y / rowHeight % 2) * columnWidth / 2;
      for (let x = 0; x < TEXTURE_SIZE; x += columnWidth) {
        context.fillStyle = colors[1 + Math.floor(nextRandom() * 3)];
        for (const wrapOffset of [-TEXTURE_SIZE, 0]) {
          context.fillRect(
            x + rowOffset + wrapOffset,
            y + 1,
            columnWidth - 1,
            rowHeight - 2,
          );
        }
      }
    }
  }

  for (let dot = 0; dot < DETAIL_COUNT; dot++) {
    const x = nextRandom() * TEXTURE_SIZE;
    const y = nextRandom() * TEXTURE_SIZE;
    context.globalAlpha = hasCoursedPattern ? .19 : kind === 'water' ? .12 : .42;
    context.fillStyle = colors[Math.floor(nextRandom() * colors.length)];

    const width = kind === 'water' ? 5 + nextRandom() * 17 : 1 + nextRandom() * 5;
    const height = kind === 'water' ? 1 : 1 + nextRandom() * 3;
    context.fillRect(x, y, width, height);
  }

  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.setScalar(repeat);
  texture.anisotropy = 4;
  return texture;
}
