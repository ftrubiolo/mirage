import React from 'react';
import { Moon, Sun, Laptop, Palette, Type } from 'lucide-react';
import { useAppStore, ThemeMode, FontDensity } from '../../store/appStore';
import { Card } from '../UI/Card';
import { SectionHeader } from '../UI/SectionHeader';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DensityOption {
  id: FontDensity;
  label: string;
  desc: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    mode: 'dark',
    label: 'Basalto (Oscuro)',
    desc: 'Carbón volcánico y roble quemado. Ideal para talleres y baja luminosidad.',
    icon: Moon
  },
  {
    mode: 'light',
    label: 'Mineral (Claro)',
    desc: 'Piedra caliza y lino natural. Diseñado para luz diurna de estudio.',
    icon: Sun
  },
  {
    mode: 'system',
    label: 'Automático (Sistema)',
    desc: 'Se adapta a las preferencias visuales del sistema operativo.',
    icon: Laptop
  }
];

const DENSITY_OPTIONS: DensityOption[] = [
  { id: 'standard', label: 'Estándar', desc: 'Espaciado amplio para pantallas de alta resolución' },
  { id: 'compact', label: 'Compacto', desc: 'Mayor densidad de datos y controles optimizados' },
  { id: 'dense', label: 'Denso', desc: 'Máxima compresión de métricas e inspección técnica' }
];

export const AppearanceSection: React.FC = () => {
  const { settings, setThemeMode, setFontDensity } = useAppStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
          Apariencia & Cromatismo
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Personaliza el entorno cromático de trabajo y la densidad de información en pantalla.
        </p>
      </div>

      {/* Theme Palette */}
      <section className="space-y-3">
        <SectionHeader
          title="Tema Visual"
          subtitle="Paleta de iluminación del entorno de trabajo"
          icon={<Palette className="w-4 h-4" />}
          bordered={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = settings.themeMode === opt.mode;

            return (
              <Card
                key={opt.mode}
                selected={isSelected}
                hoverable={!isSelected}
                onClick={() => setThemeMode(opt.mode)}
                className="p-4 flex flex-col justify-between cursor-pointer"
              >
                <div className="mb-3">
                  <div className={`w-fit p-2 rounded-xs border transition-colors ${
                    isSelected
                      ? 'bg-action-subtle text-action border-action/30'
                      : 'bg-surface-container border-hairline text-ink-secondary'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-primary font-bold text-xs uppercase tracking-wide text-ink-primary">
                    {opt.label}
                  </h3>
                  <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Font Density */}
      <section className="space-y-3 pt-4 border-t border-hairline">
        <SectionHeader
          title="Densidad de Interfaz"
          subtitle="Escalado de métricas y compactación de controles"
          icon={<Type className="w-4 h-4" />}
          bordered={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DENSITY_OPTIONS.map((opt) => {
            const isSelected = settings.fontDensity === opt.id;

            return (
              <Card
                key={opt.id}
                selected={isSelected}
                hoverable={!isSelected}
                onClick={() => setFontDensity(opt.id)}
                className="p-3.5 cursor-pointer"
              >
                <h3 className="font-primary font-bold text-xs uppercase text-ink-primary">
                  {opt.label}
                </h3>
                <p className="text-[11px] text-ink-secondary mt-1">
                  {opt.desc}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};
