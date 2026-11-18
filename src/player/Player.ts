import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import type { Attributes, CharacterData } from '../core/types';
import { CameraManager } from './CameraManager';
import { createCharacterRig, type CharacterRig } from '../actors/CharacterRig';
import { disposeActorModel } from '../actors/ActorGeometry';

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
  private attackPending = false;
  private damagePending = false;
  private readonly capsuleRadius: number;
  private readonly capsuleHalfHeight: number;
  private visualRig!: CharacterRig;
  private attackTrail!: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private firstPersonAttackTrail!: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private attackTrailMaterial!: THREE.MeshBasicMaterial;
  private attackEffectRemaining = 0;
  private attackSequence = 0;

  constructor(
    private readonly physics: RAPIER.World,
    private readonly camera: THREE.PerspectiveCamera,
    readonly character: CharacterData,
    private readonly groundHeightAt: (x: number, z: number) => number = () => 0,
  ) {
    this.health = character.attributes.health;
    this.stamina = character.attributes.stamina;
    this.mana = character.attributes.mana;
    this.cameraManager = new CameraManager(camera);
    this.capsuleRadius = character.race === 'Dwarf' ? 0.33 : character.race === 'Elf' ? 0.36 : 0.38;
    this.capsuleHalfHeight = character.race === 'Dwarf' ? 0.37 : character.race === 'Elf' ? 0.57 : 0.52;
    const bodyHeight = this.capsuleHalfHeight + this.capsuleRadius;
    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        this.groundHeightAt(0, 13) + bodyHeight,
        13,
      ),
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.capsule(this.capsuleHalfHeight, this.capsuleRadius).setFriction(0),
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
    this.visualRig = createCharacterRig(this.character.race);
    this.model.add(this.visualRig.model);
    this.attackTrailMaterial = new THREE.MeshBasicMaterial({
      color: 0xe7ca82,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.attackTrail = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.035, 6, 28, Math.PI * 0.88),
      this.attackTrailMaterial,
    );
    this.attackTrail.position.set(0, -0.25, 0.08);
    this.attackTrail.rotation.set(0, 0, -0.9);
    this.attackTrail.visible = false;
    this.attackTrail.castShadow = false;
    this.attackTrail.receiveShadow = false;
    const weaponSocket = this.visualRig.model.getObjectByName('WeaponSocket') ?? this.visualRig.model;
    weaponSocket.add(this.attackTrail);
    this.firstPersonAttackTrail = new THREE.Mesh(this.attackTrail.geometry, this.attackTrailMaterial);
    this.firstPersonAttackTrail.position.set(0.42, -0.2, -0.72);
    this.firstPersonAttackTrail.rotation.set(0, 0, -0.9);
    this.firstPersonAttackTrail.visible = false;
    this.camera.add(this.firstPersonAttackTrail);
    this.model.position.set(0, this.groundHeightAt(0, 13), 13);
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

    const wantsSprint = sprinting && (move.y !== 0 || move.x !== 0);
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
    const bodyHeight = this.capsuleHalfHeight + this.capsuleRadius;
    const nextX = position.x + movement.x;
    const nextZ = position.z + movement.z;
    const groundHeight = this.groundHeightAt(nextX, nextZ);
    this.body.setNextKinematicTranslation({
      x: nextX,
      y: Math.max(groundHeight + bodyHeight - 0.05, position.y + movement.y),
      z: nextZ,
    });
    this.model.position.set(nextX, Math.max(groundHeight, position.y + movement.y - bodyHeight), nextZ);

    this.blocking = this.blocking && this.stamina > 0;
    if (this.blocking) this.stamina = Math.max(0, this.stamina - delta * 7);
    const moving = direction.lengthSq() > 0.01;
    this.visualRig.update(
      delta,
      moving ? 1 : 0,
      canSprint,
      this.attackPending,
      this.damagePending,
      this.health <= 0,
      this.blocking,
      !this.controller.computedGrounded(),
      this.attackSequence,
    );
    this.attackPending = false;
    this.damagePending = false;
    this.attackEffectRemaining = Math.max(0, this.attackEffectRemaining - delta);
    const activeTrail = this.attackEffectRemaining > 0;
    this.attackTrail.visible = activeTrail && this.cameraManager.mode !== 'first-person';
    this.firstPersonAttackTrail.visible = activeTrail && this.cameraManager.mode === 'first-person';
    if (activeTrail) {
      const progress = 1 - this.attackEffectRemaining / 0.36;
      this.attackTrailMaterial.opacity = (1 - progress) * 0.84;
      this.attackTrail.rotation.z = -0.9 + progress * 1.8;
      this.firstPersonAttackTrail.rotation.z = -0.9 + progress * 1.8;
      this.attackTrail.scale.setScalar(0.82 + progress * 0.48);
      this.firstPersonAttackTrail.scale.setScalar(0.82 + progress * 0.48);
    }
    const raceCameraHeight = {
      Human: { eye: 1.76, target: 1.05 },
      Elf: { eye: 1.9, target: 1.15 },
      Dwarf: { eye: 1.38, target: 0.82 },
      Beastkin: { eye: 1.79, target: 1.05 },
    }[this.character.race];
    this.cameraManager.update(this.model, look.x, look.y, delta, 0.003, raceCameraHeight.eye, raceCameraHeight.target);
  }

  attackAnimation(sequence = 0): void {
    this.attackSequence = sequence % 3;
    this.attackPending = true;
    this.attackEffectRemaining = 0.36;
    this.attackTrailMaterial.color.setHex([0xffd66b, 0xff9d55, 0x9fe8ff][this.attackSequence]);
    this.attackTrail.scale.setScalar(1);
    this.firstPersonAttackTrail.scale.setScalar(1);
    this.attackTrail.rotation.z = -0.9;
    this.firstPersonAttackTrail.rotation.z = -0.9;
    this.attackTrail.visible = this.cameraManager.mode !== 'first-person';
    this.firstPersonAttackTrail.visible = this.cameraManager.mode === 'first-person';
  }

  takeDamage(amount: number): void {
    const mitigation = Math.max(0, this.character.attributes.defense * 0.018);
    const damage = Math.max(1, amount * (this.blocking ? 0.3 : 1) * (1 - mitigation));
    this.health = Math.max(0, this.health - damage);
    this.damagePending = true;
  }

  restore(): void {
    this.health = this.character.attributes.health;
    this.stamina = this.character.attributes.stamina;
    this.mana = this.character.attributes.mana;
    this.model.rotation.z = 0;
    const bodyHeight = this.capsuleHalfHeight + this.capsuleRadius;
    const groundHeight = this.groundHeightAt(0, 13);
    this.body.setTranslation({ x: 0, y: groundHeight + bodyHeight, z: 13 }, true);
    this.model.position.set(0, groundHeight, 13);
    this.verticalSpeed = 0;
    this.blocking = false;
    this.attackEffectRemaining = 0;
    this.attackTrail.visible = false;
    this.firstPersonAttackTrail.visible = false;
  }

  get attributes(): Attributes {
    return this.character.attributes;
  }

  dispose(): void {
    this.camera.remove(this.firstPersonAttackTrail);
    this.physics.removeRigidBody(this.body);
    this.physics.removeCharacterController(this.controller);
    disposeActorModel(this.model);
  }
}
