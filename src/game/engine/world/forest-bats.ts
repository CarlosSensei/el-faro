import * as T from 'three';

const FLIGHTS = [
  { x: -.3, z: 11.9, width: 2.9, depth: 2.4, height: 3.45, speed: .67, phase: .9 },
  { x: .4, z: 10.3, width: 3.1, depth: 2.6, height: 3.9, speed: .64, phase: 2.1 },
  { x: 1.7, z: 3.1, width: 5.5, depth: 1.2, height: 3.85, speed: .56, phase: 2.35 },
  { x: -2.8, z: -8.8, width: 3.2, depth: 3.5, height: 4.6, speed: .61, phase: 1.3 },
  { x: 3.5, z: -14.4, width: 3.8, depth: 2.8, height: 4.85, speed: .53, phase: 2.25 },
];

export function buildForestBats() {
  const group = new T.Group();
  const fur = new T.MeshBasicMaterial({ color: 0x746381 });
  const membrane = new T.MeshBasicMaterial({ color: 0x786586, side: T.DoubleSide });
  const ridge = new T.MeshBasicMaterial({ color: 0xa494af, side: T.DoubleSide });
  const body = new T.SphereGeometry(1, 7, 5).scale(.11, .09, .21);
  const ears = new T.ConeGeometry(.052, .17, 4);
  const outline = new T.Shape()
    .moveTo(0, -.12)
    .quadraticCurveTo(.39, -.28, .83, -.22)
    .lineTo(.68, .25)
    .quadraticCurveTo(.57, .07, .49, .41)
    .quadraticCurveTo(.35, .19, .27, .36)
    .quadraticCurveTo(.16, .15, 0, .19);
  const wingShape = new T.ShapeGeometry(outline, 5).rotateX(-Math.PI / 2);
  const edge = new T.Shape().moveTo(0, -.115).lineTo(.40, -.215).lineTo(.79, -.215).lineTo(.36, -.16);
  const edgeShape = new T.ShapeGeometry(edge).rotateX(-Math.PI / 2).translate(0, .008, 0);

  const bats = FLIGHTS.map(flight => {
    const model = new T.Group();
    model.add(new T.Mesh(body, fur));
    const wings = [-1, 1].map(side => {
      const ear = new T.Mesh(ears, fur);
      ear.position.set(side * .07, .095, .125);
      ear.rotation.z = -side * .25;
      const wing = new T.Group();
      wing.position.x = side * .08;
      wing.scale.x = side;
      wing.add(new T.Mesh(wingShape, membrane), new T.Mesh(edgeShape, ridge));
      model.add(ear, wing);
      return { wing, side };
    });
    group.add(model);
    return { model, wings, flight };
  });

  function update(time: number) {
    for (const { model, wings, flight } of bats) {
      const phase = flight.phase + time * flight.speed;
      const sin = Math.sin(phase);
      const cos = Math.cos(phase);
      model.position.set(
        flight.x + cos * flight.width,
        flight.height + Math.sin(phase * 3) * .3,
        flight.z + sin * flight.depth,
      );
      model.rotation.set(-.10 * cos, Math.atan2(-sin * flight.width, cos * flight.depth), -.20 + .16 * sin, 'YXZ');
      const flap = .14 + Math.sin(time * 21 + flight.phase * 2) * .55;
      for (const { wing, side } of wings) wing.rotation.z = side * flap;
    }
  }

  update(0);
  return { group, update };
}
