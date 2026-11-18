import * as T from 'three';
import { GameSound } from './audio/game-sound';
import { moveOnGround } from './combat/collision';
import { BrasaLight, CombatEffects } from './combat/effects';
import { makeApprentice, makeBrasa, makeGolem } from './entities/characters';
import type { Battle, BattleAction, BattleCue, Journey, JourneyArea } from '../game.types';
import {
  BATTLE_CENTER_Z,
  BEACON_POSITION,
  buildPrologue,
  GUIDE_POSITION,
  ISLAND_RADIUS,
  LIGHTHOUSE_POSITION,
  SPAWN_Z,
} from './world/prologue';
import { buildSanctuary, mesh } from './world/sanctuary';

const STRIKE_RADIUS = 2.65;
const SWORD_RANGE = 3.35;
const LIGHT_RANGE = 4.5;
const CHARGE_TIME = 1.5;
const DASH_TIME = .3;
const ARENA_RADIUS = 7.2;
const CONTROLS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
  'KeyJ',
  'KeyE',
  'Space',
]);

export class Arena {
  private readonly renderer = new T.WebGLRenderer({ antialias: true });
  private readonly scene = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-10, 10, 8, -8, 0.1, 90);
  private readonly apprentice = makeApprentice();
  private readonly hero = this.apprentice.model;
  private readonly cameraAnchor = new T.Vector3();
  private readonly golem = makeGolem();
  private readonly guardian = this.golem.model;
  private readonly brasa = makeBrasa();
  private readonly pet = this.brasa.body;
  private readonly brasaLight = new BrasaLight();
  private readonly lightTarget = new T.Vector3();
  private readonly petHeading = new T.Vector3();
  private readonly sword = new T.Group();
  private readonly warning = mesh(new T.CircleGeometry(STRIKE_RADIUS, 48), 0xfa4a45, true);
  private readonly chargeFill = mesh(new T.CircleGeometry(STRIKE_RADIUS, 48), 0xff664f, true);
  private readonly reach = mesh(new T.RingGeometry(.96, 1, 48), 0xffda89, true);
  private readonly flash = mesh(new T.RingGeometry(.82, 1, 48), 0xffd588, true);
  private readonly sanctuary = buildSanctuary(this.scene, ISLAND_RADIUS, BATTLE_CENTER_Z);
  private readonly prologue = buildPrologue();
  private readonly obstacles = [...this.prologue.obstacles, ...this.sanctuary.obstacles];
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly effects = new CombatEffects(this.reducedMotion);
  private readonly sound = new GameSound();
  private readonly guardianArms = ['leftArm', 'rightArm'].map(name => this.guardian.getObjectByName(name)!);
  private walking = false;
  private walkPhase = 0;
  private readonly keys = new Set<string>();
  private readonly facing = new T.Vector3(0, 0, -1);
  private readonly dashDirection = new T.Vector3();
  private readonly movement = new T.Vector3();
  private readonly observer: ResizeObserver;
  private frame = 0;
  private previousTime = 0;
  private time = 0;
  private guard: BattleCue = 'waiting';
  private countdown = 2;
  private dash = 0;
  private dashCooldown = 0;
  private dodgeGrace = 0;
  private firstAttack = true;
  private strike = 0;
  private pulse = 0;
  private hurt = 0;
  private state: Battle = {
    phase: 'ready',
    health: 5,
    boss: 3,
    hint: '',
    action: '',
    cue: 'waiting',
  };

  private journey: Journey | null = null;
  private spokeToGuide = false;
  private litBeacon = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly publish: (battle: Battle) => void,
    private readonly publishJourney: (journey: Journey | null) => void,
  ) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    host.append(this.renderer.domElement);

    this.sword.position.set(.42, .65, .15);
    const blade = mesh(new T.BoxGeometry(.1, .75, .065), 0xf5e4bb);
    blade.position.y = .4;
    this.sword.add(blade, mesh(new T.BoxGeometry(.29, .07, .13), 0xe7a852));
    this.hero.add(this.sword);

    for (const indicator of [this.warning, this.chargeFill, this.reach, this.flash]) {
      indicator.rotation.x = -Math.PI / 2;
    }

    Object.assign(this.warning.material, { transparent: true, opacity: .33, depthWrite: false });
    Object.assign(this.chargeFill.material, { transparent: true, opacity: .5, depthWrite: false });
    this.warning.renderOrder = 1;
    this.chargeFill.renderOrder = 2;
    this.scene.add(this.hero, this.guardian, this.pet, this.warning, this.chargeFill, this.reach, this.flash);
    this.scene.add(this.prologue.scenery, this.effects.group, this.brasaLight.group);

    this.resetPositions();
    this.updateCamera(0, true);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clearKeys);
    this.frame = requestAnimationFrame(this.tick);
  }

  setAudio(enabled: boolean) {
    return this.sound.setEnabled(enabled);
  }

  beginJourney() {
    this.spokeToGuide = this.litBeacon = false;
    this.resetJourney();
  }

  continueDialogue() {
    if (this.journey?.dialogue !== true) return;
    this.spokeToGuide = true;
    this.pet.visible = this.sword.visible = true;
    this.keys.clear();
    this.journey = { ...this.journey, dialogue: false };
    this.updateObjective();
  }

  private resetJourney() {
    this.resetPositions(SPAWN_Z);
    this.keys.clear();
    this.dash = 0;
    this.dashCooldown = 0;
    this.dodgeGrace = 0;
    this.strike = 0;
    this.pulse = 0;
    this.hurt = 0;
    this.guard = 'waiting';
    this.guardian.visible = this.pet.visible = this.sword.visible = false;
    this.sanctuary.flameLight.visible = false;
    this.prologue.lamp.material.color.setHex(0x7b867c);
    this.journey = { area: 'village', objective: '', action: '', dialogue: false };
    this.updateCamera(0, true);
    this.updateObjective();
  }

  private near(point: { x: number; z: number }, range = 1.8) {
    return Math.hypot(this.hero.position.x - point.x, this.hero.position.z - point.z) <= range;
  }

  private updateObjective() {
    const journey = this.journey;
    if (!journey || journey.dialogue) return;

    let objective: string;
    let action: Journey['action'] = '';
    const { x, z } = this.hero.position;
    const area = this.currentJourneyArea(x, z);

    if (!this.spokeToGuide) {
      objective = 'Explora la isla. Habla con Mara en la aldea del sur para recoger la espada.';
      if (this.near(GUIDE_POSITION)) action = 'F';
    } else if (!this.litBeacon && this.near(BEACON_POSITION, 2.4)) {
      objective = 'Prueba la luz de Brasa en el sello del sendero.';
      action = 'E';
    } else {
      objective = 'Explora la isla o sigue el camino al faro, al norte.';
      if (this.near(LIGHTHOUSE_POSITION, 2.1)) {
        objective = 'Despierta al Gólem de Ceniza cuando estés listo.';
        action = 'F';
      }
    }

    if (area === journey.area && objective === journey.objective && action === journey.action) return;
    this.journey = { ...journey, area, objective, action };
    this.publishJourney(this.journey);
  }

  private currentJourneyArea(x: number, z: number): JourneyArea {
    if (Math.abs(x) > 9) return 'coast';
    if (z > 6) return 'village';
    if (z < -6) return 'lighthouse';
    return 'trail';
  }

  private exploreAction(code: string) {
    const journey = this.journey;
    if (!journey || journey.dialogue) return;

    if (code === 'KeyE' && journey.action === 'E') {
      this.litBeacon = true;
      this.pulse = .45;
      this.lightTarget.copy(this.prologue.lamp.position);
      this.sound.play('light');
      this.effects.burst(this.prologue.lamp.position, 0x8bf5d6);
      this.prologue.lamp.material.color.setHex(0x91ffcb);
      this.updateObjective();
      return;
    }

    if (code !== 'KeyF' || journey.action !== 'F') return;
    if (this.spokeToGuide) {
      this.start(true);
      return;
    }

    this.keys.clear();
    this.journey = { ...journey, dialogue: true };
    this.publishJourney(this.journey);
  }

  start(keepPosition = false) {
    const entryPosition = keepPosition ? this.hero.position.clone() : undefined;
    if (this.journey) {
      this.journey = null;
      this.publishJourney(null);
    }
    this.pet.visible = this.sword.visible = true;
    this.sanctuary.flameLight.visible = false;
    this.resetPositions();
    if (entryPosition) {
      this.hero.position.copy(entryPosition);
      this.pet.position.set(entryPosition.x - .75, .6, entryPosition.z + .4);
    }
    this.updateCamera(0, !entryPosition);
    this.keys.clear();
    this.dash = 0;
    this.dashCooldown = 0;
    this.dodgeGrace = 0;
    this.strike = 0;
    this.pulse = 0;
    this.hurt = 0;
    this.guard = 'waiting';
    this.firstAttack = true;
    this.countdown = 1.1;
    this.state = {
      phase: 'playing',
      health: 5,
      boss: 3,
      hint: '',
      action: '',
      cue: 'waiting',
    };
    this.publishCue();
  }

  private resetPositions(spawnZ = BATTLE_CENTER_Z + 4) {
    this.effects.reset();
    this.walkPhase = 0;
    this.walking = false;
    this.hero.position.set(0, 0, spawnZ);
    this.hero.rotation.y = Math.PI;
    this.guardian.position.set(0, 0, BATTLE_CENTER_Z - 2.6);
    this.guardian.rotation.y = 0;
    this.guardian.visible = true;
    this.pet.position.set(-.75, .6, spawnZ + .4);
    this.facing.set(0, 0, -1);
    this.warning.visible = false;
    this.chargeFill.visible = false;
    this.reach.visible = false;
    this.flash.visible = false;
  }

  private updateCamera(dt: number, snap = false) {
    const targetX = this.journey ? this.hero.position.x : 0;
    const targetZ = this.journey ? this.hero.position.z : BATTLE_CENTER_Z;
    const interpolation = snap || this.reducedMotion ? 1 : 1 - Math.exp(-6 * dt);
    this.cameraAnchor.x = T.MathUtils.lerp(this.cameraAnchor.x, targetX, interpolation);
    this.cameraAnchor.z = T.MathUtils.lerp(this.cameraAnchor.z, targetZ, interpolation);
    this.camera.position.set(this.cameraAnchor.x, 15, 17 + this.cameraAnchor.z);
    this.camera.lookAt(this.cameraAnchor);
  }

  private resize = () => {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    const aspect = width / height;
    const viewSize = Math.max(7.4, 8.6 / aspect);
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private keyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;

    if (this.journey) {
      if (this.journey.dialogue || (!CONTROLS.has(event.code) && event.code !== 'KeyF')) return;
      event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat) {
        this.exploreAction(event.code);
      }
      return;
    }

    if (this.state.phase !== 'playing' || !CONTROLS.has(event.code)) return;
    event.preventDefault();
    this.keys.add(event.code);
    if (event.repeat) return;

    if (event.code === 'Space' && this.dashCooldown <= 0) {
      this.readMovement();
      this.dashDirection.copy(this.movement);
      if (!this.dashDirection.lengthSq()) {
        const retreatDirection = this.guard === 'charging'
          ? this.hero.position.clone().sub(this.guardian.position).normalize()
          : this.facing;
        this.dashDirection.copy(retreatDirection);
      }
      this.dash = DASH_TIME;
      this.dodgeGrace = .48;
      this.dashCooldown = .65;
      this.sound.play('dodge');
    }
    if (event.code === 'KeyJ' && this.strike <= 0) this.attackWithSword();
    if (event.code === 'KeyE' && this.pulse <= 0) this.castBrasaLight();
  };

  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private clearKeys = () => {
    this.keys.clear();
  };

  private readMovement() {
    const isPressed = (key: string, arrow: string) => Number(this.keys.has(key) || this.keys.has(arrow));
    const horizontal = isPressed('KeyD', 'ArrowRight') - isPressed('KeyA', 'ArrowLeft');
    const vertical = isPressed('KeyS', 'ArrowDown') - isPressed('KeyW', 'ArrowUp');
    this.movement.set(horizontal, 0, vertical).normalize();
  }

  private closeToGuardian(range: number) {
    return this.hero.position.distanceTo(this.guardian.position) <= range;
  }

  private attackWithSword() {
    this.strike = .32;

    if (this.guard !== 'recovering' || !this.closeToGuardian(SWORD_RANGE)) {
      this.sound.play('sword');
      return;
    }
    this.sound.play('armor');
    this.effects.burst(this.guardian.position, 0xffd58b);
    const target = this.guardian.position.clone().sub(this.hero.position);
    this.hero.rotation.y = Math.atan2(target.x, target.z);
    this.facing.copy(target.normalize());
    this.guard = 'open';
    this.countdown = this.state.boss === 3 ? Infinity : 6;
    this.publishCue();
  }

  private castBrasaLight() {
    this.pulse = .45;
    this.lightTarget.copy(this.guardian.position).y = 1.37;

    if (!this.closeToGuardian(LIGHT_RANGE)) {
      this.lightTarget.copy(this.hero.position).addScaledVector(this.facing, 2.3).y = .7;
    }

    this.sound.play('light');
    if (this.guard !== 'open' || !this.closeToGuardian(LIGHT_RANGE)) return;

    this.effects.burst(this.guardian.position, 0x8bf5d6);
    this.state = { ...this.state, boss: this.state.boss - 1 };
    if (this.state.boss === 0) {
      this.guardian.visible = false;
      this.sanctuary.flameLight.visible = true;
      this.sound.play('victory');
      this.finish('won');
      return;
    }
    this.guard = 'waiting';
    this.countdown = 1.15;
    this.publishCue();
  }

  private publishCue() {
    let action: BattleAction = '';
    let hint = '';

    switch (this.guard) {
      case 'waiting':
        hint = this.firstAttack
          ? 'El guardián se acerca. Su primer ataque es de práctica.'
          : 'Prepárate para el siguiente ataque.';
        break;
      case 'charging':
        action = 'Espacio';
        hint = 'Sal del círculo rojo. Pulsa Espacio sin dirección para alejarte.';
        break;
      case 'recovering':
        if (this.closeToGuardian(SWORD_RANGE)) {
          action = 'J';
          hint = 'Golpea ahora para abrir la coraza.';
        } else {
          hint = 'Entra en el círculo dorado para alcanzar al guardián con la espada.';
        }
        break;
      case 'open':
        if (this.closeToGuardian(LIGHT_RANGE)) {
          action = 'E';
          hint = 'Coraza abierta. Lanza la luz de la salamandra.';
        } else {
          hint = 'Entra en el círculo turquesa para lanzar la luz.';
        }
        break;
    }

    const cueIsUnchanged = hint === this.state.hint
      && action === this.state.action
      && this.guard === this.state.cue;
    if (cueIsUnchanged) return;

    this.state = { ...this.state, hint, action, cue: this.guard };
    this.publish(this.state);
  }

  private finish(phase: 'won' | 'lost') {
    this.state = { ...this.state, phase };
    this.warning.visible = false;
    this.keys.clear();
    this.publish(this.state);
  }

  private tick = (now: number) => {
    const deltaTime = Math.min((now - (this.previousTime || now)) / 1000, .04);
    this.previousTime = now;
    this.time += deltaTime;
    this.walking = false;

    if (this.journey) {
      if (!this.journey.dialogue) {
        this.moveHero(deltaTime);
        this.updateObjective();
      }
    } else if (this.state.phase === 'playing') {
      this.updateBattle(deltaTime);
    }

    this.updateCamera(deltaTime);
    this.updateVisuals(deltaTime);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private moveHero(dt: number) {
    this.readMovement();
    const direction = this.dash > 0 ? this.dashDirection : this.movement;
    const distance = (this.dash > 0 ? 12.5 : 4.5) * dt;
    const movementRadius = this.journey ? ISLAND_RADIUS : ARENA_RADIUS;
    const movementCenter = this.journey ? 0 : BATTLE_CENTER_Z;

    moveOnGround(
      this.hero.position,
      direction.x * distance,
      direction.z * distance,
      movementRadius,
      this.obstacles,
      movementCenter,
    );
    this.walking = direction.lengthSq() > 0;

    if (this.walking) {
      this.facing.copy(direction);
      this.hero.rotation.y = Math.atan2(direction.x, direction.z);
    }
  }

  private updateBattle(dt: number) {
    this.moveHero(dt);
    this.dashCooldown -= dt;
    this.countdown -= dt;
    this.updateGuardian(dt);
    this.dash -= dt;
    this.dodgeGrace -= dt;
    if (this.state.phase === 'playing') {
      this.publishCue();
    }
  }

  private updateGuardian(dt: number) {
    const towardHero = this.movement.copy(this.hero.position).sub(this.guardian.position);

    if (this.guard === 'waiting') {
      this.guardian.rotation.y = Math.atan2(towardHero.x, towardHero.z);
      if (towardHero.length() > 1.65) {
        this.guardian.position.addScaledVector(towardHero.normalize(), 2.65 * dt);
      }

      if (this.countdown <= 0 && this.closeToGuardian(2.75)) {
        this.guard = 'charging';
        this.countdown = CHARGE_TIME;
        this.sound.play('charge');
      }
    } else if (this.guard === 'charging' && this.countdown <= 0) {
      this.sound.play('slam');
      this.effects.slam(this.guardian.position);

      if (!this.firstAttack && this.closeToGuardian(STRIKE_RADIUS) && this.dodgeGrace <= 0) {
        this.hurt = .3;
        this.effects.burst(this.hero.position, 0xff895f);
        this.state = { ...this.state, health: this.state.health - 1 };
        if (this.state.health === 0) {
          this.finish('lost');
          return;
        }
      }

      this.guard = 'recovering';
      this.countdown = this.firstAttack ? Infinity : 5;
      this.firstAttack = false;
    } else if ((this.guard === 'recovering' || this.guard === 'open') && this.countdown <= 0) {
      this.guard = 'waiting';
      this.countdown = .55;
    }

    const separation = towardHero.copy(this.hero.position).sub(this.guardian.position);
    const distance = separation.length();
    if (distance < 1.25) {
      if (distance < .001) separation.copy(this.facing).negate();
      separation.normalize().multiplyScalar(1.25 - distance);
      moveOnGround(
        this.hero.position,
        separation.x,
        separation.z,
        ARENA_RADIUS,
        this.obstacles,
        BATTLE_CENTER_Z,
      );
    }
  }

  private updateVisuals(dt: number) {
    this.strike = Math.max(0, this.strike - dt);
    this.pulse = Math.max(0, this.pulse - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    const swing = this.strike > 0 ? Math.sin(Math.PI * this.strike / .32) : 0;
    this.sword.rotation.z = -.4 - swing * 2.2;

    const chargeProgress = this.guard === 'charging'
      ? T.MathUtils.clamp(1 - this.countdown / CHARGE_TIME, 0, 1)
      : 0;
    this.golem.core.scale.setScalar(this.guard === 'open' ? 1.75 : 1);
    this.golem.core.material.color.setHex(this.guard === 'open' ? 0x91ffcb : 0xff7935);

    this.guardianArms.forEach((arm, index) => {
      arm.position.y = .83 + chargeProgress * .53;
      const side = index === 0 ? -1 : 1;
      arm.position.x = side * (.45 + chargeProgress * .1);
      arm.rotation.z = side * chargeProgress * .46;
    });

    if (!this.reducedMotion) {
      if (this.walking) {
        this.walkPhase += dt * (this.dash > 0 ? 23 : 13);
      }

      const step = this.walking ? Math.sin(this.walkPhase) * .23 : 0;
      this.apprentice.feet.forEach((foot, index) => {
        foot.position.z = .015 + (index === 0 ? step : -step);
      });
      this.apprentice.scarf.rotation.z = Math.sin(this.time * 5) * (this.walking ? .16 : .045);
      const heroLean = this.dash > 0 ? .28 : -this.hurt * 1.1;
      this.hero.rotation.x = T.MathUtils.damp(this.hero.rotation.x, heroLean, 14, dt);
      const guardianHeight = this.guard === 'recovering' ? .89 : 1 + chargeProgress * .12;
      this.guardian.scale.y = 1.62 * guardianHeight;
    }

    this.effects.update(dt, STRIKE_RADIUS);
    this.pet.position.x = T.MathUtils.damp(this.pet.position.x, this.hero.position.x - .72, 8, dt);
    this.pet.position.z = T.MathUtils.damp(this.pet.position.z, this.hero.position.z + .5, 8, dt);
    this.pet.position.y = this.reducedMotion ? .55 : .55 + Math.sin(this.time * 5) * .14;
    this.petHeading.copy(this.pulse > 0 ? this.lightTarget : this.hero.position).sub(this.pet.position);
    this.pet.rotation.y = this.pulse > 0 || !this.reducedMotion
      ? Math.atan2(this.petHeading.x, this.petHeading.z) : this.hero.rotation.y;
    this.brasa.tail.rotation.y = this.reducedMotion ? 0 : Math.sin(this.time * 8) * .25;
    this.brasaLight.update(this.pet, this.lightTarget, this.pulse, this.reducedMotion);
    this.warning.visible = this.state.phase === 'playing' && this.guard === 'charging';
    this.warning.position.set(this.guardian.position.x, .045, this.guardian.position.z);
    this.chargeFill.visible = this.warning.visible;
    this.chargeFill.position.copy(this.warning.position);
    if (this.chargeFill.visible) {
      this.chargeFill.scale.setScalar(T.MathUtils.clamp(1 - this.countdown / CHARGE_TIME, .015, 1));
    }

    const open = this.guard === 'open';
    this.reach.visible = this.state.phase === 'playing' && (open || this.guard === 'recovering');
    this.reach.position.set(this.guardian.position.x, .05, this.guardian.position.z);
    this.reach.scale.setScalar(open ? LIGHT_RANGE : SWORD_RANGE);
    this.reach.material.color.setHex(open ? 0x8bf5d6 : 0xffda89);
    this.flash.visible = this.pulse > 0;
    this.flash.position.set(this.hero.position.x, .07, this.hero.position.z);
    const radius = Math.max(.05, LIGHT_RANGE * (1 - this.pulse / .45));
    this.flash.scale.setScalar(this.reducedMotion ? LIGHT_RANGE : radius);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.sound.dispose();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clearKeys);
    const textures = new Set<T.Texture>();
    this.scene.traverse(object => {
      if (object instanceof T.Mesh) {
        object.geometry.dispose();
        const materials: T.Material[] = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach(material => {
          if (
            (material instanceof T.MeshStandardMaterial || material instanceof T.MeshBasicMaterial)
            && material.map
          ) {
            textures.add(material.map);
          }
          material.dispose();
        });
      }
      if (object instanceof T.DirectionalLight) object.shadow.dispose();
    });
    textures.forEach(texture => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
