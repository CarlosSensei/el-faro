import * as T from 'three';
import { mesh } from '../world/sanctuary';

function part(
  parent: T.Group,
  geometry: T.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  unlit = false,
) {
  const object = mesh(geometry, color, unlit);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function ellipsoid(
  parent: T.Group,
  color: number,
  position: [number, number, number],
  dimensions: [number, number, number],
  unlit = false,
) {
  const object = part(parent, new T.SphereGeometry(1, 12, 8), color, ...position, unlit);
  object.scale.set(...dimensions);
  return object;
}

export function makeMara() {
  const mara = new T.Group();
  const skin = 0xcf9974;
  const hair = 0xdad1c3;
  const cloak = 0x406950;

  const dress = part(mara, new T.CylinderGeometry(.23, .46, .9, 10), 0x31443d, 0, .47, 0);
  dress.scale.z = .76;
  ellipsoid(mara, cloak, [0, 1.04, -.07], [.43, .29, .25]);
  const cape = part(
    mara,
    new T.ConeGeometry(.46, 1.04, 9, 1, true, .15, Math.PI * 1.15),
    cloak,
    0,
    .68,
    -.13,
  );
  cape.rotation.y = Math.PI * .49;
  cape.material.side = T.DoubleSide;
  ellipsoid(mara, skin, [0, 1.4, .02], [.215, .28, .193]);
  const hairline = part(
    mara,
    new T.SphereGeometry(.234, 14, 8, 0, Math.PI * 2, 0, Math.PI * .57),
    hair,
    0,
    1.49,
    -.045,
  );
  hairline.scale.set(1, 1.04, 1.04);
  ellipsoid(mara, skin, [0, 1.38, .208], [.046, .065, .05]);

  for (const side of [-1, 1]) {
    ellipsoid(mara, 0x543d36, [side * .084, 1.46, .191], [.029, .017, .012]);
    ellipsoid(mara, hair, [side * .118, 1.49, .176], [.056, .017, .017]).rotation.z = side * .18;
    ellipsoid(mara, cloak, [side * .34, .94, .055], [.115, .25, .125]).rotation.z = side * .28;
    ellipsoid(mara, skin, [side * .43, .74, .115], [.074, .092, .074]);
  }
  for (let index = 0; index < 7; index++) {
    const size = .097 - index * .005;
    ellipsoid(mara, index % 2 ? 0xb8b4b0 : hair,
      [-.21 + Math.sin(index * 1.6) * .025, 1.43 - index * .085, .1 + index * .018],
      [size, .09, size],
    ).rotation.z = index % 2 ? .25 : -.25;
  }

  part(mara, new T.TorusGeometry(.085, .017, 7, 12), 0xdca453, .13, 1.09, .22);
  part(mara, new T.OctahedronGeometry(.056), 0xffbc67, .13, 1.09, .23, true);
  part(mara, new T.CylinderGeometry(.247, .27, .085, 10), 0x8f6540, 0, .82, 0).scale.z = .82;
  part(mara, new T.CylinderGeometry(.031, .05, 1.64, 8), 0x795139, .49, .82, .16).rotation.z = -.075;
  part(mara, new T.OctahedronGeometry(.105), 0x9af1c8, .55, 1.64, .16, true);
  return mara;
}

export type VillagerRole = 'farmer' | 'fisher' | 'traveler';

export function makeVillager(role: VillagerRole, coat: number, skin: number) {
  const model = new T.Group();
  const leather = 0x523d34;
  const shirt = 0xc4a77d;
  const tunic = part(model, new T.CylinderGeometry(.22, .33, .64, 8), coat, 0, .8, 0);
  tunic.scale.z = .74;
  part(model, new T.CylinderGeometry(.28, .29, .075, 8), leather, 0, .72, 0).scale.z = .79;
  const head = ellipsoid(model, skin, [0, 1.31, .03], [.194, .227, .18]);
  ellipsoid(model, 0x43332d, [0, 1.41, -.027], [.196, .145, .18]);
  ellipsoid(model, skin, [0, 1.29, .2], [.043, .052, .043]);

  if (role === 'farmer') {
    part(model, new T.CylinderGeometry(.22, .32, .06, 10), 0xcfaa62, 0, 1.44, 0);
    part(model, new T.CylinderGeometry(.15, .23, .15, 10), 0xd3b477, 0, 1.54, 0);
    part(model, new T.BoxGeometry(.29, .41, .045), 0xe1caa3, 0, .79, .222);
  } else if (role === 'fisher') {
    ellipsoid(model, coat, [0, 1.45, -.01], [.218, .116, .194]);
    const rod = part(model, new T.CylinderGeometry(.018, .032, 1.63, 5), 0x835f39, .44, .88, .29);
    rod.rotation.x = .64;
    rod.rotation.z = -.27;
  } else {
    ellipsoid(model, 0x88583c, [0, 1.01, -.24], [.26, .27, .16]);
    part(model, new T.BoxGeometry(.06, .46, .05), leather, -.1, .92, .192).rotation.z = -.36;
    ellipsoid(model, shirt, [0, 1.11, .01], [.235, .063, .186]);
  }

  const arms: T.Group[] = [];
  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * .265, 1.035, 0);
    arm.rotation.z = side * .17;
    ellipsoid(arm, coat, [0, -.115, 0], [.094, .198, .092]);
    ellipsoid(arm, skin, [0, -.282, .026], [.067, .079, .065]);
    model.add(arm);
    arms.push(arm);

    const leg = new T.Group();
    leg.position.set(side * .135, .51, 0);
    part(leg, new T.CylinderGeometry(.097, .088, .38, 6), 0x48444a, 0, -.16, 0);
    ellipsoid(leg, leather, [0, -.42, .049], [.107, .087, .146]);
    model.add(leg);
    legs.push(leg);
  }
  model.traverse(part => { part.castShadow = false; });
  tunic.castShadow = head.castShadow = true;
  return { model, arms, legs };
}

export function makeBrasa() {
  const body = new T.Group();
  ellipsoid(body, 0xf87a2e, [0, .02, 0], [.19, .145, .32]);
  ellipsoid(body, 0xffbf67, [0, -.053, .018], [.161, .079, .27]);
  ellipsoid(body, 0xffa43e, [0, .065, .25], [.183, .143, .18]);
  ellipsoid(body, 0xffcb7c, [0, .021, .35], [.129, .078, .123]);

  for (const side of [-1, 1]) {
    ellipsoid(body, 0x311d1d, [side * .126, .123, .336], [.044, .049, .049]);
    ellipsoid(body, 0xffe8a9, [side * .145, .141, .367], [.015, .019, .017], true);
    for (const z of [-.17, .147]) {
      ellipsoid(body, 0xe7662a, [side * .153, -.06, z], [.115, .053, .067]).rotation.z = -side * .4;
      ellipsoid(body, 0xffb045, [side * .221, -.105, z + .037], [.066, .031, .08]);
    }
    for (let index = 0; index < 5; index++) {
      ellipsoid(body, 0xffe186, [side * .097, .131, .145 - .084 * index], [.027, .018, .03], true);
    }
  }
  const tail = new T.Group();
  tail.position.set(0, .004, -.24);
  const route = new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 0),
    new T.Vector3(.02, .004, -.14),
    new T.Vector3(.095, .02, -.28),
    new T.Vector3(.15, .11, -.43),
  ]);
  const tube = new T.TubeGeometry(route, 16, .09, 7);
  const points = tube.attributes.position;
  const center = new T.Vector3();
  for (let index = 0; index < points.count; index++) {
    const t = Math.floor(index / 8) / 16;
    route.getPointAt(t, center);
    const taper = 1 - t * .91;
    points.setXYZ(
      index,
      center.x + (points.getX(index) - center.x) * taper,
      center.y + (points.getY(index) - center.y) * taper,
      center.z + (points.getZ(index) - center.z) * taper,
    );
  }
  tube.computeVertexNormals();
  part(tail, tube, 0xf7782d, 0, 0, 0);
  body.add(tail, new T.PointLight(0xff942a, 3.5, 3.2));
  return { body, tail };
}

export function makeGolem() {
  const model = new T.Group();
  const stone = 0x5d5864;
  const strata = 0x77737d;
  const basalt = 0x3e3948;
  const ember = 0xff7935;
  const torso = part(model, new T.DodecahedronGeometry(.57), stone, 0, .88, -.02);
  torso.scale.set(1.04, 1.03, .7);
  part(model, new T.DodecahedronGeometry(.33), basalt, 0, 1.43, .018).scale.set(1.13, .79, .83);
  part(model, new T.DodecahedronGeometry(.275), strata, 0, 1.57, .022).scale.set(1.21, .5, .9);
  const core = part(model, new T.OctahedronGeometry(.17), ember, 0, .85, .392, true);
  core.name = 'core';
  const collar = part(model, new T.TorusGeometry(.21, .04, 5, 7), basalt, 0, .85, .372);
  collar.rotation.z = .38;

  for (const side of [-1, 1]) {
    part(model, new T.BoxGeometry(.118, .05, .035), 0xffbc63, side * .115, 1.447, .245, true).rotation.z = side * .16;
    part(model, new T.DodecahedronGeometry(.24), basalt, side * .235, .21, .02).scale.set(1, 1, 1.23);
    part(model, new T.DodecahedronGeometry(.258), strata, side * .27, .5, -.01).scale.set(.83, 1.2, .87);
    const shoulder = new T.Group();
    shoulder.name = side < 0 ? 'leftArm' : 'rightArm';
    shoulder.position.set(side * .45, .83, 0);
    part(shoulder, new T.DodecahedronGeometry(.315), strata, side * .1, .17, 0).rotation.z = side * .2;
    part(shoulder, new T.DodecahedronGeometry(.23), basalt, side * .27, -.076, .06).scale.set(1, 1.15, .83);
    part(shoulder, new T.DodecahedronGeometry(.225), stone, side * .32, -.29, .106).scale.set(1, 1.12, 1.15);
    part(shoulder, new T.BoxGeometry(.11, .031, .025), ember, side * .27, -.13, .23, true).rotation.z = side * .52;
    model.add(shoulder);

    const plate = part(model, new T.DodecahedronGeometry(.26), strata, side * .285, 1.017, .276);
    plate.scale.set(.93, 1.025, .32);
    plate.rotation.z = -side * .35;
    for (let index = 0; index < 3; index++) {
      const fissure = part(model, new T.BoxGeometry(.09, .021, .019), ember,
        side * (.13 + index * .067), .76 - index * .062, .365 - index * .017, true);
      fissure.rotation.z = -side * (index % 2 ? .2 : .82);
    }
  }
  model.scale.setScalar(1.62);
  return { model, core };
}

export function makeApprentice() {
  const model = new T.Group();
  const teal = 0x367970;
  const trim = 0xe3aa62;
  const leather = 0x654332;
  const skin = 0xc89068;
  const hair = 0x30252b;
  const tunic = part(model, new T.CylinderGeometry(.23, .34, .53, 9), teal, 0, .73, 0);
  tunic.scale.z = .75;
  ellipsoid(model, teal, [0, .99, 0], [.35, .23, .21]);
  part(model, new T.CylinderGeometry(.33, .35, .048, 9), trim, 0, .49, 0).scale.z = .75;
  part(model, new T.CylinderGeometry(.28, .31, .074, 9), leather, 0, .78, 0).scale.z = .81;
  part(model, new T.BoxGeometry(.13, .095, .04), trim, .01, .785, .25);
  ellipsoid(model, leather, [-.28, .74, .02], [.13, .17, .11]);
  const sling = part(model, new T.BoxGeometry(.075, .49, .04), leather, -.022, .96, .198);
  sling.rotation.z = -.56;
  ellipsoid(model, skin, [0, 1.41, .035], [.216, .245, .194]);
  ellipsoid(model, hair, [0, 1.52, -.055], [.237, .204, .218]);
  for (let i = 0; i < 5; i++) {
    const lock = ellipsoid(model, i % 2 ? 0x3e3034 : hair,
      [-.15 + i * .07, 1.58 + Math.sin(i) * .039, .121], [.079, .12, .097]);
    lock.rotation.z = -.48;
  }
  ellipsoid(model, skin, [0, 1.402, .225], [.043, .056, .044]);
  ellipsoid(model, 0xb95240, [0, 1.185, .017], [.25, .098, .195]);
  const scarf = new T.Group();
  scarf.position.set(-.12, 1.22, -.14);
  part(scarf, new T.BoxGeometry(.14, .46, .036), 0xb95240, -.018, -.18, -.06).rotation.x = .48;
  part(scarf, new T.BoxGeometry(.085, .3, .03), 0x88382e, .079, -.1, -.065).rotation.x = .64;
  model.add(scarf);

  const feet: T.Group[] = [];
  for (const side of [-1, 1]) {
    ellipsoid(model, 0x473332, [side * .086, 1.457, .205], [.026, .018, .016]);
    ellipsoid(model, teal, [side * .32, .93, .035], [.105, .17, .108]).rotation.z = side * .23;
    ellipsoid(model, leather, [side * .392, .75, .083], [.081, .135, .082]);
    ellipsoid(model, skin, [side * .423, .65, .103], [.068, .082, .068]);
    const foot = new T.Group();
    foot.position.x = side * .168;
    part(foot, new T.CylinderGeometry(.099, .106, .36, 8), 0x46414d, 0, .35, -.01);
    part(foot, new T.CylinderGeometry(.118, .112, .19, 8), leather, 0, .19, -.01);
    ellipsoid(foot, 0x483128, [0, .105, .062], [.117, .102, .172]);
    model.add(foot);
    feet.push(foot);
  }
  return { model, feet, scarf };
}

export function makeWatcher() {
  const model = new T.Group();
  const mantle = 0x343349;
  const robe = part(model, new T.ConeGeometry(.49, 1.28, 8), mantle, 0, .63, 0);
  robe.rotation.z = Math.PI;
  ellipsoid(model, 0x514664, [0, 1.03, -.09], [.52, .24, .24]);
  ellipsoid(model, mantle, [0, 1.31, 0], [.28, .35, .26]);
  ellipsoid(model, 0x181523, [0, 1.33, .2], [.18, .23, .09]);
  for (const side of [-1, 1]) {
    ellipsoid(model, 0xd6a7fd, [side * .078, 1.36, .287], [.037, .026, .012], true);
    const arm = new T.Group();
    arm.name = side < 0 ? 'leftArm' : 'rightArm';
    arm.position.set(side * .45, .83, 0);
    ellipsoid(arm, mantle, [side * .12, -.18, .05], [.16, .46, .16]).rotation.z = side * .37;
    part(arm, new T.OctahedronGeometry(.17), 0x8c78a7, side * .26, -.45, .12);
    model.add(arm);
  }
  const core = part(model, new T.OctahedronGeometry(.15), 0xc889ff, 0, .9, .24, true);
  model.scale.setScalar(1.62);
  return { model, core };
}
