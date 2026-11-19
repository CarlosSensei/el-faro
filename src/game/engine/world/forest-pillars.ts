import * as T from 'three';

type Position = { x: number; z: number };

const RUIN_COLUMNS = [
  { x: -2.8, z: -8, height: 2.58, broken: false },
  { x: 2.8, z: -8, height: 2.08, broken: true },
  { x: -5.1, z: -12, height: 1.72, broken: true },
  { x: 5.1, z: -12, height: 2.6, broken: false },
  { x: -3.2, z: -16.8, height: 2.46, broken: false },
  { x: 3.2, z: -16.8, height: 2.26, broken: true },
] as const;

export function buildForestPillars(stoneTexture: T.Texture, marks: readonly Position[]) {
  const group = new T.Group();
  const stone = new T.MeshStandardMaterial({ color: 0xa5a4b4, map: stoneTexture, flatShading: true });
  const trim = new T.MeshStandardMaterial({ color: 0x9997a9, flatShading: true });
  const patina = new T.MeshStandardMaterial({ color: 0x6c807b, flatShading: true });
  const inset = new T.MeshStandardMaterial({ color: 0x424750, flatShading: true });
  const base = new T.BoxGeometry(1.18, .22, 1.18);
  const step = new T.BoxGeometry(1.01, .16, 1.02);
  const collar = new T.BoxGeometry(1.02, .12, 1.04);
  const capital = new T.BoxGeometry(1.18, .18, 1.12);
  const plaque = new T.BoxGeometry(.40, .79, .05);
  const symbol = new T.TorusGeometry(.16, .027, 5, 4);

  const ruins = RUIN_COLUMNS.map(({ x, z, height, broken }, index) => {
    const pillar = new T.Group();
    pillar.position.set(x, 0, z);

    const shaft = new T.BoxGeometry(.83, height - .38, .88);
    if (broken) {
      const vertices = shaft.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const y = vertices.getY(i);
        if (y <= 0) continue;
        const offset = vertices.getX(i) * .35 - vertices.getZ(i) * .22;
        vertices.setY(i, y + offset);
      }
      shaft.computeVertexNormals();
    }

    place(pillar, base, patina, .11);
    place(pillar, step, trim, .29);
    place(pillar, shaft, stone, (height + .38) / 2);
    place(pillar, collar, trim, .88);
    if (!broken) {
      place(pillar, collar, patina, height - .18);
      place(pillar, capital, trim, height + .04);
    }

    const plaqueHeight = Math.min(1.57, height - .52);
    place(pillar, plaque, inset, plaqueHeight).position.z = .44;
    place(pillar, symbol, trim, plaqueHeight + .08).position.z = .475;
    if (index % 2 === 0) {
      place(pillar, symbol, patina, plaqueHeight - .18).position.z = .475;
    }
    group.add(pillar);
    return { x, z, halfX: .59, halfZ: .59 };
  });

  const runeBase = new T.CylinderGeometry(.54, .58, .18, 8);
  const runeShaft = new T.CylinderGeometry(.31, .43, .9, 8);
  const runeCrown = new T.CylinderGeometry(.47, .33, .23, 8);
  const crystalShape = new T.OctahedronGeometry(.26).scale(.87, 1.34, .87);
  const runeRing = new T.RingGeometry(.78, .81, 40);
  const runestones = marks.map(({ x, z }) => {
    const pillar = new T.Group();
    pillar.position.set(x, 0, z);
    place(pillar, runeBase, patina, .09);
    place(pillar, runeShaft, stone, .63);
    place(pillar, runeCrown, trim, 1.14);

    const glyph = new T.MeshBasicMaterial({ color: 0xb99be3 });
    const crystal = new T.MeshStandardMaterial({
      color: 0xb99be3,
      emissive: 0x8c66bf,
      emissiveIntensity: .65,
      flatShading: true,
    });
    const target = new T.Vector3(x, 1.51, z);
    place(pillar, crystalShape, crystal, target.y);
    for (const side of [-1, 1]) {
      place(pillar, symbol, glyph, .73).position.z = side * .392;
    }
    const ring = place(pillar, runeRing, glyph, .02);
    ring.rotation.x = -Math.PI / 2;
    group.add(pillar);

    return {
      target,
      obstacle: { x, z, radius: .58 },
      setLit(lit: boolean) {
        const color = lit ? 0x9ff7d6 : 0xb99be3;
        glyph.color.setHex(color);
        crystal.color.setHex(color);
        crystal.emissive.setHex(lit ? 0x72e6bd : 0x8c66bf);
        crystal.emissiveIntensity = lit ? 1.35 : .65;
      },
    };
  });

  return { group, ruins, runestones };
}

function place(parent: T.Group, geometry: T.BufferGeometry, material: T.Material, y: number) {
  const part = new T.Mesh(geometry, material);
  part.position.y = y;
  parent.add(part);
  return part;
}
