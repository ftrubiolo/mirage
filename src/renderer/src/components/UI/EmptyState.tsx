import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`p-8 bg-surface-lowest border border-dashed border-hairline rounded-xs text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      {icon && <div className="text-ink-tertiary mb-1">{icon}</div>}
      {title && (
        <h4 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
          {title}
        </h4>
      )}
      <p className="text-xs text-ink-secondary max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="pt-2 flex items-center gap-3">{action}</div>}
    </div>
  );
};
