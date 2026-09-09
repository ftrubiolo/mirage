import { describe, it, expect } from 'vitest';
import {
  isValidHex,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hexToHsv,
  hsvToHex
} from '@renderer/utils/colorUtils';

describe('colorUtils', () => {
  describe('isValidHex', () => {
    it('validates 3-digit and 6-digit hex strings', () => {
      expect(isValidHex('#fff')).toBe(true);
      expect(isValidHex('#000')).toBe(true);
      expect(isValidHex('#a1c')).toBe(true);
      expect(isValidHex('#ffffff')).toBe(true);
      expect(isValidHex('#000000')).toBe(true);
      expect(isValidHex('#1a2b3c')).toBe(true);
      expect(isValidHex('#ABCDEF')).toBe(true);
    });

    it('trims whitespace before validation', () => {
      expect(isValidHex('  #ffffff  ')).toBe(true);
      expect(isValidHex('\n#abc\t')).toBe(true);
    });

    it('rejects invalid hex formats', () => {
      expect(isValidHex('ffffff')).toBe(false); // missing #
      expect(isValidHex('#ffff')).toBe(false); // 4 digits
      expect(isValidHex('#fffff')).toBe(false); // 5 digits
      expect(isValidHex('#fffffff')).toBe(false); // 7 digits
      expect(isValidHex('#xyz123')).toBe(false); // invalid characters
      expect(isValidHex('#12g')).toBe(false);
      expect(isValidHex('')).toBe(false);
    });
  });

  describe('normalizeHex', () => {
    it('expands 3-digit hex to 6 digits', () => {
      expect(normalizeHex('#fff')).toBe('#ffffff');
      expect(normalizeHex('#f0a')).toBe('#ff00aa');
      expect(normalizeHex('#123')).toBe('#112233');
    });

    it('prepends missing # prefix', () => {
      expect(normalizeHex('ffffff')).toBe('#ffffff');
      expect(normalizeHex('abc')).toBe('#aabbcc');
      expect(normalizeHex('4a90e2')).toBe('#4a90e2');
    });

    it('converts uppercase to lowercase', () => {
      expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
      expect(normalizeHex('#1A2B3C')).toBe('#1a2b3c');
    });
  });

  describe('hexToRgb', () => {
    it('converts standard 6-digit hex to RGB components', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles 3-digit shorthand hex codes', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('falls back to white for invalid hex inputs', () => {
      expect(hexToRgb('#invalid')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#zzzzzz')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB numbers to 6-digit hex string', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('clamps negative values to 0', () => {
      expect(rgbToHex(-50, -10, 0)).toBe('#000000');
    });

    it('clamps values greater than 255 to 255', () => {
      expect(rgbToHex(300, 500, 256)).toBe('#ffffff');
      expect(rgbToHex(255, 300, 0)).toBe('#ffff00');
    });

    it('rounds fractional RGB values', () => {
      expect(rgbToHex(254.8, 0.2, 127.6)).toBe('#ff0080');
    });
  });

  describe('rgbToHsv and hsvToRgb', () => {
    it('converts primary colors between RGB and HSV', () => {
      const redHsv = rgbToHsv(255, 0, 0);
      expect(redHsv).toEqual({ h: 0, s: 1, v: 1 });
      expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 });

      const greenHsv = rgbToHsv(0, 255, 0);
      expect(greenHsv).toEqual({ h: 120, s: 1, v: 1 });
      expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 });

      const blueHsv = rgbToHsv(0, 0, 255);
      expect(blueHsv).toEqual({ h: 240, s: 1, v: 1 });
      expect(hsvToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('converts secondary colors accurately', () => {
      const yellowHsv = rgbToHsv(255, 255, 0);
      expect(yellowHsv).toEqual({ h: 60, s: 1, v: 1 });
      expect(hsvToRgb(60, 1, 1)).toEqual({ r: 255, g: 255, b: 0 });

      const cyanHsv = rgbToHsv(0, 255, 255);
      expect(cyanHsv).toEqual({ h: 180, s: 1, v: 1 });
      expect(hsvToRgb(180, 1, 1)).toEqual({ r: 0, g: 255, b: 255 });

      const magentaHsv = rgbToHsv(255, 0, 255);
      expect(magentaHsv).toEqual({ h: 300, s: 1, v: 1 });
      expect(hsvToRgb(300, 1, 1)).toEqual({ r: 255, g: 0, b: 255 });
    });

    it('handles neutral achromatic colors (black, white, gray)', () => {
      expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
      expect(hsvToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });

      expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 1 });
      expect(hsvToRgb(0, 0, 1)).toEqual({ r: 255, g: 255, b: 255 });

      const grayHsv = rgbToHsv(128, 128, 128);
      expect(grayHsv.s).toBe(0);
      expect(grayHsv.v).toBeCloseTo(0.5, 1);
    });

    it('clamps HSV inputs within safe ranges in hsvToRgb', () => {
      // Out of bounds hue (wraparound)
      const wrappedPositive = hsvToRgb(420, 1, 1); // 420 % 360 = 60 (yellow)
      expect(wrappedPositive).toEqual({ r: 255, g: 255, b: 0 });

      const wrappedNegative = hsvToRgb(-60, 1, 1); // -60 + 360 = 300 (magenta)
      expect(wrappedNegative).toEqual({ r: 255, g: 0, b: 255 });

      // Out of bounds saturation and value clamping
      const overSaturated = hsvToRgb(0, 2.5, 1);
      expect(overSaturated).toEqual({ r: 255, g: 0, b: 0 });

      const negativeValue = hsvToRgb(120, 1, -0.5);
      expect(negativeValue).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('hexToHsv and hsvToHex round-trips', () => {
    it('performs accurate round-trip conversions', () => {
      const testHexes = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#ffff00'];
      for (const hex of testHexes) {
        const hsv = hexToHsv(hex);
        const backToHex = hsvToHex(hsv.h, hsv.s, hsv.v);
        expect(backToHex).toBe(hex);
      }
    });

    it('maintains color fidelity on intermediate hues', () => {
      const orange = '#ff8000';
      const hsv = hexToHsv(orange);
      expect(hsv.h).toBe(30);
      expect(hsv.s).toBe(1);
      expect(hsv.v).toBe(1);

      const reconstructed = hsvToHex(hsv.h, hsv.s, hsv.v);
      expect(reconstructed).toBe(orange);
    });
  });
});
