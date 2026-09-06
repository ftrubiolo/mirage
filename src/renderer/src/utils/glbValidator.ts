import * as THREE from 'three';
import { ModelStats } from '../store/workbenchStore';

export function analyzeGlbHierarchy(scene: THREE.Object3D): ModelStats {
  let triangleCount = 0;
  let vertexCount = 0;
  let meshCount = 0;
  const materialsSet = new Set<string>();

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshCount++;
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;

      if (geom) {
        if (geom.index) {
          triangleCount += geom.index.count / 3;
        } else if (geom.attributes.position) {
          triangleCount += geom.attributes.position.count / 3;
        }

        if (geom.attributes.position) {
          vertexCount += geom.attributes.position.count;
        }
      }

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          materialsSet.add(m.name || `Material_${materialsSet.size + 1}`);
        });
      }
    }
  });

  // Calculate real-world bounding box at unit scale (1.0)
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);

  return {
    triangleCount: Math.round(triangleCount),
    vertexCount: Math.round(vertexCount),
    meshCount,
    materials: Array.from(materialsSet),
    dimensions: {
      width: Number(size.x.toFixed(3)),
      height: Number(size.y.toFixed(3)),
      depth: Number(size.z.toFixed(3))
    }
  };
}

export interface ScaleAuditResult {
  status: 'optimal' | 'warning' | 'error';
  message: string;
  detectedUnitHint: 'meters' | 'centimeters' | 'millimeters' | 'unknown';
}

export function auditModelScale(dimensions: { width: number; height: number; depth: number }): ScaleAuditResult {
  const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth);

  if (maxDim > 50) {
    // Highly likely millimeters (e.g. 850mm for a chair)
    return {
      status: 'error',
      message: `El modelo mide ${maxDim.toFixed(1)}m. Es muy probable que se haya exportado en milímetros (mm) en lugar de metros.`,
      detectedUnitHint: 'millimeters'
    };
  } else if (maxDim > 5) {
    // Likely centimeters (e.g. 85cm for a chair)
    return {
      status: 'warning',
      message: `El modelo mide ${maxDim.toFixed(1)}m. Podría estar exportado en centímetros (cm) en vez de metros.`,
      detectedUnitHint: 'centimeters'
    };
  } else if (maxDim < 0.05) {
    // Very tiny (less than 5cm)
    return {
      status: 'warning',
      message: `El modelo es sumamente pequeño (${(maxDim * 100).toFixed(1)}cm). Comprueba la escala de exportación.`,
      detectedUnitHint: 'unknown'
    };
  }

  return {
    status: 'optimal',
    message: `Escala correcta en metros (1 unidad = 1 metro). Dimensión máxima: ${maxDim.toFixed(2)}m.`,
    detectedUnitHint: 'meters'
  };
}
