import * as T from 'three';

const PARTICLE_LIMIT = 72;
const BURST_DURATION = .48;
const WAVE_DURATION = .48;
const DODGE_TRAIL_DURATION = .46;
export const LIGHT_DURATION = .45;

function glow(geometry: T.BufferGeometry, color: number) {
  return new T.Mesh(geometry, new T.MeshBasicMaterial({
    color,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
  }));
}

class GroundRipple {
  readonly group = new T.Group();
  private readonly ring = glow(new T.RingGeometry(.83, 1, 48), 0xffffff);
  private readonly rim = glow(new T.RingGeometry(.97, 1, 48), 0xffedd3);
  private age = 1;
  private radius = 1;

  constructor(private readonly duration: number) {
    this.ring.rotation.x = this.rim.rotation.x = -Math.PI / 2;
    this.rim.position.y = .008;
    this.group.add(this.ring, this.rim);
    this.reset();
  }

  play(position: T.Vector3, color: number, radius: number) {
    this.group.position.set(position.x, .075, position.z);
    this.ring.material.color.setHex(color);
    this.radius = radius;
    this.age = 0;
  }

  reset() {
    this.age = 1;
    this.group.visible = false;
  }

  update(dt: number, reducedMotion: boolean) {
    this.age += dt / this.duration;
    this.group.visible = this.age < 1;
    if (!this.group.visible) return;

    const fade = (1 - this.age) ** 2;
    const expansion = 1 - (1 - this.age) ** 3;
    this.ring.scale.setScalar(this.radius * (reducedMotion ? 1 : .12 + .92 * expansion));
    this.rim.scale.setScalar(this.ring.scale.x * .96);
    this.ring.material.opacity = .5 * fade;
    this.rim.material.opacity = .84 * fade;
  }
}

interface Particle {
  origin: T.Vector3;
  velocity: T.Vector3;
  color: T.Color;
  size: number;
  age: number;
}

export class CombatEffects {
  readonly group = new T.Group();
  readonly cameraOffset = new T.Vector3();
  private readonly wave = new GroundRipple(WAVE_DURATION);
  private readonly echo = new GroundRipple(.58);
  private readonly impactRing = new GroundRipple(.34);
  private readonly slash = new T.Group();
  private readonly swipe = glow(new T.RingGeometry(.92, 1.84, 32, 2, -Math.PI * .86, Math.PI * .72), 0xffa44f);
  private readonly bladeEdge = glow(new T.RingGeometry(1.75, 1.85, 32, 1, -Math.PI * .86, Math.PI * .72), 0xffe5ac);
  private readonly charge = glow(new T.RingGeometry(.96, 1, 48), 0xffb47b);
  private readonly chargeRim = glow(new T.RingGeometry(.91, 1, 24, 1, 0, Math.PI * .27), 0xffb47b);
  private readonly trail = glow(new T.ShapeGeometry(new T.Shape()
    .moveTo(0, .5).lineTo(.5, -.38).lineTo(0, -.5).lineTo(-.5, -.38)), 0x99e7df);
  private readonly trailStart = new T.Vector3();
  private trailLife = 0;
  private readonly activeParticles: Particle[] = [];
  private readonly sparks = new T.InstancedMesh(
    new T.OctahedronGeometry(1),
    new T.MeshBasicMaterial({ toneMapped: false }),
    PARTICLE_LIMIT,
  );
  private readonly transform = new T.Object3D();
  private shakeStrength = 0;
  private shakeTime = 0;

  constructor(private readonly reducedMotion: boolean) {
    this.swipe.rotation.x = this.bladeEdge.rotation.x = -Math.PI / 2;
    this.bladeEdge.position.y = .015;
    this.slash.add(this.swipe, this.bladeEdge);
    this.charge.rotation.x = this.chargeRim.rotation.x = this.trail.rotation.x = -Math.PI / 2;
    this.sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.sparks.frustumCulled = false;
    this.group.add(
      this.wave.group, this.echo.group, this.impactRing.group,
      this.slash, this.charge, this.chargeRim, this.trail, this.sparks,
    );
    this.reset();
  }

  reset(): void {
    this.wave.reset();
    this.echo.reset();
    this.impactRing.reset();
    this.slash.visible = this.charge.visible = this.chargeRim.visible = this.trail.visible = false;
    this.activeParticles.length = 0;
    this.sparks.count = 0;
    this.trailLife = 0;
    this.shakeStrength = this.shakeTime = 0;
    this.cameraOffset.set(0, 0, 0);
  }

  sword(position: T.Vector3, facing: T.Vector3, progress: number, connects: boolean): void {
    this.slash.visible = progress > 0 && progress < 1;
    if (!this.slash.visible) return;

    const sweep = this.reducedMotion ? 0 : T.MathUtils.lerp(-.85, .65, progress);
    this.slash.position.set(position.x, .78, position.z);
    this.slash.rotation.y = Math.atan2(facing.x, facing.z) + sweep;
    const fade = 1 - T.MathUtils.smoothstep(progress, .32, 1);
    this.swipe.material.opacity = fade * (connects ? .65 : .38);
    this.bladeEdge.material.opacity = fade * .86;
  }

  beginDodge(position: T.Vector3): void {
    this.trailLife = DODGE_TRAIL_DURATION;
    this.trailStart.copy(position);
  }

  dodge(position: T.Vector3): void {
    const x = position.x - this.trailStart.x;
    const z = position.z - this.trailStart.z;
    const length = Math.hypot(x, z);
    this.trail.visible = !this.reducedMotion && this.trailLife > 0 && length > .08;
    if (!this.trail.visible) return;

    this.trail.position.copy(this.trailStart).lerp(position, .5).y = .09;
    this.trail.rotation.set(-Math.PI / 2, Math.atan2(x, z), 0, 'YXZ');
    const fade = this.trailLife / DODGE_TRAIL_DURATION;
    this.trail.scale.set(.28 + fade * .6, length, 1);
    this.trail.material.opacity = fade * .78;
  }

  telegraph(position: T.Vector3, radius: number, progress: number, watcher: boolean): void {
    this.charge.visible = progress >= 0;
    this.chargeRim.visible = this.charge.visible && !this.reducedMotion;
    if (!this.charge.visible) return;

    this.charge.position.set(position.x, .061, position.z);
    this.charge.scale.setScalar(radius);
    this.charge.material.color.setHex(0xff8074);
    this.charge.material.opacity = .65 + progress * .25;
    this.chargeRim.position.copy(this.charge.position).y = .069;
    this.chargeRim.scale.setScalar(radius * (1.16 - progress * .2));
    this.chargeRim.rotation.set(-Math.PI / 2, progress * (watcher ? -5.6 : 3), 0, 'YXZ');
    this.chargeRim.material.color.setHex(watcher ? 0xc38aff : 0xffb47b);
    this.chargeRim.material.opacity = .52 + progress * .4;
  }

  burst(position: T.Vector3, color: number, strength = 1): void {
    if (this.reducedMotion) return;

    const tint = new T.Color(color);
    const count = Math.round(14 * strength);
    const excess = this.activeParticles.length + count - PARTICLE_LIMIT;
    if (excess > 0) this.activeParticles.splice(0, excess);
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996;
      const speed = (2.4 + index % 5 * .95) * strength;
      this.activeParticles.push({
        origin: position.clone(),
        velocity: new T.Vector3(Math.cos(angle) * speed, (1.3 + index % 4 * .7) * strength, Math.sin(angle) * speed),
        color: index % 4 === 0 ? new T.Color(0xfff0d5) : tint,
        size: .05 + index % 4 * .028,
        age: 0,
      });
    }
  }

  impact(position: T.Vector3, color: number, strength: number): void {
    this.burst(position, color, strength);
    this.impactRing.play(position, color, 1.1 * strength);
    this.shake(strength * .09);
  }

  slam(position: T.Vector3, radius: number, watcher: boolean): void {
    const tint = watcher ? 0xb77dff : 0xff894e;
    this.wave.play(position, tint, radius);
    if (this.reducedMotion) return;

    this.echo.play(position, tint, radius * 1.25);
    this.burst(position, tint, 1.55);
    this.shake(.17);
  }

  private shake(strength: number) {
    if (this.reducedMotion) return;
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeTime = 0;
  }

  update(dt: number): void {
    this.trailLife = Math.max(0, this.trailLife - dt);
    this.wave.update(dt, this.reducedMotion);
    this.echo.update(dt, this.reducedMotion);
    this.impactRing.update(dt, this.reducedMotion);

    const particles = this.activeParticles;
    let visible = 0;
    for (const particle of particles) {
      particle.age += dt;
      const progress = particle.age / BURST_DURATION;
      if (progress >= 1) continue;

      const origin = this.transform.position.copy(particle.origin);
      origin.addScaledVector(particle.velocity, particle.age);
      origin.y = Math.max(.1, origin.y - 7 * particle.age ** 2);
      this.transform.rotation.set(particle.age * 9, visible, particle.age * 13);
      this.transform.scale.set(particle.size * (1 - progress), particle.size * (2 - progress), particle.size * (1 - progress));
      this.transform.updateMatrix();
      this.sparks.setMatrixAt(visible, this.transform.matrix);
      this.sparks.setColorAt(visible, particle.color);
      particles[visible++] = particle;
    }
    particles.length = this.sparks.count = visible;
    if (visible > 0) {
      this.sparks.instanceMatrix.needsUpdate = true;
      if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
    }

    this.shakeTime += dt;
    this.shakeStrength = Math.max(0, this.shakeStrength - dt * .64);
    this.cameraOffset.set(
      Math.sin(this.shakeTime * 68) * this.shakeStrength,
      Math.sin(this.shakeTime * 91) * this.shakeStrength * .48,
      0,
    );
  }
}

export class BrasaLight {
  readonly group = new T.Group();
  private readonly beam = glow(new T.CylinderGeometry(.035, .065, 1, 8), 0xfff4ce);
  private readonly sheath = glow(new T.CylinderGeometry(.10, .15, 1, 8), 0xffab53);
  private readonly spark = glow(new T.OctahedronGeometry(.19), 0xfff0bb);
  private readonly motes = Array.from({ length: 6 }, () => glow(new T.OctahedronGeometry(.055), 0xffd07d));
  private readonly halo = new T.PointLight(0xffa73d, 2.8, 3);
  private readonly axis = new T.Vector3(0, 1, 0);
  private readonly direction = new T.Vector3();
  private readonly cross = new T.Vector3();
  private readonly up = new T.Vector3();
  private readonly origin = new T.Vector3();
  private readonly tip = new T.Vector3();

  constructor() {
    this.group.add(this.beam, this.sheath, this.spark, this.halo, ...this.motes);
    this.group.visible = false;
  }

  update(pet: T.Object3D, target: T.Vector3, remaining: number, reducedMotion: boolean): void {
    this.group.visible = pet.visible && remaining > 0;
    if (!this.group.visible) return;

    this.origin.set(0, .08, .37).applyAxisAngle(this.axis, pet.rotation.y).add(pet.position);
    const age = 1 - remaining / LIGHT_DURATION;
    const progress = reducedMotion ? 1 : Math.min(1, .18 + age * 3.4);
    const opacity = Math.min(1, remaining / .21);
    this.tip.lerpVectors(this.origin, target, progress);
    this.direction.subVectors(this.tip, this.origin);
    this.beam.position.copy(this.origin).lerp(this.tip, .5);
    this.beam.scale.set(1, Math.max(this.direction.length(), .001), 1);
    this.beam.quaternion.setFromUnitVectors(this.axis, this.direction.normalize());
    this.beam.material.opacity = .96 * opacity;
    this.sheath.position.copy(this.beam.position);
    this.sheath.quaternion.copy(this.beam.quaternion);
    this.sheath.scale.copy(this.beam.scale);
    this.sheath.material.opacity = .44 * opacity;
    this.spark.position.copy(this.tip);
    this.spark.scale.setScalar(.55 + opacity * .65);
    this.spark.material.opacity = opacity;
    this.halo.position.copy(this.tip);
    this.halo.intensity = opacity * 4;

    this.cross.crossVectors(this.direction, this.axis).normalize();
    this.up.crossVectors(this.cross, this.direction);
    this.motes.forEach((mote, index) => {
      mote.visible = !reducedMotion;
      if (!mote.visible) return;

      const distance = ((index + .5) / this.motes.length + age * 1.8) % 1;
      const angle = index * 2.39996 + age * 12;
      mote.position.lerpVectors(this.origin, this.tip, distance);
      mote.position.addScaledVector(this.cross, Math.cos(angle) * .19);
      mote.position.addScaledVector(this.up, Math.sin(angle) * .19);
      mote.material.opacity = opacity * Math.sin(Math.PI * distance);
    });
  }
}
