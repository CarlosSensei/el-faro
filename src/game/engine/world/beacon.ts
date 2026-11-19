import * as T from 'three';
import { mesh } from './sanctuary';

export function buildBeacon(position: { x: number; z: number }, stoneTexture: T.Texture) {
  const model = new T.Group();
  model.position.set(position.x, 0, position.z);
  const target = new T.Vector3(position.x, 2.08, position.z);

  const plinth = mesh(new T.CylinderGeometry(.7, .88, .2, 8), 0xb3b5a1);
  plinth.position.y = .1;
  const pillar = mesh(new T.CylinderGeometry(.31, .5, 1.28, 8), 0x77918c);
  pillar.position.y = .84;
  for (const stone of [plinth, pillar]) {
    if (stone.material instanceof T.MeshStandardMaterial) stone.material.map = stoneTexture;
  }

  const collar = mesh(new T.CylinderGeometry(.54, .35, .24, 8), 0xc69552);
  collar.position.y = 1.48;
  const crown = mesh(new T.CylinderGeometry(.52, .52, .10, 8), 0x496c6a);
  crown.position.y = 1.64;
  model.add(plinth, pillar, collar, crown);

  const gold = new T.MeshBasicMaterial({ color: 0xe7bd7a });
  const runes = new T.MeshBasicMaterial({ color: 0x8db8b1 });
  const bezelGeometry = new T.TorusGeometry(.54, .062, 5, 4);
  const inlayGeometry = new T.BoxGeometry(.055, .39, .022);
  const sealGeometry = new T.TorusGeometry(.13, .025, 5, 4);
  for (const angle of [0, Math.PI / 2]) {
    const frame = new T.Mesh(bezelGeometry, gold);
    frame.position.y = target.y;
    frame.rotation.y = angle;
    model.add(frame);
  }

  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI / 2;
    const face = new T.Group();
    face.rotation.y = angle;
    const line = new T.Mesh(inlayGeometry, runes);
    line.position.set(0, .94, .414);
    const seal = new T.Mesh(sealGeometry, runes);
    seal.position.set(0, 1.19, .376);
    face.add(line, seal);
    model.add(face);
  }

  const ringMaterial = new T.MeshBasicMaterial({ color: 0xe0be8a, transparent: true, opacity: .75 });
  const ring = new T.Mesh(new T.RingGeometry(1.24, 1.285, 48), ringMaterial);
  ring.position.y = .026;
  ring.rotation.x = -Math.PI / 2;
  model.add(ring);

  const tickGeometry = new T.PlaneGeometry(.08, .17);
  for (let index = 0; index < 8; index++) {
    const angle = index * Math.PI / 4;
    const tick = new T.Mesh(tickGeometry, ringMaterial);
    tick.position.set(Math.sin(angle) * 1.12, .027, Math.cos(angle) * 1.12);
    tick.rotation.set(-Math.PI / 2, angle, 0, 'YXZ');
    model.add(tick);
  }

  const crystalMaterial = new T.MeshStandardMaterial({
    color: 0x86adae,
    emissive: 0x456c69,
    emissiveIntensity: .5,
    flatShading: true,
  });
  const crystal = new T.Mesh(new T.OctahedronGeometry(.32), crystalMaterial);
  crystal.position.y = target.y;
  crystal.scale.set(.72, 1.22, .72);
  model.add(crystal);

  const light = new T.PointLight(0x86ffdc, 10, 5);
  light.position.y = 1.8;
  light.visible = false;
  model.add(light);

  return {
    model,
    target,
    setLit(lit: boolean) {
      crystalMaterial.color.setHex(lit ? 0xa4ffde : 0x86adae);
      crystalMaterial.emissive.setHex(lit ? 0x70efc7 : 0x456c69);
      crystalMaterial.emissiveIntensity = lit ? 1.45 : .5;
      gold.color.setHex(lit ? 0xbbffe5 : 0xe7bd7a);
      runes.color.setHex(lit ? 0x95f6d2 : 0x8db8b1);
      ringMaterial.color.setHex(lit ? 0x8cf7d2 : 0xe0be8a);
      light.visible = lit;
    },
    update(time: number) {
      crystal.position.y = target.y + Math.sin(time * 2.2) * .08;
      crystal.rotation.y = time * .65;
    },
  };
}
