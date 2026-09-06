import React, { useState, useEffect } from 'react';
import {
  Box,
  Library,
  Settings,
  ArrowRight,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { LibraryEntry } from '../../types/library';
import { loadEntryIntoWorkbench, resetWorkbench } from '../../utils/libraryBridge';

interface HubViewProps {
  onOpenNewPieceModal?: () => void;
}

export const HubView: React.FC<HubViewProps> = () => {
  const { setView } = useAppStore();
  const { productName, modelFilePath } = useWorkbenchStore();

  const [recentEntries, setRecentEntries] = useState<LibraryEntry[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        if (window.electronAPI) {
          const list = await window.electronAPI.listLibraryEntries();
          if (list && Array.isArray(list)) {
            // Sort by updatedAt descending
            const sorted = [...list].sort(
              (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
            );
            setRecentEntries(sorted.slice(0, 6));
          }
        }
      } catch (err) {
        console.warn('Failed to load recent entries:', err);
      } finally {
        setIsLoadingRecents(false);
      }
    };

    fetchRecents();
  }, []);

  const handleOpenEmptyWorkbench = () => {
    resetWorkbench();
    setView('workbench');
  };

  const handleOpenExistingWorkbench = () => {
    setView('workbench');
  };

  const handleLoadRecent = async (entry: LibraryEntry) => {
    try {
      setLoadingSlug(entry.slug);
      await loadEntryIntoWorkbench(entry);
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full bg-canvas text-ink-primary overflow-hidden select-none">
      {/* 1/3 Left Panel: Title Container (vertically centered, left-aligned) & Action Button (bottom) */}
      <div className="w-full lg:w-1/3 xl:w-[32%] bg-surface-lowest border-b lg:border-b-0 lg:border-r border-hairline flex flex-col justify-between p-8 lg:p-10 shrink-0 select-none">
        {/* Center Vertically: Left-aligned Title & Subtitle */}
        <div className="flex-1 flex flex-col justify-center items-start text-left w-full space-y-4 py-8">
          {/* Top Tag: SERA ATELIER 3D OPERATIONS */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-xs bg-action text-white font-primary font-bold text-xs tracking-wider uppercase shadow-xs">
              SERA
            </span>
            <span className="text-xs font-mono text-ink-secondary uppercase tracking-wider">
              Atelier 3D Operations
            </span>
          </div>

          {/* Really Big Typography: MIRAGE */}
          <h1 className="font-primary font-black text-6xl sm:text-7xl xl:text-8xl tracking-tighter uppercase text-ink-primary leading-none">
            MIRAGE
          </h1>

          {/* Subtitle */}
          <p className="text-xs text-ink-secondary font-body leading-relaxed max-w-sm">
            Sistema de verificación geométrica, empaquetado de texturas PBR y gestión milimétrica de mobiliario de alta gama.
          </p>
        </div>

        {/* Bottom: Active Piece Button pushed down */}
        {modelFilePath && (
          <div className="w-full shrink-0 pt-4">
            <div className="p-3.5 bg-surface-low border border-hairline rounded-xs flex items-center justify-between gap-3 text-left shadow-xs">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase font-primary font-semibold text-ink-tertiary tracking-wider block">
                  Pieza en Curso
                </span>
                <span className="font-primary font-bold text-xs text-ink-primary truncate max-w-[150px] block" title={productName}>
                  {productName || 'Sin título'}
                </span>
              </div>
              <button
                onClick={handleOpenExistingWorkbench}
                className="px-3 py-1.5 bg-action hover:bg-action-hover text-white text-xs font-primary font-semibold uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2/3 Right Panel: 3 Action Cards & Recent Entries */}
      <div className="flex-1 h-full overflow-y-auto p-6 lg:p-10 min-w-0">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Three Primary Portals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Workbench */}
            <div
              onClick={handleOpenEmptyWorkbench}
              className="group p-5 bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs cursor-pointer flex flex-col justify-between transition-all hover:bg-surface-low/50"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xs bg-action-subtle text-action border border-action/20">
                    <Box className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-ink-tertiary group-hover:text-action transition-colors" />
                </div>
                <h2 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
                  Mesa de Trabajo 3D
                </h2>
                <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
                  Lienzo de renderizado PBR en tiempo real, calibración milimétrica de escalas y empaquetado Sharp ORM.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs font-primary font-semibold text-ink-primary group-hover:text-action uppercase tracking-wider">
                <span>Abrir Mesa de Trabajo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2: Library */}
            <div
              onClick={() => setView('library')}
              className="group p-5 bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs cursor-pointer flex flex-col justify-between transition-all hover:bg-surface-low/50"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xs bg-surface-container text-ink-primary border border-hairline">
                    <Library className="w-5 h-5 text-action" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-ink-tertiary group-hover:text-action transition-colors" />
                </div>
                <h2 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
                  Biblioteca de Piezas
                </h2>
                <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
                  Catálogo técnico local con modelos .GLB, texturas por ranura, instantáneas y estado de taller.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs font-primary font-semibold text-ink-primary group-hover:text-action uppercase tracking-wider transition-colors">
                <span>Explorar Biblioteca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3: Settings */}
            <div
              onClick={() => setView('settings')}
              className="group p-5 bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs cursor-pointer flex flex-col justify-between transition-all hover:bg-surface-low/50"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xs bg-surface-container text-ink-primary border border-hairline">
                    <Settings className="w-5 h-5 text-action" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-ink-tertiary group-hover:text-action transition-colors" />
                </div>
                <h2 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
                  Configuración del Atelier
                </h2>
                <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
                  Tema de visualización (Basalto/Mineral/Sistema), escala de densidad tipográfica y rutas del sistema.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs font-primary font-semibold text-ink-primary group-hover:text-action uppercase tracking-wider transition-colors">
                <span>Ajustar Preferencias</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Recent Pieces Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-action" />
                <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
                  Piezas Técnicas Recientes
                </h3>
              </div>
              <button
                onClick={() => setView('library')}
                className="text-xs font-primary font-semibold text-action uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingRecents ? (
              <div className="p-8 text-center text-xs text-ink-secondary font-mono">
                Cargando piezas recientes...
              </div>
            ) : recentEntries.length === 0 ? (
              <div className="p-8 bg-surface-lowest border border-dashed border-hairline rounded-xs text-center space-y-3">
                <p className="text-xs text-ink-secondary">
                  No hay piezas registradas en la biblioteca aún. Puedes comenzar cargando un modelo en la Mesa de Trabajo o creando una nueva pieza.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleOpenEmptyWorkbench}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-high text-xs font-semibold uppercase text-ink-primary rounded-xs border border-hairline transition-colors cursor-pointer"
                  >
                    Abrir Mesa Vacía
                  </button>
                  <button
                    onClick={() => setView('library')}
                    className="px-3 py-1.5 bg-action hover:bg-action-hover text-xs font-semibold uppercase text-white rounded-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Ir a Biblioteca
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.slug}
                    onClick={() => handleLoadRecent(entry)}
                    className="group bg-surface-lowest border border-hairline hover:border-action rounded-xs overflow-hidden shadow-xs cursor-pointer flex flex-col transition-all hover:bg-surface-low/40"
                  >
                    <div className="relative aspect-4/3 bg-canvas-stone flex items-center justify-center overflow-hidden border-b border-hairline">
                      {loadingSlug === entry.slug ? (
                        <div className="absolute inset-0 bg-surface-lowest/90 flex flex-col items-center justify-center gap-2 z-10">
                          <div className="w-5 h-5 rounded-full border-2 border-action border-t-transparent animate-spin" />
                          <span className="text-[10px] font-mono font-semibold text-action uppercase tracking-wider">Cargando...</span>
                        </div>
                      ) : entry.posterUrl ? (
                        <img
                          src={entry.posterUrl}
                          alt={entry.title}
                          className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Box className="w-8 h-8 text-ink-tertiary" />
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-ink-tertiary block truncate">
                          {entry.slug}
                        </span>
                        <h4 className="font-primary font-bold text-xs text-ink-primary line-clamp-1 group-hover:text-action transition-colors">
                          {entry.title}
                        </h4>
                      </div>

                      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono tabular-nums text-ink-secondary">
                        <span>{entry.stats ? `${entry.stats.triangleCount.toLocaleString()} polys` : '—'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-ink-tertiary group-hover:text-action transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
