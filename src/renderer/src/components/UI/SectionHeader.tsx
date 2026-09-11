import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  bordered = true,
  className = ''
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        bordered ? 'border-b border-hairline pb-2' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-action shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-ink-secondary font-body mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};
