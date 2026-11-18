export type Obstacle =
  | { x: number; z: number; halfX: number; halfZ: number }
  | { x: number; z: number; radius: number };

const HERO_RADIUS = .32;
const MAX_STEP = .16;

function isOutsideArena(x: number, z: number, arenaRadius: number, centerZ: number) {
  return x ** 2 + (z - centerZ) ** 2 > arenaRadius ** 2;
}

function collidesWithObstacle(x: number, z: number, obstacle: Obstacle) {
  const distanceX = Math.abs(x - obstacle.x);
  const distanceZ = Math.abs(z - obstacle.z);

  if ('radius' in obstacle) {
    return Math.hypot(distanceX, distanceZ) < obstacle.radius + HERO_RADIUS;
  }

  const nearestX = Math.max(0, distanceX - obstacle.halfX);
  const nearestZ = Math.max(0, distanceZ - obstacle.halfZ);
  return Math.hypot(nearestX, nearestZ) < HERO_RADIUS;
}

function isBlocked(
  x: number,
  z: number,
  arenaRadius: number,
  obstacles: readonly Obstacle[],
  centerZ: number,
) {
  if (isOutsideArena(x, z, arenaRadius, centerZ)) return true;
  return obstacles.some(obstacle => collidesWithObstacle(x, z, obstacle));
}

export function moveOnGround(
  position: { x: number; z: number },
  dx: number,
  dz: number,
  arenaRadius: number,
  obstacles: readonly Obstacle[],
  centerZ = 0,
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));

  for (let step = 0; step < steps; step++) {
    const nextX = position.x + dx / steps;
    const nextZ = position.z + dz / steps;
    if (!isBlocked(nextX, position.z, arenaRadius, obstacles, centerZ)) {
      position.x = nextX;
    }
    if (!isBlocked(position.x, nextZ, arenaRadius, obstacles, centerZ)) {
      position.z = nextZ;
    }
  }
}
