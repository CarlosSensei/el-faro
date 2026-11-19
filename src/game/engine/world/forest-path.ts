import * as T from 'three';

type Landmark = { x: number; z: number };

export function buildForestPath(timber: T.Texture, riverZ: number, mark: Landmark, ruins: Landmark) {
  const halo = glowTexture();
  const bridge = buildBridge(timber, halo);
  bridge.position.z = riverZ;
  const tracks = buildTracks(halo, mark, ruins);

  return {
    bridge,
    tracks: tracks.group,
    update(time: number) {
      if (tracks.group.visible) tracks.update(time);
    },
  };
}

function buildBridge(timber: T.Texture, halo: T.Texture) {
  const group = new T.Group();
  const wood = [0x716461, 0x81756b, 0x625d59].map(color => new T.MeshStandardMaterial({
    color, map: timber, roughness: .93, flatShading: true,
  }));
  const frame = new T.MeshStandardMaterial({ color: 0x464642, map: timber, roughness: 1, flatShading: true });
  const iron = new T.MeshStandardMaterial({ color: 0x82968e, metalness: .35, roughness: .73 });
  const cord = new T.MeshStandardMaterial({ color: 0xb3a184, roughness: 1 });
  const magic = new T.MeshBasicMaterial({ color: 0x8beed0, toneMapped: false });
  const glint = new T.MeshBasicMaterial({ color: 0xc2ffe3, toneMapped: false });

  const plinth = new T.BoxGeometry(2.94, .12, .52);
  const beam = new T.BoxGeometry(.18, .16, 3.24);
  for (const side of [-1, 1]) {
    place(group, plinth, frame, 0, .045, side * 1.53);
    place(group, beam, frame, side * 1.19, .045, 0);
  }

  const board = new T.BoxGeometry(2.83, .108, .236);
  const bolt = new T.CylinderGeometry(.029, .035, .023, 6);
  const inlay = new T.BoxGeometry(.072, .021, .118);
  for (let index = 0; index < 13; index++) {
    const z = (index - 6) * .245;
    const y = .077 + Math.cos(index / 12 * Math.PI - Math.PI / 2) * .036;
    const plank = place(group, board, wood[(index * 7 + 2) % wood.length], 0, y, z);
    plank.scale.x = 1 - (index % 4) * .012;
    for (const side of [-1, 1]) {
      place(group, bolt, iron, side * 1.22, y + .06, z);
      const joint = place(group, inlay, magic, side * 1.04, y + .058, z);
      joint.rotation.y = side * .34;
    }
  }

  const rune = new T.RingGeometry(.10, .135, 4);
  for (const z of [-1.24, 0, 1.24]) {
    place(group, rune, glint, 0, .173, z).rotation.x = -Math.PI / 2;
  }

  const post = new T.BoxGeometry(.17, .68, .17);
  const cap = new T.BoxGeometry(.22, .075, .22);
  const lantern = new T.OctahedronGeometry(.10);
  for (const side of [-1, 1]) {
    const x = side * 1.33;
    const ropeAnchors: T.Vector3[] = [];
    for (const z of [-1.48, 0, 1.48]) {
      if (z > -1.48) ropeAnchors.push(new T.Vector3(x, .47, z - .74));
      ropeAnchors.push(new T.Vector3(x, .69, z));
      place(group, post, frame, x, .39, z);
      place(group, cap, iron, x, .73, z);
      place(group, lantern, magic, x, .835, z).scale.y = 1.45;
    }
    group.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ropeAnchors), 22, .025, 5, false), cord));
  }

  const reflection = place(group, new T.PlaneGeometry(4.6, 2.08), diffuseGlow(halo, 0x3dd9ba, .42), 0, .078, 0);
  reflection.rotation.x = -Math.PI / 2;
  group.visible = false;
  return group;
}

function buildTracks(halo: T.Texture, mark: Landmark, ruins: Landmark) {
  const group = new T.Group();
  const route = new T.CatmullRomCurve3([
    new T.Vector3(mark.x + .63, .03, mark.z - .56),
    new T.Vector3(-.30, .03, -2.4),
    new T.Vector3(.38, .03, -3.7),
    new T.Vector3(.26, .03, -4.8),
    new T.Vector3(-.25, .03, -6.2),
    new T.Vector3(ruins.x, .03, ruins.z + .18),
  ]);

  const sole = new T.Shape().moveTo(-.071, -.025).quadraticCurveTo(-.12, .12, -.025, .18)
    .quadraticCurveTo(.08, .21, .10, .11).quadraticCurveTo(.12, .01, .055, -.051).lineTo(-.071, -.025);
  const heel = new T.Shape().moveTo(-.057, -.084).quadraticCurveTo(-.078, -.19, .009, -.188)
    .quadraticCurveTo(.07, -.18, .052, -.093).lineTo(-.057, -.084);
  const count = 13;
  const footprints = new T.InstancedMesh(new T.ShapeGeometry([sole, heel]), new T.MeshBasicMaterial({
    color: 0x9ff8d2,
    toneMapped: false,
  }), count);
  const glow = new T.InstancedMesh(new T.PlaneGeometry(.96, 1.08), diffuseGlow(halo, 0x59dfbd, .3), count);
  const transform = new T.Object3D();
  for (let index = 0; index < count; index++) {
    const progress = index / (count - 1);
    const center = route.getPointAt(progress);
    const forward = route.getTangentAt(progress);
    const side = index % 2 ? 1 : -1;
    transform.position.set(center.x + forward.z * side * .22, .039, center.z - forward.x * side * .22);
    transform.rotation.set(-Math.PI / 2, Math.atan2(-forward.x, -forward.z) + side * .17, 0, 'YXZ');
    transform.updateMatrix();
    footprints.setMatrixAt(index, transform.matrix);
    transform.position.y = .026;
    transform.updateMatrix();
    glow.setMatrixAt(index, transform.matrix);
  }
  group.add(glow, footprints);

  const threads = new T.Mesh(new T.TubeGeometry(route, 48, .018, 5, false), new T.MeshBasicMaterial({
    color: 0x59dbbc, transparent: true, opacity: .46, depthWrite: false, toneMapped: false,
  }));
  group.add(threads);

  const sparkGeometry = new T.OctahedronGeometry(.049);
  const sparkMaterial = new T.MeshBasicMaterial({ color: 0xdbffef, toneMapped: false });
  const sparks = Array.from({ length: 5 }, () => {
    const spark = new T.Mesh(sparkGeometry, sparkMaterial);
    spark.visible = false;
    group.add(spark);
    return spark;
  });
  group.visible = false;

  return {
    group,
    update(time: number) {
      for (const [index, spark] of sparks.entries()) {
        const progress = (time * .18 + index / sparks.length) % 1;
        route.getPointAt(progress, spark.position);
        spark.position.y = .12 + Math.sin(time * 3 + index) * .05;
        spark.scale.setScalar(Math.sin(progress * Math.PI));
        spark.rotation.y = time * 2 + index;
        spark.visible = true;
      }
    },
  };
}

function diffuseGlow(map: T.Texture, color: number, opacity: number) {
  return new T.MeshBasicMaterial({
    map, color, opacity, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
  });
}

function glowTexture() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let index = 0; index < size * size; index++) {
    const x = ((index % size + .5) / size) * 2 - 1;
    const y = ((Math.floor(index / size) + .5) / size) * 2 - 1;
    const opacity = Math.max(0, 1 - Math.hypot(x, y)) ** 2;
    pixels.set([255, 255, 255, Math.round(255 * opacity)], index * 4);
  }
  const texture = new T.DataTexture(pixels, size, size);
  texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function place(group: T.Group, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}
