import React from 'react';
import { Package, Mountain, Droplets, Shield } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useAppStore } from '../../store/appStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { Button, SegmentedControl, SliderControl } from '../UI';
import { MapSlotPicker } from './MapSlotPicker';

export const PbrMicroGeometrySection: React.FC = React.memo(() => {
  const materialPackingMode = usePbrMaterialStore((s) => s.materialPackingMode);
  const setMaterialPackingMode = usePbrMaterialStore((s) => s.setMaterialPackingMode);
  const roughnessFactor = usePbrMaterialStore((s) => s.roughnessFactor);
  const metalnessFactor = usePbrMaterialStore((s) => s.metalnessFactor);
  const aoIntensity = usePbrMaterialStore((s) => s.aoIntensity);
  const openOrmPacker = useAppStore((s) => s.openOrmPacker);

  const setRoughnessFactor = (v: number) => setMaterialProperty('roughnessFactor', v);
  const setMetalnessFactor = (v: number) => setMaterialProperty('metalnessFactor', v);
  const setAoIntensity = (v: number) => setMaterialProperty('aoIntensity', v);

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-action shrink-0" />
          <h3 className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
            PBR Material
          </h3>
        </div>
        {/* Mode Switcher */}
        <SegmentedControl
          value={materialPackingMode}
          onChange={(val) => {
            const mode = val as 'orm' | 'metalRoughness' | 'separate';
            setMaterialPackingMode(mode);
            setMaterialProperty('materialPackingMode' as any, mode);
          }}
          options={[
            { value: 'orm', label: 'Packed ORM' },
            { value: 'metalRoughness', label: 'glTF Metal-Rough' },
            { value: 'separate', label: '3 Separate Maps' }
          ]}
          size="xs"
        />
      </div>

      {materialPackingMode === 'orm' && (
        /* Mode A: ORM Combined */
        <div className="space-y-3">
          <MapSlotPicker
            slot="orm"
            embeddedInSection={false}
            title="ORM Map"
            icon={<Package className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No ORM map (Drop image here)"
            subText="Packed PBR (R=AO, G=Rough, B=Metal) • WebP / PNG / JPG"
            addVariantLabel="Add ORM Variant (Drop image here)"
            pickTitle="Select ORM Map"
          />
          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Open Sharp ORM Packer
          </Button>
        </div>
      )}

      {materialPackingMode === 'metalRoughness' && (
        /* Mode B: glTF Metal-Roughness (combined G=Rough, B=Metal) + Optional AO */
        <div className="space-y-3">
          <MapSlotPicker
            slot="metalRoughness"
            embeddedInSection={false}
            title="Metal-Roughness Map"
            icon={<Package className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No glTF Metal-Roughness map (Drop image here)"
            subText="glTF Standard (G=Roughness, B=Metalness) • WebP / PNG / JPG"
            addVariantLabel="Add Metal-Roughness Variant (Drop image here)"
            pickTitle="Select Metal-Roughness Map"
          />

          <MapSlotPicker
            slot="ao"
            embeddedInSection={false}
            title="Occlusion Map (Optional)"
            icon={<Mountain className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No occlusion map (Optional)"
            subText="Ambient Occlusion (AO) • WebP / PNG / JPG"
            addVariantLabel="Add AO Variant (Drop image here)"
            pickTitle="Select AO Map"
          />

          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Pack Metal-Roughness + AO into ORM.webp via Sharp
          </Button>
        </div>
      )}

      {materialPackingMode === 'separate' && (
        /* Mode C: 3 Separate Maps */
        <div className="space-y-3">
          {/* AO Slot */}
          <MapSlotPicker
            slot="ao"
            embeddedInSection={false}
            title="Occlusion Map"
            icon={<Mountain className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No occlusion map (Drop image here)"
            subText="Ambient Occlusion (AO) • WebP / PNG / JPG"
            addVariantLabel="Add AO Variant (Drop image here)"
            pickTitle="Select AO Map"
          />

          {/* Roughness Slot */}
          <MapSlotPicker
            slot="roughness"
            embeddedInSection={false}
            title="Roughness Map"
            icon={<Droplets className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No roughness map (Drop image here)"
            subText="Roughness / Micro-surface • WebP / PNG / JPG"
            addVariantLabel="Add Roughness Variant (Drop image here)"
            pickTitle="Select Roughness Map"
          />

          {/* Metalness Slot */}
          <MapSlotPicker
            slot="metalness"
            embeddedInSection={false}
            title="Metalness Map"
            icon={<Shield className="w-5 h-5 text-action shrink-0" />}
            placeholderText="No metalness map (Drop image here)"
            subText="Metalness / Conductivity • WebP / PNG / JPG"
            addVariantLabel="Add Metalness Variant (Drop image here)"
            pickTitle="Select Metalness Map"
          />

          {/* Action to pack these 3 */}
          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Pack channels into ORM.webp via Sharp
          </Button>
        </div>
      )}

      {/* Live Material Multipliers */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline">
        <SliderControl
          label="Roughness:"
          value={roughnessFactor}
          onChange={setRoughnessFactor}
          min={0.0}
          max={1.5}
          step={0.05}
          formatDecimals={2}
          compact
        />
        <SliderControl
          label="Metalness:"
          value={metalnessFactor}
          onChange={setMetalnessFactor}
          min={0.0}
          max={1.0}
          step={0.05}
          formatDecimals={2}
          compact
        />
        <SliderControl
          label="Occlusion:"
          value={aoIntensity}
          onChange={setAoIntensity}
          min={0.0}
          max={2.0}
          step={0.05}
          formatDecimals={2}
          compact
        />
      </div>
    </div>
  );
});

export default PbrMicroGeometrySection;
