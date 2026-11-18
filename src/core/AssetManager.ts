import * as THREE from 'three';

export class AssetManager {
  readonly materials = {
    ground: new THREE.MeshStandardMaterial({ color: 0x526348, roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x72804e, roughness: 1 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x493a2d, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x294a36, roughness: 0.95 }),
    leavesLight: new THREE.MeshStandardMaterial({ color: 0x496b43, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x77796f, roughness: 1 }),
    ruin: new THREE.MeshStandardMaterial({ color: 0x948b70, roughness: 0.92 }),
    water: new THREE.MeshStandardMaterial({ color: 0x4f9d9b, roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.84 }),
    player: new THREE.MeshStandardMaterial({ color: 0x9b6240, roughness: 0.82 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x3e5543, roughness: 0.9 }),
    wolf: new THREE.MeshStandardMaterial({ color: 0x77776b, roughness: 0.9 }),
    deer: new THREE.MeshStandardMaterial({ color: 0x98734e, roughness: 0.9 }),
    bear: new THREE.MeshStandardMaterial({ color: 0x49352c, roughness: 0.95 }),
    spirit: new THREE.MeshStandardMaterial({ color: 0x87d9d4, emissive: 0x278c93, emissiveIntensity: 1.8, transparent: true, opacity: 0.72 }),
  };

  createTree(scale = 1): THREE.Group {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.3, 5), this.materials.bark);
    trunk.position.y = 1.15;
    trunk.castShadow = true;
    tree.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.8, 6), this.materials.leaves);
    crown.position.y = 3.1;
    crown.castShadow = true;
    tree.add(crown);
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.76, 2.1, 6), this.materials.leavesLight);
    crown2.position.set(0.12, 4.0, 0.05);
    crown2.castShadow = true;
    tree.add(crown2);
    tree.scale.setScalar(scale);
    return tree;
  }

  createRock(scale: number): THREE.Mesh {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), this.materials.stone);
    rock.scale.set(scale * 1.1, scale * 0.7, scale);
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }
}
