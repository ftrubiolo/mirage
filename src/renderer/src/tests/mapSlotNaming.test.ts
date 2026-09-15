import { describe, it, expect } from 'vitest';
import {
  detectMapSlotFromFileName,
  isImageFile,
  isModelFile,
  getNextSlotTargetType,
  getNextBaseColorTargetType
} from '../utils/mapSlotNaming';

describe('mapSlotNaming - detectMapSlotFromFileName', () => {
  describe('Standard _<map type> patterns', () => {
    it('detects baseColor maps with various suffixes and aliases', () => {
      expect(detectMapSlotFromFileName('chair_baseColor.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_basecolor.webp')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_base_color.jpg')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_base-color.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_base.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_albedo.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_diffuse.jpg')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_diff.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_color.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('chair_bc.png')).toBe('baseColor');
    });

    it('detects normal maps with various suffixes', () => {
      expect(detectMapSlotFromFileName('chair_normal.png')).toBe('normal');
      expect(detectMapSlotFromFileName('chair_norm.webp')).toBe('normal');
      expect(detectMapSlotFromFileName('chair_nor.jpg')).toBe('normal');
      expect(detectMapSlotFromFileName('chair_nrm.png')).toBe('normal');
      expect(detectMapSlotFromFileName('chair_normale.png')).toBe('normal');
    });

    it('detects ORM maps', () => {
      expect(detectMapSlotFromFileName('chair_orm.png')).toBe('orm');
      expect(detectMapSlotFromFileName('chair_arm.webp')).toBe('orm');
      expect(detectMapSlotFromFileName('chair_aorm.png')).toBe('orm');
    });

    it('detects metalRoughness maps (compound)', () => {
      expect(detectMapSlotFromFileName('chair_metalRoughness.png')).toBe('metalRoughness');
      expect(detectMapSlotFromFileName('chair_metalroughness.webp')).toBe('metalRoughness');
      expect(detectMapSlotFromFileName('chair_metallicroughness.png')).toBe('metalRoughness');
      expect(detectMapSlotFromFileName('chair_metallic_roughness.png')).toBe('metalRoughness');
      expect(detectMapSlotFromFileName('chair_metal_roughness.png')).toBe('metalRoughness');
      expect(detectMapSlotFromFileName('chair_mr.png')).toBe('metalRoughness');
    });

    it('detects roughness maps', () => {
      expect(detectMapSlotFromFileName('chair_roughness.png')).toBe('roughness');
      expect(detectMapSlotFromFileName('chair_rough.webp')).toBe('roughness');
      expect(detectMapSlotFromFileName('chair_glossiness.jpg')).toBe('roughness');
      expect(detectMapSlotFromFileName('chair_gloss.png')).toBe('roughness');
      expect(detectMapSlotFromFileName('chair_rgh.png')).toBe('roughness');
    });

    it('detects metalness maps', () => {
      expect(detectMapSlotFromFileName('chair_metalness.png')).toBe('metalness');
      expect(detectMapSlotFromFileName('chair_metallic.webp')).toBe('metalness');
      expect(detectMapSlotFromFileName('chair_metal.png')).toBe('metalness');
      expect(detectMapSlotFromFileName('chair_met.jpg')).toBe('metalness');
    });

    it('detects ambient occlusion (AO) maps', () => {
      expect(detectMapSlotFromFileName('chair_ao.png')).toBe('ao');
      expect(detectMapSlotFromFileName('chair_ambient_occlusion.png')).toBe('ao');
      expect(detectMapSlotFromFileName('chair_ambientocclusion.webp')).toBe('ao');
      expect(detectMapSlotFromFileName('chair_occlusion.png')).toBe('ao');
    });

    it('detects emissive maps', () => {
      expect(detectMapSlotFromFileName('chair_emissive.png')).toBe('emissive');
      expect(detectMapSlotFromFileName('chair_emission.webp')).toBe('emissive');
      expect(detectMapSlotFromFileName('chair_emit.jpg')).toBe('emissive');
      expect(detectMapSlotFromFileName('chair_glow.png')).toBe('emissive');
    });

    it('detects clearcoat maps', () => {
      expect(detectMapSlotFromFileName('chair_clearcoat.png')).toBe('clearcoat');
      expect(detectMapSlotFromFileName('chair_clear_coat.webp')).toBe('clearcoat');
      expect(detectMapSlotFromFileName('chair_coat.png')).toBe('clearcoat');
    });

    it('detects sheen maps', () => {
      expect(detectMapSlotFromFileName('chair_sheen.png')).toBe('sheen');
      expect(detectMapSlotFromFileName('chair_velvet.webp')).toBe('sheen');
    });

    it('detects transmission maps', () => {
      expect(detectMapSlotFromFileName('chair_transmission.png')).toBe('transmission');
      expect(detectMapSlotFromFileName('chair_trans.webp')).toBe('transmission');
    });

    it('detects alpha / opacity maps', () => {
      expect(detectMapSlotFromFileName('chair_alpha.png')).toBe('alpha');
      expect(detectMapSlotFromFileName('chair_opacity.webp')).toBe('alpha');
      expect(detectMapSlotFromFileName('chair_mask.png')).toBe('alpha');
      expect(detectMapSlotFromFileName('chair_transparency.png')).toBe('alpha');
    });

    it('detects displacement / height maps', () => {
      expect(detectMapSlotFromFileName('chair_displacement.png')).toBe('displacement');
      expect(detectMapSlotFromFileName('chair_disp.webp')).toBe('displacement');
      expect(detectMapSlotFromFileName('chair_height.png')).toBe('displacement');
      expect(detectMapSlotFromFileName('chair_bump.jpg')).toBe('displacement');
    });
  });

  describe('Modifier suffixes and resolutions', () => {
    it('handles resolution tags (_4k, _2k, _1k, etc.)', () => {
      expect(detectMapSlotFromFileName('T_Chair_BaseColor_4k.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('leather_normal_2k.webp')).toBe('normal');
      expect(detectMapSlotFromFileName('fabric_roughness_1k.jpg')).toBe('roughness');
      expect(detectMapSlotFromFileName('metal_orm_8k.png')).toBe('orm');
      expect(detectMapSlotFromFileName('wall_displacement_4096.png')).toBe('displacement');
    });

    it('handles normal space indicators (_gl, _dx)', () => {
      expect(detectMapSlotFromFileName('wood_normal_gl.png')).toBe('normal');
      expect(detectMapSlotFromFileName('wood_normal_gl_4k.png')).toBe('normal');
      expect(detectMapSlotFromFileName('stone_normal_dx.webp')).toBe('normal');
      expect(detectMapSlotFromFileName('stone_nor_gl_2k.png')).toBe('normal');
    });

    it('handles variant numbers and counters (_01, -1, v1)', () => {
      expect(detectMapSlotFromFileName('couch_baseColor-2.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('couch_baseColor_01.webp')).toBe('baseColor');
      expect(detectMapSlotFromFileName('couch_baseColor_v2.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('table_normal_02.png')).toBe('normal');
    });
  });

  describe('Path handling and edge cases', () => {
    it('handles full file paths on Windows and Unix', () => {
      expect(detectMapSlotFromFileName('/home/user/assets/chair_baseColor.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('C:\\Models\\Textures\\desk_normal.webp')).toBe('normal');
    });

    it('handles exact slot names without prefix', () => {
      expect(detectMapSlotFromFileName('baseColor.png')).toBe('baseColor');
      expect(detectMapSlotFromFileName('normal.png')).toBe('normal');
      expect(detectMapSlotFromFileName('orm.webp')).toBe('orm');
    });

    it('avoids false positives on words containing short abbreviations', () => {
      // "arm_chair" should not be detected as ORM because "arm" is the leading noun, not the map suffix
      expect(detectMapSlotFromFileName('arm_chair.png')).toBeNull();
      // "arm_chair_normal" should match normal, not arm/orm
      expect(detectMapSlotFromFileName('arm_chair_normal.png')).toBe('normal');
    });

    it('returns null for non-image files or unrecognized patterns', () => {
      expect(detectMapSlotFromFileName('chair_baseColor.glb')).toBeNull();
      expect(detectMapSlotFromFileName('chair_baseColor.gltf')).toBeNull();
      expect(detectMapSlotFromFileName('readme.txt')).toBeNull();
      expect(detectMapSlotFromFileName('config.json')).toBeNull();
      expect(detectMapSlotFromFileName('chair_unknown_map.png')).toBeNull();
      expect(detectMapSlotFromFileName('')).toBeNull();
    });
  });
});

describe('mapSlotNaming - file type checkers', () => {
  it('identifies image files by extension', () => {
    expect(isImageFile('test.png')).toBe(true);
    expect(isImageFile('test.PNG')).toBe(true);
    expect(isImageFile('test.jpg')).toBe(true);
    expect(isImageFile('test.webp')).toBe(true);
    expect(isImageFile('test.tga')).toBe(true);
    expect(isImageFile('test.hdr')).toBe(true);
    expect(isImageFile('test.glb')).toBe(false);
    expect(isImageFile('test.txt')).toBe(false);
  });

  it('identifies model files by extension', () => {
    expect(isModelFile('model.glb')).toBe(true);
    expect(isModelFile('model.GLB')).toBe(true);
    expect(isModelFile('model.gltf')).toBe(true);
    expect(isModelFile('model.png')).toBe(false);
  });
});
