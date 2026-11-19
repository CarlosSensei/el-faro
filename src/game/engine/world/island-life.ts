import * as T from 'three';
import { makeVillager, type VillagerRole } from '../entities/characters';

interface VillagerPlacement {
  x: number;
  z: number;
  role: VillagerRole;
  coat: number;
  skin: number;
  heading: number;
  walk?: readonly [number, number];
}

const VILLAGERS: readonly VillagerPlacement[] = [
  { x: -2.65, z: 11, role: 'farmer', coat: 0x9d583f, skin: 0xd39a6f, heading: 0, walk: [.27, 1.7] },
  { x: 2.78, z: 10.65, role: 'traveler', coat: 0x6d729c, skin: 0x9e674b, heading: .9, walk: [.24, 1.9] },
  { x: -5.85, z: 9.8, role: 'farmer', coat: 0x626f4d, skin: 0xb77b58, heading: 1.65 },
  { x: 4.65, z: 2.25, role: 'traveler', coat: 0xa37344, skin: 0xe1ac83, heading: 2.4, walk: [.40, 1.15] },
  { x: -10.7, z: 15.1, role: 'fisher', coat: 0x527586, skin: 0xb87b5a, heading: -.56 },
  { x: 14.7, z: 5.6, role: 'fisher', coat: 0x955c54, skin: 0x87533f, heading: 1.25 },
];

const FLIGHTS = [
  { x: .4, z: 9.2, width: 5.2, depth: 3.25, altitude: 3.3, speed: .48, phase: .35 },
  { x: .4, z: 8.1, width: 5.8, depth: 3.5, altitude: 3.75, speed: .46, phase: .95 },
  { x: 1.6, z: .2, width: 5.7, depth: 3.1, altitude: 3.4, speed: .43, phase: 2.4 },
  { x: -13, z: 8, width: 4.4, depth: 5.2, altitude: 3.65, speed: .4, phase: 1.4 },
  { x: 15, z: 2.5, width: 4.3, depth: 5.1, altitude: 3.7, speed: .42, phase: 2.7 },
  { x: -6, z: 16, width: 5.5, depth: 3.5, altitude: 3.15, speed: .39, phase: 3.4 },
];

function flightSurface(points: readonly (readonly [number, number])[]) {
  const outline = new T.Shape();
  points.forEach(([x, z], index) => index ? outline.lineTo(x, -z) : outline.moveTo(x, -z));
  return new T.ShapeGeometry(outline).rotateX(-Math.PI / 2);
}

function buildGulls(group: T.Group) {
  const plumage = new T.MeshBasicMaterial({ color: 0xf5f3dd, side: T.DoubleSide });
  const tips = new T.MeshBasicMaterial({ color: 0x455156, side: T.DoubleSide });
  const beakMaterial = new T.MeshBasicMaterial({ color: 0xe9ab57 });
  const bodyGeometry = new T.SphereGeometry(1, 7, 5).scale(.1, .09, .28);
  const beakGeometry = new T.ConeGeometry(.057, .17, 5).rotateX(Math.PI / 2);
  const wingGeometry = flightSurface([[0, .12], [.32, .14], [.56, .04], [.46, -.14], [.22, -.2], [0, -.12]]);
  const tipGeometry = flightSurface([[.56, .04], [.83, -.19], [.62, -.16], [.46, -.14]]);
  const tailGeometry = flightSurface([[-.05, -.21], [.05, -.21], [.145, -.4], [-.145, -.4]]);

  return FLIGHTS.map(flight => {
    const model = new T.Group();
    const beak = new T.Mesh(beakGeometry, beakMaterial);
    beak.position.z = .26;
    model.add(new T.Mesh(bodyGeometry, plumage), beak, new T.Mesh(tailGeometry, plumage));

    const wings = [-1, 1].map(side => {
      const wing = new T.Group();
      wing.position.x = side * .065;
      wing.scale.x = side;
      wing.add(new T.Mesh(wingGeometry, plumage), new T.Mesh(tipGeometry, tips));
      model.add(wing);
      return { wing, side };
    });

    group.add(model);
    return { model, wings, flight };
  });
}

export function buildIslandLife() {
  const group = new T.Group();
  const gulls = buildGulls(group);
  const villagers = VILLAGERS.map((placement, index) => {
    const villager = makeVillager(placement.role, placement.coat, placement.skin);
    villager.model.scale.setScalar(.86 + (index % 3) * .06);
    group.add(villager.model);
    return {
      ...villager,
      placement,
      obstacle: { x: placement.x, z: placement.z, radius: .29 },
      phase: placement.heading,
      stride: 0,
    };
  });

  function update(dt: number, time: number, hero?: { x: number; z: number }) {
    for (const villager of villagers) {
      const { placement, model, arms, legs, obstacle } = villager;
      if (!placement.walk) {
        model.position.set(placement.x, 0, placement.z);
        model.rotation.y = placement.heading;
        arms[0].rotation.x = Math.sin(time * 1.3 + placement.heading) * .075;
        arms[1].rotation.x = placement.role === 'fisher' ? -.32 : 0;
        continue;
      }

      const [width, depth] = placement.walk;
      const phase = villager.phase + dt * .53;
      const x = placement.x + Math.cos(phase) * width;
      const z = placement.z + Math.sin(phase) * depth;
      const clear = !hero || Math.hypot(x - hero.x, z - hero.z) >= .65;
      if (clear || dt === 0) {
        villager.phase = phase;
        obstacle.x = x;
        obstacle.z = z;
        model.rotation.y = Math.atan2(-Math.sin(phase) * width, Math.cos(phase) * depth);
        villager.stride += dt * (3.5 + Math.abs(Math.cos(phase)) * 3.5);
      }
      const step = clear ? Math.sin(villager.stride) * .36 : 0;
      model.position.set(obstacle.x, Math.abs(step) * .085, obstacle.z);
      legs[0].rotation.x = arms[1].rotation.x = step;
      legs[1].rotation.x = arms[0].rotation.x = -step;
    }

    for (const { model, wings, flight } of gulls) {
      const phase = flight.phase + time * flight.speed;
      model.position.set(
        flight.x + Math.cos(phase) * flight.width,
        flight.altitude + Math.sin(phase * 2) * .28,
        flight.z + Math.sin(phase) * flight.depth,
      );
      model.rotation.y = Math.atan2(-Math.sin(phase) * flight.width, Math.cos(phase) * flight.depth);
      model.rotation.z = -.18;
      const effort = T.MathUtils.smoothstep(Math.sin(time * 1.8 + flight.phase), -.3, .72);
      const flap = .11 + Math.sin(time * 16 + flight.phase) * effort * .65;
      for (const { wing, side } of wings) wing.rotation.z = side * flap;
    }
  }

  update(0, 0);
  return { group, obstacles: villagers.map(villager => villager.obstacle), update };
}
