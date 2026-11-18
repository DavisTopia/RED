import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { AssetManager } from '../core/AssetManager';

export class World {
  readonly scene = new THREE.Scene();
  readonly spawn = new THREE.Vector3(0, 0.1, 13);
  readonly landmarks = [
    { name: 'Elderwatch Ruins', position: new THREE.Vector3(-15, 0, -13) },
    { name: 'Mossfall Cave', position: new THREE.Vector3(19, 0, -4) },
    { name: 'Whispering River', position: new THREE.Vector3(0, 0, -4) },
  ];
  private readonly colliders: RAPIER.RigidBody[] = [];

  constructor(private readonly assets: AssetManager, private readonly physics: RAPIER.World) {
    this.scene.background = new THREE.Color(0x9fb8b1);
    this.scene.fog = new THREE.FogExp2(0x9fb8b1, 0.0085);
    this.buildTerrain();
    this.buildMountains();
    this.buildRiver();
    this.buildForest();
    this.buildRuin();
    this.buildCave();
    this.buildLighting();
    this.addFloorCollider(0, -0.5, 0, 120, 1, 120);
  }

  private buildTerrain(): void {
    const geometry = new THREE.PlaneGeometry(120, 120, 90, 90);
    const position = geometry.getAttribute('position');
    const colors: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const distance = Math.hypot(x, y);
      const height = Math.sin(x * 0.13) * 0.42 + Math.cos(y * 0.11) * 0.36
        + Math.max(0, distance - 25) * 0.09 + Math.sin(x * 0.37 + y * 0.2) * 0.11;
      position.setZ(i, height);
      const tint = 0.88 + Math.sin(x * 0.23) * 0.04 + Math.cos(y * 0.18) * 0.05;
      colors.push(0.30 * tint, 0.38 * tint, 0.25 * tint);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const meadow = new THREE.Mesh(new THREE.CircleGeometry(22, 48), this.assets.materials.grass);
    meadow.rotation.x = -Math.PI / 2;
    meadow.position.y = 0.025;
    meadow.receiveShadow = true;
    this.scene.add(meadow);
  }

  private buildMountains(): void {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 49 + (i % 3) * 4;
      const height = 22 + (i % 5) * 2.5;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(13 + (i % 4) * 2, height, 7, 3),
        new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0x64776e : 0x718178, roughness: 1, flatShading: true }),
      );
      mountain.position.set(Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius);
      mountain.rotation.y = angle * 0.41;
      mountain.castShadow = true;
      this.scene.add(mountain);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, height * 0.27, 7),
        new THREE.MeshStandardMaterial({ color: 0xc3c9bd, roughness: 1, flatShading: true }),
      );
      cap.position.set(mountain.position.x, height * 0.82, mountain.position.z);
      cap.rotation.y = mountain.rotation.y;
      this.scene.add(cap);
    }
  }

  private buildRiver(): void {
    const points = [
      new THREE.Vector3(-30, 0, -3), new THREE.Vector3(-19, 0, -9),
      new THREE.Vector3(-8, 0, -4), new THREE.Vector3(2, 0, -8),
      new THREE.Vector3(12, 0, -2), new THREE.Vector3(30, 0, -6),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const water = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, 1.65, 8, false),
      this.assets.materials.water,
    );
    water.position.y = 0.17;
    water.scale.y = 0.12;
    this.scene.add(water);
    const bank = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, 2.05, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x5e694c, roughness: 1 }),
    );
    bank.position.y = 0.04;
    bank.scale.y = 0.09;
    this.scene.add(bank);
  }

  private buildForest(): void {
    let seed = 93751;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 175; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 20 + random() * 29;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.hypot(x - this.spawn.x, z - this.spawn.z) < 8) continue;
      if (Math.abs(z + 5) < 3.5 && Math.abs(x) < 35) continue;
      if (Math.hypot(x + 15, z + 13) < 7 || Math.hypot(x - 19, z + 4) < 7) continue;
      const tree = this.assets.createTree(0.75 + random() * 0.55);
      tree.position.set(x, 0, z);
      tree.rotation.y = random() * Math.PI * 2;
      this.scene.add(tree);
      if (i % 3 === 0) this.addTrunkCollider(x, z, 0.42);
      if (i % 2 === 0) {
        const rock = this.assets.createRock(0.35 + random() * 1.4);
        rock.position.set(x + (random() - 0.5) * 4, 0.3, z + (random() - 0.5) * 4);
        this.scene.add(rock);
      }
    }
    for (let i = 0; i < 160; i++) {
      const x = (random() - 0.5) * 48;
      const z = (random() - 0.5) * 44;
      if (Math.hypot(x - this.spawn.x, z - this.spawn.z) < 3) continue;
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.12 + random() * 0.15, 0.35 + random() * 0.35, 4),
        i % 4 === 0 ? this.assets.materials.leavesLight : this.assets.materials.grass,
      );
      grass.position.set(x, 0.18, z);
      grass.rotation.z = (random() - 0.5) * 0.55;
      this.scene.add(grass);
    }
  }

  private buildRuin(): void {
    const center = new THREE.Vector3(-15, 0, -13);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 0.55, 8), this.assets.materials.ruin);
    platform.position.set(center.x, 0.2, center.z);
    platform.receiveShadow = true;
    this.scene.add(platform);
    const pillars = [
      [-4, -2.7, 3.3], [4, -2.7, 3.3], [-4, 2.7, 3.3], [4, 2.7, 1.7],
    ];
    for (const [dx, dz, height] of pillars) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, height, 7), this.assets.materials.ruin);
      pillar.position.set(center.x + dx, height / 2 + 0.42, center.z + dz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
      this.addFloorCollider(pillar.position.x, pillar.position.y, pillar.position.z, 1, height, 1);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8, 0.65, 0.8), this.assets.materials.ruin);
    lintel.position.set(center.x, 3.65, center.z - 2.7);
    lintel.castShadow = true;
    this.scene.add(lintel);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.2, 6, 9, Math.PI), this.assets.materials.ruin);
    arch.position.set(center.x, 1.1, center.z - 0.7);
    arch.rotation.z = Math.PI;
    this.scene.add(arch);
    const rune = new THREE.PointLight(0x78bdb2, 5, 7);
    rune.position.set(center.x, 1.7, center.z);
    this.scene.add(rune);
  }

  private buildCave(): void {
    const entrance = new THREE.Group();
    entrance.position.set(19, 0, -4);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4.4, 1), this.assets.materials.stone);
    rock.scale.set(1.7, 1.2, 1);
    rock.position.y = 2.1;
    rock.castShadow = true;
    entrance.add(rock);
    const mouth = new THREE.Mesh(
      new THREE.CircleGeometry(2.05, 16),
      new THREE.MeshBasicMaterial({ color: 0x111916, side: THREE.DoubleSide }),
    );
    mouth.position.set(0, 1.55, 3.65);
    entrance.add(mouth);
    const glow = new THREE.PointLight(0x75b5a3, 1.4, 8);
    glow.position.set(0, 1.2, 3);
    entrance.add(glow);
    this.scene.add(entrance);
  }

  private buildLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xd7e9e2, 0x45513b, 1.65));
    const sun = new THREE.DirectionalLight(0xffedcf, 2.15);
    sun.position.set(-25, 45, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    this.scene.add(sun);
  }

  private addFloorCollider(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    const body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2),
      body,
    );
    this.colliders.push(body);
  }

  private addTrunkCollider(x: number, z: number, radius: number): void {
    const body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 1.2, z));
    this.physics.createCollider(RAPIER.ColliderDesc.cylinder(1.2, radius), body);
    this.colliders.push(body);
  }

  dispose(): void {
    for (const body of this.colliders) this.physics.removeRigidBody(body);
  }
}
