import * as T from 'three';
import { mesh } from './sanctuary';
import { createSurfaceTexture } from './surfaces';
import type { Obstacle } from '../combat/collision';
import { buildForestBats } from './forest-bats';
import { buildForestPath } from './forest-path';
import { buildForestPillars } from './forest-pillars';

export const FOREST_SPAWN_Z = 15;
export const RUINS_CENTER_Z = -12;
export const BRIDGE_MARK = { x: 1.65, z: 6 };
export const TRACK_MARK = { x: -1.55, z: -.8 };
export const RUINS = { x: 0, z: -7.6 };
const RIVER_Z = 3.1;

export function buildForest(scene: T.Scene) {
  scene.background = new T.Color(0x233944);
  scene.fog = new T.FogExp2(0x233944, .038);
  scene.add(new T.HemisphereLight(0xb3dfd3, 0x473653, 2.6));
  const moon = new T.DirectionalLight(0xb6caff, 2.8);
  moon.position.set(-8, 15, 1);
  scene.add(moon);
  const scenery = new T.Group();
  const obstacles: Obstacle[] = [];
  const bridgeLock: Obstacle = { x: 0, z: RIVER_Z, halfX: 1.5, halfZ: 1.15 };
  const grass = createSurfaceTexture('grass', 12);
  const stone = createSurfaceTexture('stone', 2);
  const timber = createSurfaceTexture('timber', 2);
  const ground = mesh(new T.CylinderGeometry(21.6, 20.5, 1, 64), 0x607760);
  ground.position.y = -.51;
  if (ground.material instanceof T.MeshStandardMaterial) ground.material.map = grass;
  scenery.add(ground);

  const river = mesh(new T.BoxGeometry(42.4, .08, 2.3), 0x315f82);
  river.position.set(0, .035, RIVER_Z);
  if (river.material instanceof T.MeshStandardMaterial) river.material.map = createSurfaceTexture('water', 12);
  scenery.add(river);
  for (const x of [-11.7, 11.7]) obstacles.push({ x, z: RIVER_Z, halfX: 10.3, halfZ: 1.15 });

  const path = buildForestPath(timber, RIVER_Z, TRACK_MARK, RUINS);
  scenery.add(path.bridge, path.tracks);

  const dock = mesh(new T.BoxGeometry(3.2, .13, 4), 0x715245);
  dock.position.set(0, .03, 16);
  if (dock.material instanceof T.MeshStandardMaterial) dock.material.map = timber;
  scenery.add(dock);
  for (const x of [-1.5, 1.5]) {
    for (const z of [14.3, 17.5]) {
      const post = mesh(new T.CylinderGeometry(.12, .17, 1, 7), 0x493b39);
      post.position.set(x, .5, z);
      scenery.add(post);
      obstacles.push({ x, z, radius: .17 });
    }
  }

  const pillars = buildForestPillars(stone, [BRIDGE_MARK, TRACK_MARK]);
  const bats = buildForestBats();
  scenery.add(pillars.group, bats.group);
  obstacles.push(...pillars.ruins, ...pillars.runestones.map(mark => mark.obstacle));

  const altar = mesh(new T.CylinderGeometry(.66, .88, .65, 8), 0x86888a);
  altar.position.set(0, .325, -17.4);
  scenery.add(altar);
  obstacles.push({ x: 0, z: -17.4, radius: .88 });
  const flameLight = mesh(new T.OctahedronGeometry(.32), 0xffc17a, true);
  flameLight.position.set(0, 1.16, -17.4);
  flameLight.visible = false;
  scenery.add(flameLight);

  const trunk = new T.CylinderGeometry(.16, .29, 2.6, 6);
  const needles = new T.ConeGeometry(1, 2.2, 6);
  for (let index = 0; index < 95; index++) {
    const radius = Math.sqrt((index + 1) / 95) * 20;
    const angle = index * 2.399963;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 3.6 || Math.abs(z - RIVER_Z) < 1.8 || Math.hypot(x, z - RUINS_CENTER_Z) < 7.8) continue;
    const stem = mesh(trunk, 0x443842);
    stem.position.set(x, 1.25, z);
    scenery.add(stem);
    for (let layer = 0; layer < 3; layer++) {
      const crown = mesh(needles, layer % 2 ? 0x405b58 : 0x2b4e47);
      crown.position.set(x, 1.8 + layer * .68, z);
      crown.scale.setScalar(1.2 - layer * .22);
      scenery.add(crown);
    }
    obstacles.push({ x, z, radius: .29 });
  }
  scene.add(scenery);
  return { obstacles, bridgeLock, marks: pillars.runestones, path, flameLight, bats };
}
