import * as T from 'three';
import { mesh } from '../world/sanctuary';

const SPARK_COUNT = 12;
const BURST_DURATION = .48;
const WAVE_DURATION = .36;
const LIGHT_DURATION = .45;
const LIGHT_FADE_DURATION = .18;

export class CombatEffects {
  readonly group = new T.Group();
  private readonly sparks = Array.from(
    { length: SPARK_COUNT },
    () => mesh(new T.OctahedronGeometry(.095), 0xffffff, true),
  );
  private readonly wave = mesh(new T.RingGeometry(.88, 1, 48), 0xff8459, true);
  private readonly origin = new T.Vector3();
  private burstAge = 1;
  private waveAge = 1;

  constructor(private readonly reducedMotion: boolean) {
    this.wave.rotation.x = -Math.PI / 2;
    Object.assign(this.wave.material, { transparent: true, depthWrite: false });
    this.group.add(this.wave, ...this.sparks);
    this.reset();
  }

  reset(): void {
    this.burstAge = this.waveAge = 1;
    this.wave.visible = false;
    for (const spark of this.sparks) spark.visible = false;
  }

  burst(position: T.Vector3, color: number): void {
    if (this.reducedMotion) return;

    this.origin.copy(position);
    this.burstAge = 0;
    for (const spark of this.sparks) spark.material.color.setHex(color);
  }

  slam(position: T.Vector3): void {
    this.wave.position.set(position.x, .06, position.z);
    this.waveAge = 0;
  }

  update(deltaTime: number, strikeRadius: number): void {
    this.waveAge += deltaTime / WAVE_DURATION;
    this.wave.visible = this.waveAge < 1;
    if (this.wave.visible) {
      this.wave.scale.setScalar(strikeRadius * (this.reducedMotion ? 1 : Math.max(.05, this.waveAge)));
      this.wave.material.opacity = 1 - this.waveAge;
    }

    this.burstAge += deltaTime / BURST_DURATION;
    for (const [index, spark] of this.sparks.entries()) {
      spark.visible = this.burstAge < 1;
      if (!spark.visible) continue;

      const angle = index * Math.PI * 2 / this.sparks.length;
      const progress = this.burstAge;
      const radius = progress * (1 + (index % 3) * .3);
      spark.position.set(this.origin.x + Math.cos(angle) * radius,
        this.origin.y + 1.2 + Math.sin(progress * Math.PI) * .65,
        this.origin.z + Math.sin(angle) * radius);
      spark.scale.setScalar(1 - progress);
    }
  }
}

export class BrasaLight {
  readonly group = new T.Group();
  private readonly beam = mesh(new T.CylinderGeometry(.035, .035, 1, 8), 0xffbe68, true);
  private readonly spark = mesh(new T.OctahedronGeometry(.125), 0xffe9af, true);
  private readonly halo = new T.PointLight(0xffa73d, 2.8, 3);
  private readonly axis = new T.Vector3(0, 1, 0);
  private readonly direction = new T.Vector3();
  private readonly origin = new T.Vector3();
  private readonly destination = new T.Vector3();
  private readonly tip = new T.Vector3();

  constructor() {
    this.group.add(this.beam, this.spark, this.halo);
    Object.assign(this.beam.material, { transparent: true, depthWrite: false });
    this.group.visible = false;
  }

  update(
    pet: T.Object3D,
    target: T.Vector3,
    remaining: number,
    reducedMotion: boolean,
  ): void {
    this.group.visible = pet.visible && remaining > 0;
    if (!this.group.visible) return;

    this.origin.set(0, .08, .37).applyAxisAngle(this.axis, pet.rotation.y).add(pet.position);
    this.destination.copy(target);
    const progress = reducedMotion
      ? 1
      : Math.min(1, (1 - remaining / LIGHT_DURATION) * 2.1);
    this.tip.lerpVectors(this.origin, this.destination, progress);
    this.direction.subVectors(this.tip, this.origin);
    this.beam.position.copy(this.origin).lerp(this.tip, .5);
    this.beam.scale.y = Math.max(this.direction.length(), .001);
    this.beam.quaternion.setFromUnitVectors(this.axis, this.direction.normalize());
    this.beam.material.opacity = .82 * Math.min(1, remaining / LIGHT_FADE_DURATION);
    this.spark.position.copy(this.tip);
    this.halo.position.copy(this.tip);
    this.halo.intensity = remaining * 6;
  }
}
