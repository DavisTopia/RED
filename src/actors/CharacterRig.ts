import * as THREE from 'three';
import type { Race } from '../core/types';
import { organicForm } from './ActorGeometry';

export interface CharacterRig {
  model: THREE.Group;
  update(
    delta: number,
    movement: number,
    sprinting: boolean,
    attacking: boolean,
    takingDamage: boolean,
    dead: boolean,
    blocking: boolean,
    jumping: boolean,
  ): void;
}

interface RaceStyle {
  height: number;
  width: number;
  skin: number;
  cloth: number;
  armor: number;
  hair: number;
}

const RACE_STYLE: Record<Race, RaceStyle> = {
  Human: { height: 1, width: 1, skin: 0xb77e58, cloth: 0x40584b, armor: 0x777d78, hair: 0x392b24 },
  Elf: { height: 1.07, width: 0.88, skin: 0xb98d72, cloth: 0x345348, armor: 0x9b8659, hair: 0x343b37 },
  Dwarf: { height: 0.78, width: 1.2, skin: 0xa96d4d, cloth: 0x68434a, armor: 0x74746b, hair: 0x6a3827 },
  Beastkin: { height: 1.01, width: 1.04, skin: 0x8e684d, cloth: 0x635d38, armor: 0x786d50, hair: 0x574332 },
};

function material(color: number, roughness = 0.82, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  parent: THREE.Object3D,
  position: THREE.Vector3,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, surface);
  result.position.copy(position);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function plateShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.44, height * 0.46);
  shape.quadraticCurveTo(0, height * 0.56, width * 0.44, height * 0.46);
  shape.lineTo(width * 0.5, height * 0.16);
  shape.quadraticCurveTo(width * 0.42, -height * 0.38, 0, -height * 0.5);
  shape.quadraticCurveTo(-width * 0.42, -height * 0.38, -width * 0.5, height * 0.16);
  shape.closePath();
  return shape;
}

export function createCharacterRig(race: Race): CharacterRig {
  const style = RACE_STYLE[race];
  const model = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.set(style.width, style.height, style.width);
  model.add(rig);

  const skin = material(style.skin);
  const cloth = material(style.cloth, 0.94);
  const leather = material(race === 'Elf' ? 0x463d2c : 0x3e3024, 0.9);
  const armor = material(style.armor, 0.38, 0.62);
  const trim = material(race === 'Dwarf' ? 0xb48848 : 0xb59a62, 0.42, 0.55);
  const hair = material(style.hair, 0.96);
  const dark = material(0x261d1a, 0.72);
  const eye = material(0xe5d6b8, 0.5);
  const iris = material(race === 'Elf' ? 0x83a96e : 0x554331, 0.38);
  let tailBone: THREE.Bone | null = null;

  const pelvis = new THREE.Bone();
  pelvis.name = 'Hips';
  pelvis.position.y = 0.88;
  rig.add(pelvis);
  mesh(organicForm(0.33, 0.28, 0.18, [0.74, 0.96, 1, 0.86, 0.62]), cloth, pelvis, new THREE.Vector3(0, 0.01, 0));

  const spine = new THREE.Bone();
  spine.name = 'Spine';
  spine.position.y = 0.12;
  pelvis.add(spine);
  mesh(organicForm(0.67, 0.28, 0.18, [0.67, 0.9, 1, 0.93, 0.82, 0.67]), cloth, spine, new THREE.Vector3(0, 0.22, 0));
  const chestPlate = mesh(
    new THREE.ExtrudeGeometry(plateShape(0.54, 0.64), { depth: 0.065, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }),
    armor,
    spine,
    new THREE.Vector3(0, 0.22, 0.175),
  );
  chestPlate.rotation.x = -0.08;
  mesh(new THREE.TorusGeometry(0.21, 0.018, 6, 24), trim, spine, new THREE.Vector3(0, 0.22, 0.217)).scale.set(1, 1.1, 0.35);
  const backEquipmentSocket = new THREE.Bone();
  backEquipmentSocket.name = 'Equipment_Back';
  backEquipmentSocket.position.set(0, 0.1, -0.2);
  spine.add(backEquipmentSocket);

  const belt = mesh(new THREE.TorusGeometry(0.23, 0.038, 7, 24), leather, pelvis, new THREE.Vector3(0, 0.13, 0));
  belt.scale.set(1.13, 0.56, 0.72);
  const buckle = mesh(new THREE.BoxGeometry(0.11, 0.09, 0.035), trim, pelvis, new THREE.Vector3(0, 0.13, 0.245));
  buckle.rotation.z = Math.PI / 4;
  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.12, 0.44, 0.28), cloth, pelvis, new THREE.Vector3(side * 0.16, -0.17, 0.015));
    mesh(new THREE.BoxGeometry(0.035, 0.42, 0.035), trim, pelvis, new THREE.Vector3(side * 0.16, -0.17, 0.17));
  }

  const neck = new THREE.Bone();
  neck.name = 'Neck';
  neck.position.set(0, 0.59, 0);
  spine.add(neck);
  mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.18, 12), skin, neck, new THREE.Vector3(0, 0.01, 0));
  const head = new THREE.Bone();
  head.name = 'Head';
  head.position.y = 0.13;
  neck.add(head);
  mesh(new THREE.SphereGeometry(0.19, 20, 16), skin, head, new THREE.Vector3(0, 0.03, 0));
  mesh(organicForm(0.15, 0.15, 0.135, [0.15, 0.72, 1, 0.94, 0.63]), skin, head, new THREE.Vector3(0, -0.07, 0.11));
  mesh(new THREE.SphereGeometry(0.055, 12, 10), skin, head, new THREE.Vector3(0, -0.01, 0.18));
  mesh(new THREE.BoxGeometry(0.105, 0.012, 0.012), dark, head, new THREE.Vector3(0, -0.09, 0.205));
  for (const side of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.035, 12, 10), eye, head, new THREE.Vector3(side * 0.075, 0.055, 0.155));
    mesh(new THREE.SphereGeometry(0.019, 10, 8), iris, head, new THREE.Vector3(side * 0.075, 0.055, 0.184));
    const brow = mesh(new THREE.CapsuleGeometry(0.017, 0.08, 3, 6), hair, head, new THREE.Vector3(side * 0.075, 0.1, 0.16));
    brow.rotation.z = side * -0.12;
    const ear = mesh(new THREE.SphereGeometry(0.055, 10, 8), skin, head, new THREE.Vector3(side * 0.19, 0.035, 0));
    ear.scale.set(0.42, 0.72, 0.8);
    if (race === 'Elf' || race === 'Beastkin') {
      const point = mesh(new THREE.ConeGeometry(race === 'Elf' ? 0.052 : 0.075, race === 'Elf' ? 0.25 : 0.2, 8), skin, head, new THREE.Vector3(side * 0.27, 0.075, 0));
      point.rotation.z = side * -Math.PI / 2;
      if (race === 'Beastkin') {
        const inner = mesh(new THREE.ConeGeometry(0.039, 0.115, 7), material(0x76504a), head, new THREE.Vector3(side * 0.271, 0.068, 0.035));
        inner.rotation.z = side * -Math.PI / 2;
      }
    }
  }

  const hairCap = mesh(new THREE.SphereGeometry(0.195, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.53), hair, head, new THREE.Vector3(0, 0.11, -0.015));
  hairCap.scale.set(1.02, 0.9, 1.05);
  for (let i = 0; i < (race === 'Dwarf' ? 7 : 5); i++) {
    const lock = mesh(new THREE.CapsuleGeometry(0.025, 0.12 + (i % 3) * 0.035, 3, 6), hair, head, new THREE.Vector3((i - 2) * 0.045, 0.055, -0.13));
    lock.rotation.z = (i - 2) * 0.17;
  }
  if (race === 'Dwarf') {
    const beard = mesh(organicForm(0.29, 0.12, 0.09, [0.72, 1, 0.94, 0.68, 0.25]), hair, head, new THREE.Vector3(0, -0.15, 0.14));
    beard.rotation.x = -0.12;
    for (const side of [-1, 1]) {
      const braid = mesh(new THREE.CapsuleGeometry(0.025, 0.18, 3, 6), hair, head, new THREE.Vector3(side * 0.13, -0.12, 0.075));
      braid.rotation.z = side * -0.22;
      mesh(new THREE.TorusGeometry(0.027, 0.008, 5, 10), trim, head, new THREE.Vector3(side * 0.13, -0.22, 0.08));
    }
  }
  if (race === 'Beastkin') {
    for (let i = 0; i < 9; i++) {
      const tuft = mesh(new THREE.ConeGeometry(0.035, 0.12, 5), hair, head, new THREE.Vector3((i - 4) * 0.035, 0.04, 0.15));
      tuft.rotation.z = (i - 4) * 0.12;
    }
  }

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Bone();
    shoulder.name = side < 0 ? 'LeftShoulder' : 'RightShoulder';
    shoulder.position.set(side * 0.29, 0.48, 0);
    spine.add(shoulder);
    mesh(new THREE.SphereGeometry(0.14, 14, 12), cloth, shoulder, new THREE.Vector3(0, -0.03, 0));
    const pauldron = mesh(new THREE.SphereGeometry(0.15, 16, 12), armor, shoulder, new THREE.Vector3(side * 0.035, 0.015, 0.015));
    pauldron.scale.set(1.14, 0.68, 1.12);
    mesh(new THREE.TorusGeometry(0.105, 0.012, 5, 16), trim, shoulder, new THREE.Vector3(side * 0.035, -0.01, 0.07)).scale.set(1, 0.78, 0.55);
    const upperArm = new THREE.Bone();
    upperArm.name = side < 0 ? 'LeftUpperArm' : 'RightUpperArm';
    upperArm.position.y = -0.09;
    shoulder.add(upperArm);
    mesh(organicForm(0.31, 0.09, 0.09, [0.77, 1, 0.94, 0.72]), cloth, upperArm, new THREE.Vector3(0, -0.13, 0));
    const elbow = new THREE.Bone();
    elbow.name = side < 0 ? 'LeftLowerArm' : 'RightLowerArm';
    elbow.position.y = -0.29;
    upperArm.add(elbow);
    mesh(new THREE.SphereGeometry(0.075, 10, 8), skin, elbow, new THREE.Vector3(0, 0, 0));
    mesh(organicForm(0.29, 0.075, 0.08, [0.75, 0.98, 1, 0.7]), armor, elbow, new THREE.Vector3(0, -0.13, 0.01));
    const bracer = mesh(new THREE.CylinderGeometry(0.082, 0.095, 0.13, 12, 1, true), leather, elbow, new THREE.Vector3(0, -0.21, 0.01));
    bracer.rotation.z = side * 0.04;
    mesh(new THREE.TorusGeometry(0.088, 0.012, 5, 16), trim, elbow, new THREE.Vector3(0, -0.15, 0.01));
    const hand = new THREE.Bone();
    hand.name = side < 0 ? 'LeftHand' : 'RightHand';
    hand.position.y = -0.3;
    elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.065, 12, 10), skin, hand, new THREE.Vector3(0, 0, 0.02));
    for (let finger = 0; finger < 4; finger++) {
      const digit = mesh(new THREE.CapsuleGeometry(0.012, 0.055, 3, 5), skin, hand, new THREE.Vector3((finger - 1.5) * 0.026, -0.045, 0.035));
      digit.rotation.z = (finger - 1.5) * 0.08;
    }
    if (side === 1) {
      const weaponSocket = new THREE.Bone();
      weaponSocket.name = 'WeaponSocket';
      weaponSocket.position.set(0, -0.05, 0.045);
      hand.add(weaponSocket);
      const grip = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.17, 8), leather, weaponSocket, new THREE.Vector3(0, -0.03, 0));
      grip.rotation.z = -0.36;
      const blade = mesh(new THREE.BoxGeometry(0.06, 0.69, 0.025), armor, weaponSocket, new THREE.Vector3(0, -0.42, 0));
      blade.rotation.z = -0.36;
      mesh(new THREE.BoxGeometry(0.22, 0.045, 0.065), trim, weaponSocket, new THREE.Vector3(0, -0.11, 0)).rotation.z = -0.36;
      mesh(new THREE.SphereGeometry(0.045, 8, 8), trim, weaponSocket, new THREE.Vector3(0, 0.065, 0));
    } else {
      mesh(new THREE.BoxGeometry(0.12, 0.045, 0.055), leather, hand, new THREE.Vector3(0, -0.09, 0));
    }

    const hip = new THREE.Bone();
    hip.name = side < 0 ? 'LeftUpperLeg' : 'RightUpperLeg';
    hip.position.set(side * 0.16, -0.12, 0);
    pelvis.add(hip);
    mesh(organicForm(0.36, 0.095, 0.105, [0.82, 1, 0.94, 0.65]), cloth, hip, new THREE.Vector3(0, -0.16, 0));
    const knee = new THREE.Bone();
    knee.name = side < 0 ? 'LeftLowerLeg' : 'RightLowerLeg';
    knee.position.y = -0.32;
    hip.add(knee);
    mesh(new THREE.SphereGeometry(0.075, 10, 8), armor, knee, new THREE.Vector3(0, 0, 0.015));
    mesh(organicForm(0.34, 0.075, 0.085, [0.72, 0.94, 1, 0.71]), cloth, knee, new THREE.Vector3(0, -0.16, 0));
    const boot = new THREE.Bone();
    boot.name = side < 0 ? 'LeftFoot' : 'RightFoot';
    boot.position.set(0, -0.34, 0.045);
    knee.add(boot);
    const bootMesh = mesh(new THREE.CapsuleGeometry(0.09, 0.18, 4, 8), leather, boot, new THREE.Vector3(0, -0.045, 0.035));
    bootMesh.scale.set(1, 0.75, 1.35);
    mesh(new THREE.BoxGeometry(0.18, 0.045, 0.28), armor, boot, new THREE.Vector3(0, -0.12, 0.075));

    if (race === 'Dwarf') {
      hip.scale.y = 0.88;
      shoulder.scale.set(1.12, 1.08, 1.1);
    }
  }
  if (race === 'Beastkin') {
    const tail = new THREE.Bone();
    tail.name = 'Tail';
    tailBone = tail;
    tail.position.set(0, 0.86, -0.14);
    tail.rotation.x = -0.55;
    rig.add(tail);
    mesh(organicForm(0.58, 0.09, 0.09, [0.66, 0.8, 0.7, 0.48, 0.25]), hair, tail, new THREE.Vector3(0, -0.25, 0));
    const tailTip = mesh(new THREE.SphereGeometry(0.105, 12, 10), material(0xdbc2a1), tail, new THREE.Vector3(0, -0.52, 0));
    tailTip.scale.set(1, 1.25, 1);
  }

  let elapsed = 0;
  let attackTime = 0;
  let damageTime = 0;
  let movementBlend = 0;
  let sprintBlend = 0;
  let blockBlend = 0;
  let jumpBlend = 0;
  return {
    model,
    update(delta, movement, sprinting, attacking, takingDamage, dead, blocking, jumping) {
      elapsed += delta;
      if (attacking) attackTime = 0.28;
      if (takingDamage) damageTime = 0.22;
      attackTime = Math.max(0, attackTime - delta);
      damageTime = Math.max(0, damageTime - delta);
      movementBlend = THREE.MathUtils.damp(movementBlend, Math.min(1, movement), 9, delta);
      sprintBlend = THREE.MathUtils.damp(sprintBlend, sprinting ? 1 : 0, 8, delta);
      blockBlend = THREE.MathUtils.damp(blockBlend, blocking ? 1 : 0, 12, delta);
      jumpBlend = THREE.MathUtils.damp(jumpBlend, jumping ? 1 : 0, 9, delta);
      const gait = elapsed * THREE.MathUtils.lerp(8, 12, sprintBlend);
      const stride = movementBlend * THREE.MathUtils.lerp(0.5, 0.78, sprintBlend);
      for (let i = 0; i < pelvis.children.length; i++) {
        const child = pelvis.children[i];
        if (child instanceof THREE.Bone && child !== spine) {
          const side = child.position.x < 0 ? -1 : 1;
          const gaitPose = Math.sin(gait + (side < 0 ? 0 : Math.PI)) * stride;
          child.rotation.x = THREE.MathUtils.lerp(gaitPose, -0.42, jumpBlend);
          const knee = child.children.find((part) => part instanceof THREE.Bone);
          if (knee instanceof THREE.Bone) {
            const kneePose = Math.max(0, Math.sin(gait + (side < 0 ? 0 : Math.PI))) * stride * 0.72;
            knee.rotation.x = THREE.MathUtils.lerp(kneePose, 0.58, jumpBlend);
          }
        }
      }
      const dying = dead ? 1 : 0;
      spine.rotation.z = (Math.sin(gait) * stride * 0.045) - blockBlend * 0.06
        + (damageTime > 0 ? Math.sin((damageTime / 0.22) * Math.PI) * 0.2 : 0);
      spine.rotation.x = -blockBlend * 0.08 + jumpBlend * 0.14;
      spine.position.y = 0.12 + (movementBlend > 0.05 ? Math.abs(Math.sin(gait * 2)) * (0.018 + sprintBlend * 0.017) : Math.sin(elapsed * 1.8) * 0.008);
      if (tailBone) {
        tailBone.rotation.x = -0.55 + Math.sin(elapsed * 2.8) * 0.18;
        tailBone.rotation.z = Math.sin(elapsed * 2.1) * 0.16;
      }
      rig.rotation.z = THREE.MathUtils.damp(rig.rotation.z, dying * -1.15, 5, delta);
      rig.position.y = THREE.MathUtils.damp(rig.position.y, dying * -0.05, 5, delta);
      const shoulders = spine.children.filter((child) => child instanceof THREE.Bone && child !== neck) as THREE.Bone[];
      shoulders.forEach((shoulder) => {
        const side = shoulder.position.x < 0 ? -1 : 1;
        const upperArm = shoulder.children.find((part) => part instanceof THREE.Bone);
        if (!(upperArm instanceof THREE.Bone)) return;
        const elbow = upperArm.children.find((part) => part instanceof THREE.Bone);
        const attack = attackTime > 0 && side > 0;
        const swing = -Math.sin(gait + (side < 0 ? 0 : Math.PI)) * stride * 0.55;
        const guarded = THREE.MathUtils.lerp(THREE.MathUtils.lerp(swing, -1.05, blockBlend), -0.55, jumpBlend);
        upperArm.rotation.x = dead ? 0.9 : attack ? -1.65 + (attackTime / 0.28) * 0.38 : guarded;
        upperArm.rotation.z = attack ? -0.35 : side * (0.42 * blockBlend + 0.12 * jumpBlend);
        if (elbow instanceof THREE.Bone) {
          elbow.rotation.x = attack ? -0.15 : -0.68 * blockBlend + 0.15 * jumpBlend;
        }
      });
    },
  };
}
