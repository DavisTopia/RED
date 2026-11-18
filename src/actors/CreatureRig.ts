import * as THREE from 'three';
import type { CreatureKind } from '../core/types';
import { organicForm } from './ActorGeometry';

export interface CreatureRig {
  model: THREE.Group;
  update(
    delta: number,
    movement: number,
    running: boolean,
    attacking: boolean,
    takingDamage: boolean,
    dead: boolean,
    special: boolean,
  ): void;
}

function makeMaterial(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: THREE.Vector3,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.position.copy(position);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

export function createCreatureRig(
  kind: CreatureKind,
  coat: THREE.Material,
): CreatureRig {
  const model = new THREE.Group();
  const rig = new THREE.Group();
  model.add(rig);
  const fur = coat.clone();
  const darkCoat = makeMaterial(kind === 'wolf' ? 0x48483f : kind === 'deer' ? 0x6e4a31 : 0x30231e);
  const lightCoat = makeMaterial(kind === 'wolf' ? 0xaaa18a : kind === 'deer' ? 0xc3a77a : 0x79614b);
  const eye = makeMaterial(0xe4c36e, 0.45);
  const black = makeMaterial(0x171816, 0.55);
  const bodyLength = kind === 'bear' ? 1.12 : kind === 'deer' ? 0.76 : 0.86;
  const bodyHeight = kind === 'bear' ? 0.62 : kind === 'deer' ? 0.48 : 0.45;
  const shoulderHeight = kind === 'bear' ? 0.93 : kind === 'deer' ? 0.88 : 0.68;
  const legLength = kind === 'bear' ? 0.52 : kind === 'deer' ? 0.47 : 0.34;
  const frontZ = kind === 'bear' ? 0.36 : 0.29;
  const rearZ = -bodyLength * 0.42;
  const torso = addMesh(
    organicForm(bodyLength, kind === 'bear' ? 0.4 : 0.29, bodyHeight, [0.62, 0.87, 1, 0.98, 0.84, 0.67]),
    fur,
    rig,
    new THREE.Vector3(0, shoulderHeight - 0.18, 0),
  );
  torso.rotation.x = Math.PI / 2;
  if (kind === 'bear') {
    const hump = addMesh(new THREE.SphereGeometry(0.38, 18, 14), darkCoat, rig, new THREE.Vector3(0, shoulderHeight + 0.04, -0.02));
    hump.scale.set(1.05, 0.86, 0.82);
  }
  if (kind === 'deer') {
    const belly = addMesh(new THREE.SphereGeometry(0.29, 16, 12), lightCoat, rig, new THREE.Vector3(0, shoulderHeight - 0.28, 0.015));
    belly.scale.set(0.72, 0.69, 1.2);
  }

  const neck = new THREE.Bone();
  neck.name = 'Neck';
  neck.position.set(0, shoulderHeight - 0.04, bodyLength * 0.35);
  neck.rotation.x = 0.28;
  rig.add(neck);
  const neckMesh = addMesh(
    organicForm(kind === 'deer' ? 0.52 : 0.34, kind === 'bear' ? 0.25 : 0.16, kind === 'bear' ? 0.24 : 0.16, [0.8, 1, 0.91, 0.68]),
    fur,
    neck,
    new THREE.Vector3(0, 0.1, 0.03),
  );
  neckMesh.rotation.x = 0.36;
  const head = new THREE.Bone();
  head.name = 'Head';
  head.position.set(0, kind === 'deer' ? 0.28 : 0.16, kind === 'deer' ? 0.17 : 0.21);
  neck.add(head);
  const skull = addMesh(new THREE.SphereGeometry(kind === 'bear' ? 0.25 : 0.18, 18, 14), fur, head, new THREE.Vector3(0, 0, 0.02));
  skull.scale.set(kind === 'bear' ? 1.05 : 0.95, 0.9, 1.12);
  const muzzle = addMesh(
    organicForm(kind === 'bear' ? 0.19 : 0.13, kind === 'bear' ? 0.15 : 0.105, kind === 'bear' ? 0.22 : 0.2, [0.58, 0.83, 1, 0.73]),
    kind === 'deer' ? lightCoat : darkCoat,
    head,
    new THREE.Vector3(0, -0.06, kind === 'bear' ? 0.24 : 0.22),
  );
  muzzle.rotation.x = Math.PI / 2;
  addMesh(new THREE.SphereGeometry(0.045, 10, 8), black, head, new THREE.Vector3(0, -0.01, kind === 'bear' ? 0.42 : 0.39));
  for (const side of [-1, 1]) {
    addMesh(new THREE.SphereGeometry(0.035, 10, 8), eye, head, new THREE.Vector3(side * 0.13, 0.055, 0.145));
    addMesh(new THREE.SphereGeometry(0.016, 8, 8), black, head, new THREE.Vector3(side * 0.13, 0.055, 0.17));
    if (kind === 'wolf' || kind === 'deer') {
      const ear = addMesh(new THREE.ConeGeometry(kind === 'wolf' ? 0.095 : 0.075, kind === 'wolf' ? 0.27 : 0.2, 8), fur, head, new THREE.Vector3(side * 0.15, 0.2, -0.01));
      ear.rotation.z = side * -0.18;
      if (kind === 'wolf') {
        const inner = addMesh(new THREE.ConeGeometry(0.045, 0.15, 7), lightCoat, head, new THREE.Vector3(side * 0.15, 0.195, 0.025));
        inner.rotation.z = side * -0.18;
      }
    }
    if (kind === 'deer') {
      const antlerBase = addMesh(new THREE.CylinderGeometry(0.025, 0.04, 0.22, 7), darkCoat, head, new THREE.Vector3(side * 0.095, 0.2, -0.04));
      antlerBase.rotation.z = side * -0.13;
      const antler = addMesh(new THREE.CylinderGeometry(0.014, 0.025, 0.28, 7), darkCoat, head, new THREE.Vector3(side * 0.16, 0.39, -0.055));
      antler.rotation.z = side * -0.42;
      for (const branch of [-1, 1]) {
        const tine = addMesh(new THREE.CylinderGeometry(0.009, 0.016, 0.16, 6), darkCoat, head, new THREE.Vector3(side * (0.17 + branch * 0.065), 0.4 + (1 - branch) * 0.07, -0.06));
        tine.rotation.z = side * (-0.9 + branch * 0.4);
      }
    }
  }
  if (kind === 'wolf') {
    for (let i = 0; i < 5; i++) {
      const ruff = addMesh(new THREE.ConeGeometry(0.09, 0.19, 7), darkCoat, rig, new THREE.Vector3((i - 2) * 0.09, shoulderHeight - 0.02, 0.25));
      ruff.rotation.x = Math.PI / 2;
      ruff.rotation.z = (i - 2) * 0.16;
    }
  }

  const legs: Array<{ hip: THREE.Bone; knee: THREE.Bone; phase: number; front: boolean }> = [];
  for (const [index, x] of [-1, 1].entries()) {
    for (const [row, z] of [frontZ, rearZ].entries()) {
      const hip = new THREE.Bone();
      hip.name = `${row === 0 ? 'Front' : 'Rear'}${x < 0 ? 'Left' : 'Right'}UpperLeg`;
      hip.position.set(x * (kind === 'bear' ? 0.25 : 0.19), shoulderHeight - 0.22, z);
      rig.add(hip);
      const upper = addMesh(
        organicForm(legLength * 0.64, kind === 'bear' ? 0.13 : 0.085, kind === 'bear' ? 0.14 : 0.09, [0.83, 1, 0.94, 0.68]),
        fur,
        hip,
        new THREE.Vector3(0, -legLength * 0.27, 0),
      );
      if (row === 0) upper.scale.x = 1.05;
      const knee = new THREE.Bone();
      knee.name = `${row === 0 ? 'Front' : 'Rear'}${x < 0 ? 'Left' : 'Right'}LowerLeg`;
      knee.position.y = -legLength * 0.55;
      hip.add(knee);
      addMesh(
        organicForm(legLength * 0.5, kind === 'bear' ? 0.095 : 0.063, kind === 'bear' ? 0.105 : 0.07, [0.75, 0.95, 1, 0.65]),
        fur,
        knee,
        new THREE.Vector3(0, -legLength * 0.22, 0),
      );
      const foot = addMesh(
        new THREE.SphereGeometry(kind === 'bear' ? 0.13 : 0.09, 12, 10),
        darkCoat,
        knee,
        new THREE.Vector3(0, -legLength * 0.48, 0.055),
      );
      foot.scale.set(0.95, 0.62, 1.25);
      if (kind === 'bear') {
        for (let claw = 0; claw < 3; claw++) {
          const toe = addMesh(new THREE.ConeGeometry(0.022, 0.11, 6), black, knee, new THREE.Vector3((claw - 1) * 0.07, -legLength * 0.5, 0.14));
          toe.rotation.x = Math.PI / 2;
        }
      }
      legs.push({ hip, knee, phase: (index * 2 + row) * Math.PI, front: row === 0 });
    }
  }

  const tail = new THREE.Bone();
  tail.name = 'Tail';
  tail.position.set(0, shoulderHeight - 0.12, -bodyLength * 0.48);
  rig.add(tail);
  const tailMesh = addMesh(
    organicForm(kind === 'bear' ? 0.25 : 0.42, kind === 'bear' ? 0.1 : 0.07, kind === 'bear' ? 0.1 : 0.07, [0.74, 1, 0.8, 0.48]),
    kind === 'deer' ? lightCoat : fur,
    tail,
    new THREE.Vector3(0, -0.13, 0),
  );
  tailMesh.rotation.x = -Math.PI / 2;
  if (kind === 'deer') {
    const tailTip = addMesh(new THREE.SphereGeometry(0.09, 10, 8), lightCoat, tail, new THREE.Vector3(0, -0.32, 0));
    tailTip.scale.set(0.85, 1.2, 0.8);
  }

  let elapsed = Math.random() * Math.PI * 2;
  let attackTime = 0;
  let specialAttackTime = 0;
  let damageTime = 0;
  return {
    model,
    update(delta, movement, running, attacking, takingDamage, dead, special) {
      elapsed += delta;
      if (attacking) {
        attackTime = special ? 0.72 : 0.46;
        if (special) specialAttackTime = 0.72;
      }
      if (takingDamage) damageTime = 0.24;
      attackTime = Math.max(0, attackTime - delta);
      specialAttackTime = Math.max(0, specialAttackTime - delta);
      damageTime = Math.max(0, damageTime - delta);
      const gaitSpeed = running ? 12 : 8;
      const stride = Math.min(1, movement) * (running ? 0.7 : 0.42);
      for (const leg of legs) {
        const phase = elapsed * gaitSpeed + leg.phase;
        const swipe = specialAttackTime > 0 && leg.front;
        leg.hip.rotation.x = swipe ? -0.78 : Math.sin(phase) * stride;
        leg.knee.rotation.x = Math.max(0, Math.sin(phase + 0.65)) * stride * 0.72;
      }
      tail.rotation.x = -0.55 + Math.sin(elapsed * 3.2) * 0.16;
      tail.rotation.z = Math.sin(elapsed * 2.4) * 0.14;
      head.rotation.x = attackTime > 0 ? (specialAttackTime > 0 ? -0.62 : 0.3) : damageTime > 0 ? -0.25 : Math.sin(elapsed * 1.5) * 0.025;
      if (dead) {
        rig.rotation.z = THREE.MathUtils.damp(rig.rotation.z, 1.1, 4, delta);
        rig.position.y = THREE.MathUtils.damp(rig.position.y, -0.28, 4, delta);
      } else {
        rig.rotation.z = THREE.MathUtils.damp(rig.rotation.z, damageTime > 0 ? -0.17 : 0, 7, delta);
        rig.position.y = THREE.MathUtils.damp(rig.position.y, movement > 0.05 ? Math.abs(Math.sin(elapsed * gaitSpeed * 2)) * (running ? 0.055 : 0.025) : Math.sin(elapsed * 2) * 0.009, 9, delta);
      }
    },
  };
}
