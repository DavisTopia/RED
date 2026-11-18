import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import type { CreatureKind, CreatureMood } from '../core/types';
import type { AssetManager } from '../core/AssetManager';

export class Creature {
  readonly model = new THREE.Group();
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  health: number;
  mood: CreatureMood;
  attackCooldown = 0;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly origin: THREE.Vector3;
  private readonly legs: THREE.Mesh[] = [];
  private phase = Math.random() * Math.PI * 2;
  private readonly healthBar: THREE.Mesh;
  private readonly healthBarTrack: THREE.Mesh;

  constructor(
    readonly kind: CreatureKind,
    position: THREE.Vector3,
    private readonly physics: RAPIER.World,
    private readonly assets: AssetManager,
  ) {
    this.origin = position.clone();
    this.health = kind === 'bear' ? 100 : kind === 'wolf' ? 62 : 34;
    this.mood = kind === 'wolf' ? 'hostile' : kind === 'deer' ? 'passive' : 'territorial';
    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, 0.62, position.z),
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.capsule(kind === 'bear' ? 0.42 : 0.26, kind === 'bear' ? 0.55 : 0.38).setFriction(0),
      this.body,
    );
    this.controller = physics.createCharacterController(0.03);
    this.controller.setSlideEnabled(true);
    this.createModel();
    this.healthBarTrack = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x20251f, side: THREE.DoubleSide }),
    );
    this.healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x9e493c, side: THREE.DoubleSide }),
    );
    this.healthBar.position.z = 0.01;
    this.healthBarTrack.position.set(0, this.height + 0.2, 0);
    this.healthBar.position.set(0, this.height + 0.2, 0.015);
    this.model.add(this.healthBarTrack, this.healthBar);
  }

  private get height(): number {
    return this.kind === 'bear' ? 1.65 : this.kind === 'deer' ? 1.35 : 1.05;
  }

  private createModel(): void {
    const material = this.kind === 'wolf' ? this.assets.materials.wolf : this.kind === 'deer' ? this.assets.materials.deer : this.assets.materials.bear;
    const size = this.kind === 'bear' ? 1.28 : this.kind === 'deer' ? 0.86 : 0.92;
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.56 * size, 10, 8), material);
    torso.scale.set(1.35, 0.9, 0.75);
    torso.position.y = this.height * 0.57;
    torso.castShadow = true;
    this.model.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31 * size, 9, 7), material);
    head.position.set(0, this.height * 0.73, 0.55 * size);
    head.castShadow = true;
    this.model.add(head);
    if (this.kind === 'wolf' || this.kind === 'deer') {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1 * size, 0.35 * size, 4), material);
        ear.position.set(side * 0.2, this.height * 0.96, 0.48 * size);
        this.model.add(ear);
      }
    }
    if (this.kind === 'deer') {
      for (const side of [-1, 1]) {
        const antler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.055, 0.62, 4),
          new THREE.MeshStandardMaterial({ color: 0xc3aa7a, roughness: 1 }),
        );
        antler.position.set(side * 0.19, this.height * 1.04, 0.52);
        antler.rotation.z = side * -0.5;
        this.model.add(antler);
      }
    }
    for (const x of [-0.32, 0.32]) {
      for (const z of [-0.28, 0.3]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * size, 0.38 * size, 3, 5), material);
        leg.position.set(x * size, this.height * 0.25, z * size);
        leg.castShadow = true;
        this.model.add(leg);
        this.legs.push(leg);
      }
    }
    if (this.kind !== 'bear') {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 5), material);
      tail.position.set(0, this.height * 0.6, -0.68);
      tail.rotation.x = Math.PI / 2;
      this.model.add(tail);
    }
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    callbacks: { damagePlayer: (damage: number) => void },
  ): void {
    if (this.mood === 'dead') return;
    const position = this.body.translation();
    const current = new THREE.Vector3(position.x, position.y, position.z);
    const distance = current.distanceTo(playerPosition);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    let target: THREE.Vector3 | null = null;
    let speed = 0;
    if (this.mood === 'tamed') {
      if (distance > 3.2) {
        target = playerPosition;
        speed = 4;
      }
    } else if (this.kind === 'deer') {
      if (distance < 9) {
        target = current.clone().sub(playerPosition).normalize().add(current);
        speed = 5.2;
      } else if (current.distanceTo(this.origin) > 2.5) {
        target = this.origin;
        speed = 2.2;
      }
    } else if (this.kind === 'wolf' && distance < 13) {
      if (distance > 1.8) {
        target = playerPosition;
        speed = 3.5;
      } else if (this.attackCooldown === 0) {
        callbacks.damagePlayer(9);
        this.attackCooldown = 1.35;
      }
    } else if (this.kind === 'bear' && distance < 10) {
      if (distance > 2.5) {
        target = playerPosition;
        speed = 2.45;
      } else if (this.attackCooldown === 0) {
        callbacks.damagePlayer(19);
        this.attackCooldown = 1.9;
      }
    } else if (current.distanceTo(this.origin) > 1.5) {
      target = this.origin;
      speed = 1.5;
    }

    let dx = 0;
    let dz = 0;
    if (target) {
      const direction = target.clone().sub(current).setY(0);
      if (direction.lengthSq() > 0.01) {
        direction.normalize();
        dx = direction.x * speed * delta;
        dz = direction.z * speed * delta;
        this.model.rotation.y = Math.atan2(direction.x, direction.z);
        this.phase += delta * speed * 5;
        for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.x = Math.sin(this.phase + i * Math.PI / 2) * 0.48;
      }
    }
    this.controller.computeColliderMovement(this.collider, { x: dx, y: -0.1, z: dz });
    const movement = this.controller.computedMovement();
    this.body.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: Math.max(0.62, position.y + movement.y),
      z: position.z + movement.z,
    });
    this.model.position.set(position.x + movement.x, 0, position.z + movement.z);
    this.healthBarTrack.quaternion.copy(this.model.quaternion).invert();
    this.healthBar.quaternion.copy(this.healthBarTrack.quaternion);
    this.healthBar.scale.x = Math.max(0.01, this.health / (this.kind === 'bear' ? 100 : this.kind === 'wolf' ? 62 : 34));
    this.healthBar.position.x = -(1 - this.healthBar.scale.x) * 0.38;
  }

  takeDamage(amount: number): void {
    if (this.mood === 'dead' || this.mood === 'tamed') return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.mood = 'dead';
  }

  tame(): void {
    this.mood = 'tamed';
    this.health = Math.max(this.health, 1);
  }

  dispose(): void {
    this.physics.removeCharacterController(this.controller);
    this.physics.removeRigidBody(this.body);
  }
}
