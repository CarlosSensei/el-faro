import * as T from 'three';
import type { Obstacle } from '../combat/collision';
import { createSurfaceTexture } from './surfaces';

export function mesh(geometry: T.BufferGeometry, color: number, unlit = false) {
  const material = unlit
    ? new T.MeshBasicMaterial({ color })
    : new T.MeshStandardMaterial({ color, flatShading: true });
  const object = new T.Mesh(geometry, material);
  object.castShadow = !unlit;
  object.receiveShadow = !unlit;
  return object;
}

export function buildSanctuary(scene: T.Scene, islandRadius: number, centerZ: number) {
  scene.background = new T.Color(0x628da0);
  scene.fog = new T.FogExp2(0x628da0, .024);
  scene.add(new T.HemisphereLight(0xffe9c5, 0x647898, 2.05));
  const sun = new T.DirectionalLight(0xffbb82, 3.2);
  sun.position.set(-7, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 25,
    bottom: -25,
    far: 55,
  });
  sun.shadow.normalBias = .025;
  scene.add(sun);

  const obstacles: Obstacle[] = [];
  const arena = new T.Group();
  arena.position.z = centerZ;
  scene.add(arena);
  const stoneTexture = createSurfaceTexture('stone', 3);
  const island = mesh(
    new T.CylinderGeometry(islandRadius + .65, islandRadius - 1, 1.45, 56),
    0xb3c892,
  );
  if (island.material instanceof T.MeshStandardMaterial) {
    island.material.map = createSurfaceTexture('grass', 18);
  }
  island.position.y = -.745;
  const sea = mesh(new T.CircleGeometry(58, 48), 0x468795);
  if (sea.material instanceof T.MeshStandardMaterial) {
    sea.material.map = createSurfaceTexture('water', 32);
  }
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.8;
  scene.add(island, sea);

  const offshoreIslands = [
    [-24, -18, 4.8, 3],
    [25, -13, 4.3, 2.8],
    [0, -29, 5.6, 3.4],
    [24, -23, 5, 4],
  ];
  for (const [x, z, width, height] of offshoreIslands) {
    const offshore = mesh(new T.CylinderGeometry(.67, 1, 1, 7), 0x496d71);
    offshore.position.set(x, -1.15, z);
    offshore.scale.set(width, height, width * .63);
    offshore.rotation.y = x * .33;
    const canopy = mesh(new T.DodecahedronGeometry(1), 0x719470);
    canopy.position.set(x, -.98 + height / 2, z);
    canopy.scale.set(width * .65, height * .48, width * .44);
    scene.add(offshore, canopy);
  }

  const foamGeometry = new T.RingGeometry(1, 1.035, 8, 1, 0, Math.PI / 1.8);
  for (let index = 0; index < 30; index++) {
    const angle = index * 2.39996;
    const distance = islandRadius + 1.3 + (index % 6) * 1.22;
    const foam = mesh(foamGeometry, index % 3 ? 0x8dc2bd : 0xbbe1d2, true);
    foam.position.set(Math.cos(angle) * distance, -1.78, Math.sin(angle) * distance);
    foam.rotation.set(-Math.PI / 2, 0, angle + .45);
    foam.scale.set(1.3 + (index % 4) * .32, .36, 1);
    scene.add(foam);
  }

  for (const [x, z] of [[-22, -8], [22, 5.4]]) {
    const boat = new T.Group();
    boat.position.set(x, -1.68, z);
    boat.rotation.y = .45;
    const hull = mesh(new T.SphereGeometry(.5, 6, 4), 0x704638);
    hull.scale.set(1.6, .36, .62);
    const mast = mesh(new T.CylinderGeometry(.026, .035, .98, 6), 0x573e32);
    mast.position.y = .55;
    const sailShape = new T.Shape()
      .moveTo(.04, .2)
      .lineTo(.68, .3)
      .lineTo(.04, 1.02)
      .closePath();
    const sail = mesh(new T.ShapeGeometry(sailShape), 0xffdda2);
    sail.material.side = T.DoubleSide;
    boat.add(hull, mast, sail);
    scene.add(boat);
  }

  for (const radius of [5.25, 7.51]) {
    const ring = mesh(new T.RingGeometry(radius, radius + .055, 72), 0xa7b09a, true);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .007;
    arena.add(ring);
  }
  const stone = new T.CylinderGeometry(.39, .52, 1, 5);
  const flame = new T.OctahedronGeometry(.25);
  for (let index = 0; index < 14; index++) {
    const angle = index * 2 * Math.PI / 14;
    const x = Math.cos(angle) * 7.77;
    const z = Math.sin(angle) * 7.77;
    if (z > 6 && Math.abs(x) < 3) continue;
    const height = index % 3 === 0 ? 1.58 : .58;
    const column = mesh(stone, index % 2 ? 0x697979 : 0x89938a);
    if (column.material instanceof T.MeshStandardMaterial) {
      column.material.map = stoneTexture;
    }
    column.scale.y = height;
    column.position.set(x, height / 2, z);
    column.rotation.y = angle;
    arena.add(column);
    obstacles.push({ x, z: centerZ + z, radius: .52 });
    if (index % 3 === 0) {
      const ember = mesh(flame, 0xffbb69, true);
      ember.position.set(x, height + .25, z);
      arena.add(ember);
    }
  }
  const tower = new T.Group();
  tower.position.set(-3.8, 0, -5.4);
  const base = mesh(new T.CylinderGeometry(.7, 1.1, 4.5, 9), 0x777d79);
  if (base.material instanceof T.MeshStandardMaterial) base.material.map = stoneTexture;
  base.position.y = 2.25;
  const chamber = mesh(new T.CylinderGeometry(.58, .7, .57, 9), 0x7c6e5b);
  chamber.position.y = 4.55;
  const roof = mesh(new T.ConeGeometry(.85, .75, 9), 0x5c4a48);
  roof.position.y = 5.2;
  const flameLight = mesh(new T.OctahedronGeometry(.29), 0xffc884, true);
  flameLight.position.set(0, 4.58, .6);
  flameLight.visible = false;
  tower.add(base, chamber, roof, flameLight);
  arena.add(tower);
  obstacles.push({ x: tower.position.x, z: centerZ + tower.position.z, radius: 1.1 });
  const rock = new T.DodecahedronGeometry(1, 0);
  for (let index = 0; index < 23; index++) {
    const angle = index * 2.39996;
    const radius = islandRadius + 2 + (index % 5) * 2.33;
    const cliff = mesh(rock, index % 2 ? 0x364a52 : 0x435a5c);
    cliff.position.set(Math.cos(angle) * radius, -1.55, Math.sin(angle) * radius);
    cliff.scale.set(.75 + (index % 3) * .6, .8 + (index % 4) * .43, 1.4);
    cliff.rotation.y = angle;
    scene.add(cliff);
  }
  return { flameLight, obstacles };
}
