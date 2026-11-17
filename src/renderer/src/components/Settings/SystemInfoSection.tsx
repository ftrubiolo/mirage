import React from 'react';
import { Info } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Card, CardHeader, CardBody } from '../UI/Card';
import { Badge } from '../UI/Badge';

export const SystemInfoSection: React.FC = () => {
  const libraryPath = useAppStore((s) => s.libraryPath);

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
          System Information
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Rendering engine, runtime environment, and metrology details.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-action" />
              <h2 className="font-primary font-bold uppercase tracking-wider text-ink-primary text-sm">
                Mirage 3D Workbench
              </h2>
            </div>
            <p className="text-xs text-ink-secondary font-mono">
              High-fidelity dimensional inspection and PBR material calibration environment
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="action" size="sm" mono>
              v1.0.1
            </Badge>
            <Badge variant="neutral" size="sm">
              Production
            </Badge>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-surface-low rounded-xs border border-hairline/60">
              <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block mb-1">
                3D Graphics Pipeline
              </span>
              <span className="font-mono text-ink-primary">
                Three.js r184 • WebGL2 • React Three Fiber
              </span>
            </div>

            <div className="p-3 bg-surface-low rounded-xs border border-hairline/60">
              <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block mb-1">
                Texture Processing
              </span>
              <span className="font-mono text-ink-primary">
                Sharp ORM Packer • Canvas 2D Fallback
              </span>
            </div>

            <div className="p-3 bg-surface-low rounded-xs border border-hairline/60">
              <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block mb-1">
                Runtime Environment
              </span>
              <span className="font-mono text-ink-primary">
                Electron 34 • Node 22 • Chromium 132
              </span>
            </div>

            <div className="p-3 bg-surface-low rounded-xs border border-hairline/60">
              <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block mb-1">
                Data Directory
              </span>
              <span className="font-mono text-ink-primary truncate block" title={libraryPath}>
                {libraryPath || '~/.local/share/mirage/'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-hairline text-xs text-ink-tertiary">
            Built for 3D asset verification, PBR material calibration, and web/AR package delivery.
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
