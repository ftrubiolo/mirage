import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

export interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  AlertVariant,
  { container: string; icon: React.ReactNode }
> = {
  info: {
    container:
      'bg-blue-50 text-blue-900 border-blue-300/60 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500/30',
    icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
  },
  warning: {
    container:
      'bg-amber-50 text-amber-900 border-amber-300/60 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-500/30',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
  },
  error: {
    container:
      'bg-rose-50 text-rose-900 border-rose-300/60 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-500/30',
    icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
  },
  success: {
    container:
      'bg-emerald-50 text-emerald-900 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500/30',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
  }
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  message,
  icon,
  action,
  onClose,
  className = ''
}) => {
  const config = VARIANT_STYLES[variant];

  return (
    <div
      className={`p-3 rounded-xs border text-xs flex items-start gap-3 shadow-xs ${config.container} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{icon || config.icon}</div>

      <div className="flex-1 min-w-0 space-y-0.5">
        {title && (
          <h5 className="font-primary font-bold uppercase tracking-wide text-xs">
            {title}
          </h5>
        )}
        <div className="leading-relaxed opacity-95">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          title="Dismiss notification"
          className="p-0.5 hover:opacity-75 rounded-xs transition-opacity cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
