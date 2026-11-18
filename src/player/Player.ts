import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import type { Attributes, CharacterData } from '../core/types';
import { CameraManager } from './CameraManager';

export class Player {
  readonly model = new THREE.Group();
  readonly cameraManager: CameraManager;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  health: number;
  stamina: number;
  mana: number;
  blocking = false;
  private verticalSpeed = 0;
  private walkTime = 0;
  private attackTimer = 0;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;

  constructor(
    private readonly physics: RAPIER.World,
    camera: THREE.PerspectiveCamera,
    readonly character: CharacterData,
  ) {
    this.health = character.attributes.health;
    this.stamina = character.attributes.stamina;
    this.mana = character.attributes.mana;
    this.cameraManager = new CameraManager(camera);
    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 13),
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.capsule(0.52, 0.38).setFriction(0),
      this.body,
    );
    const controller = physics.createCharacterController(0.04);
    controller.setSlideEnabled(true);
    controller.setApplyImpulsesToDynamicBodies(true);
    this.controller = controller;
    this.createModel();
  }

  private readonly controller: RAPIER.KinematicCharacterController;

  private createModel(): void {
    const skin = new THREE.MeshStandardMaterial({ color: this.character.race === 'Elf' ? 0xb98d72 : 0xb77e58, roughness: 0.85 });
    const cloth = new THREE.MeshStandardMaterial({
      color: this.character.race === 'Dwarf' ? 0x68434a : this.character.race === 'Beastkin' ? 0x635d38 : 0x40584b,
      roughness: 0.9,
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.66, 4, 8), cloth);
    torso.position.y = 1.12;
    torso.castShadow = true;
    this.model.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
    head.position.y = 1.77;
    head.castShadow = true;
    this.model.add(head);
    if (this.character.race === 'Elf') {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 4), skin);
        ear.position.set(side * 0.25, 1.82, 0);
        ear.rotation.z = side * Math.PI / 2;
        this.model.add(ear);
      }
    }
    if (this.character.race === 'Dwarf') {
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 5), cloth);
      beard.position.set(0, 1.55, 0.15);
      this.model.add(beard);
    }
    this.leftLeg = this.makeLimb(cloth, -0.16, 0.62, 0.58);
    this.rightLeg = this.makeLimb(cloth, 0.16, 0.62, 0.58);
    this.leftArm = this.makeLimb(skin, -0.39, 1.23, 0.48);
    this.rightArm = this.makeLimb(skin, 0.39, 1.23, 0.48);
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.74, 0.045),
      new THREE.MeshStandardMaterial({ color: 0xc3c7b9, metalness: 0.68, roughness: 0.32 }),
    );
    sword.position.set(0, -0.33, 0.04);
    this.rightArm.add(sword);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 0.08), new THREE.MeshStandardMaterial({ color: 0x947b48 }));
    guard.position.y = -0.62;
    this.rightArm.add(guard);
    this.model.position.set(0, 0, 13);
  }

  private makeLimb(material: THREE.Material, x: number, y: number, length: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, length, 3, 6), material);
    mesh.position.y = -length * 0.35;
    mesh.castShadow = true;
    pivot.add(mesh);
    this.model.add(pivot);
    return pivot;
  }

  update(
    delta: number,
    move: { x: number; y: number },
    cameraYaw: number,
    sprinting: boolean,
    jumping: boolean,
    look: { x: number; y: number },
  ): void {
    const position = this.body.translation();
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const direction = forward.multiplyScalar(-move.y).add(right.multiplyScalar(move.x));
    if (direction.lengthSq() > 0) direction.normalize();

    const wantsSprint = sprinting && move.y !== 0 || sprinting && move.x !== 0;
    const canSprint = wantsSprint && this.stamina > 0;
    const speed = canSprint ? 7.5 : 4.5;
    if (canSprint) this.stamina = Math.max(0, this.stamina - delta * 16);
    else this.stamina = Math.min(this.character.attributes.stamina, this.stamina + delta * 10);

    const grounded = this.controller.computedGrounded();
    if (jumping && grounded && this.stamina >= 12) {
      this.verticalSpeed = 7.2;
      this.stamina -= 12;
    }
    this.verticalSpeed -= 19.6 * delta;
    if (grounded && this.verticalSpeed < 0) this.verticalSpeed = -1;
    const desired = {
      x: direction.x * speed * delta,
      y: this.verticalSpeed * delta,
      z: direction.z * speed * delta,
    };
    this.controller.computeColliderMovement(this.collider, desired);
    const movement = this.controller.computedMovement();
    this.body.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: Math.max(-0.2, position.y + movement.y),
      z: position.z + movement.z,
    });
    this.model.position.set(position.x + movement.x, position.y + movement.y - 0.9, position.z + movement.z);

    this.blocking = this.blocking && this.stamina > 0;
    if (this.blocking) this.stamina = Math.max(0, this.stamina - delta * 7);
    const moving = direction.lengthSq() > 0.01;
    this.walkTime += delta * (canSprint ? 12 : 8) * (moving ? 1 : 0.2);
    const swing = moving ? Math.sin(this.walkTime) * 0.48 : 0;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.7;
    this.rightArm.rotation.x = this.attackTimer > 0 ? -1.7 : swing * 0.55;
    this.attackTimer = Math.max(0, this.attackTimer - delta);
    this.cameraManager.update(this.model, look.x, look.y);
  }

  attackAnimation(): void {
    this.attackTimer = 0.28;
  }

  takeDamage(amount: number): void {
    const mitigation = Math.max(0, this.character.attributes.defense * 0.018);
    this.health = Math.max(0, this.health - Math.max(1, amount * (this.blocking ? 0.3 : 1) * (1 - mitigation)));
  }

  restore(): void {
    this.health = this.character.attributes.health;
    this.stamina = this.character.attributes.stamina;
    this.mana = this.character.attributes.mana;
    this.body.setTranslation({ x: 0, y: 0.9, z: 13 }, true);
    this.verticalSpeed = 0;
  }

  get attributes(): Attributes {
    return this.character.attributes;
  }

  dispose(): void {
    this.physics.removeRigidBody(this.body);
    this.physics.removeCharacterController(this.controller);
  }
}
