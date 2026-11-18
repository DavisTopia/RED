export type GraphicsProfileName = 'high' | 'balanced' | 'mobile';

export interface GraphicsConfig {
  profile: GraphicsProfileName;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  maxPixelRatio: number;
  textureAnisotropy: number;
  hemisphereLightIntensity: number;
  directionalLightIntensity: number;
  toneMappingExposure: number;
}

const PROFILES: Record<GraphicsProfileName, GraphicsConfig> = {
  high: {
    profile: 'high',
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    maxPixelRatio: 1.5,
    textureAnisotropy: 8,
    hemisphereLightIntensity: 1.65,
    directionalLightIntensity: 2.15,
    toneMappingExposure: 1.05,
  },
  balanced: {
    profile: 'balanced',
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    maxPixelRatio: 1.25,
    textureAnisotropy: 4,
    hemisphereLightIntensity: 1.65,
    directionalLightIntensity: 2.15,
    toneMappingExposure: 1.05,
  },
  mobile: {
    profile: 'mobile',
    antialias: false,
    shadows: false,
    shadowMapSize: 1024,
    maxPixelRatio: 1,
    textureAnisotropy: 2,
    hemisphereLightIntensity: 1.65,
    directionalLightIntensity: 2.15,
    toneMappingExposure: 1.05,
  },
};

export function selectGraphicsConfig(): GraphicsConfig {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 8;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const constrained = cores <= 4 || (deviceMemory !== undefined && deviceMemory <= 4);
  const profile: GraphicsProfileName = constrained
    ? 'mobile'
    : coarsePointer ? 'balanced' : 'high';
  const config = { ...PROFILES[profile] };

  if (coarsePointer) config.shadows = false;
  return config;
}
