import * as THREE from 'three';

export class CameraManager {
  mode: 'third-person' | 'first-person' = 'third-person';
  yaw = 0;
  pitch = -0.12;
  private readonly offset = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  toggle(): void {
    this.mode = this.mode === 'third-person' ? 'first-person' : 'third-person';
  }

  update(player: THREE.Group, lookX: number, lookY: number, sensitivity = 0.003): void {
    this.yaw -= lookX * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - lookY * sensitivity, -1.15, 0.65);
    player.rotation.y = this.yaw;
    player.visible = this.mode !== 'first-person';
    const targetHeight = this.mode === 'first-person' ? 1.48 : 1.05;
    this.lookTarget.set(player.position.x, player.position.y + targetHeight, player.position.z);
    if (this.mode === 'first-person') {
      this.camera.position.copy(this.lookTarget);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }
    const distance = 6.8;
    this.offset.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch) * distance,
      2.45 - Math.sin(this.pitch) * distance,
      -Math.cos(this.yaw) * Math.cos(this.pitch) * distance,
    );
    this.camera.position.copy(this.lookTarget).add(this.offset);
    this.camera.lookAt(this.lookTarget);
  }
}
