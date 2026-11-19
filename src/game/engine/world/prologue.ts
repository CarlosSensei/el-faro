import * as T from 'three';
import { makeMara } from '../entities/characters';
import type { Obstacle } from '../combat/collision';
import { buildBeacon } from './beacon';
import { buildIslandLife } from './island-life';
import { mesh } from './sanctuary';
import { createSurfaceTexture } from './surfaces';

export const GUIDE_POSITION = { x: 0, z: 9 };
export const BEACON_POSITION = { x: 3, z: -2.2 };
export const LIGHTHOUSE_POSITION = { x: 0, z: -7.6 };
export const ISLAND_RADIUS = 21;
export const BATTLE_CENTER_Z = -12;
export const SPAWN_Z = 14;

export function buildPrologue() {
  const scenery = new T.Group();
  const obstacles: Obstacle[] = [];
  const stoneTexture = createSurfaceTexture('stone');
  const tileTexture = createSurfaceTexture('tiles', 2);
  const timberTexture = createSurfaceTexture('timber', 2);

  for (let z = -8; z <= 15; z++) {
    const tile = mesh(new T.BoxGeometry(2.05, .045, .86), 0xb4ae91);
    if (tile.material instanceof T.MeshStandardMaterial) tile.material.map = stoneTexture;
    tile.position.set(Math.sin(z * .55) * .32, .016, z);
    scenery.add(tile);
  }

  const posts = [-1.55, 1.55];
  for (const x of posts) {
    const post = mesh(new T.CylinderGeometry(.21, .34, 2.5, 6), 0x66675b);
    post.position.set(x, 1.25, LIGHTHOUSE_POSITION.z);
    scenery.add(post);
    obstacles.push({ x, z: LIGHTHOUSE_POSITION.z, radius: .34 });
  }
  const lintel = mesh(new T.BoxGeometry(3.62, .32, .55), 0x777363);
  lintel.position.set(0, 2.5, LIGHTHOUSE_POSITION.z);
  const rune = mesh(new T.OctahedronGeometry(.2), 0xffc169, true);
  rune.position.set(0, 2.77, LIGHTHOUSE_POSITION.z);
  const archTop = new T.Group();
  archTop.add(lintel, rune);
  scenery.add(archTop);

  for (const x of [-4.5, 4.5]) {
    for (const z of [8, 13.2]) {
      const house = new T.Group();
      const width = 2.15;
      const depth = 1.85;
      const walls = mesh(new T.BoxGeometry(width, 1.45, depth), x < 0 ? 0xe2b994 : 0xd8ccd2);
      walls.position.y = .75;
      if (walls.material instanceof T.MeshStandardMaterial) walls.material.map = stoneTexture;
      obstacles.push({ x, z, halfX: width / 2, halfZ: depth / 2 });
      const roof = mesh(new T.ConeGeometry(1.78, 1.12, 4), x < 0 ? 0xffb396 : 0xe78267);
      roof.position.y = 1.96;
      roof.rotation.y = Math.PI / 4;
      if (roof.material instanceof T.MeshStandardMaterial) roof.material.map = tileTexture;
      const door = mesh(new T.BoxGeometry(.45, .76, .04), 0xc3a17d);
      door.position.set(-.53, .39, .94);
      if (door.material instanceof T.MeshStandardMaterial) door.material.map = timberTexture;
      const chimney = mesh(new T.BoxGeometry(.32, .75, .33), 0x9c8478);
      chimney.position.set(.55, 1.95, -.33);
      if (chimney.material instanceof T.MeshStandardMaterial) chimney.material.map = stoneTexture;
      const window = mesh(new T.BoxGeometry(.42, .47, .045), 0xffcf82, true);
      window.position.set(.36, .84, .94);
      house.add(walls, roof, window, door, chimney);
      house.position.set(x, 0, z);
      scenery.add(house);
    }
  }

  const guide = makeMara();
  guide.scale.setScalar(1.12);
  guide.position.set(GUIDE_POSITION.x, .035, GUIDE_POSITION.z);
  const marker = mesh(new T.OctahedronGeometry(.18), 0xffd78d, true);
  marker.position.y = 2.05;
  guide.add(marker);
  scenery.add(guide);
  obstacles.push({ ...GUIDE_POSITION, radius: .4 });

  const rockGeometry = new T.DodecahedronGeometry(1.3);
  rockGeometry.computeBoundingBox();
  const rockBounds = rockGeometry.boundingBox;
  if (!rockBounds) throw new Error('No se pudieron calcular los límites de las rocas.');
  const rockExtent = rockBounds.max;

  for (const x of [-9.4, -5.8, 6.7, 10.9]) {
    for (const z of [-4.6, -.8, 4.2]) {
      const rock = mesh(rockGeometry, z === 0 ? 0xa99a98 : 0x8caaa2);
      rock.position.set(x, .45, z);
      rock.scale.set(1.05, .78, .8);
      if (rock.material instanceof T.MeshStandardMaterial) rock.material.map = stoneTexture;
      scenery.add(rock);
      obstacles.push({
        x,
        z,
        halfX: rockExtent.x * rock.scale.x,
        halfZ: rockExtent.z * rock.scale.z,
      });
    }
  }
  const beacon = buildBeacon(BEACON_POSITION, stoneTexture);
  const life = buildIslandLife();
  scenery.add(beacon.model, life.group);
  obstacles.push({ ...BEACON_POSITION, radius: .78 }, ...life.obstacles);

  for (let index = 0; index < 64; index++) {
    const angle = index * 2.39996;
    const radius = 5.5 + (index % 13) * 1.13;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 2.3 || Math.hypot(x, z - BATTLE_CENTER_Z) < 7.8) continue;
    const tuftHeight = .35 + (index % 3) * .12;
    const tuftColor = index % 3 === 0 ? 0xe6ad61 : 0x83a254;
    const tuft = mesh(new T.ConeGeometry(.24, tuftHeight, 4), tuftColor);
    tuft.position.set(x, .16, z);
    tuft.rotation.y = angle;
    scenery.add(tuft);
  }

  for (const [x, z] of [[-14, 6], [-14, -5], [14, 6], [15, -4], [-10, 12], [10, 12]]) {
    const trunk = mesh(new T.CylinderGeometry(.12, .22, 1.75, 7), 0x73543d);
    trunk.position.set(x, .87, z);
    scenery.add(trunk);
    for (const [offset, y, size] of [[-.42, 1.85, 1.1], [.34, 2.15, 1.0], [0, 2.65, .94]]) {
      const crown = mesh(new T.DodecahedronGeometry(size), y > 2 ? 0x6e9d56 : 0x456d51);
      crown.position.set(x + offset, y, z);
      scenery.add(crown);
    }
    obstacles.push({ x, z, radius: .24 });
  }
  return { scenery, archTop, beacon, life, obstacles };
}
