import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  hoverable = false,
  selected = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-surface-lowest border rounded-xs shadow-xs transition-all ${
        selected
          ? 'border-action ring-1 ring-action/30'
          : hoverable
            ? 'border-hairline hover:border-hairline-strong hover:bg-surface-low/50 cursor-pointer'
            : 'border-hairline'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  bordered = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-4 ${bordered ? 'border-b border-hairline' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  bordered = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-4 ${bordered ? 'border-t border-hairline' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
  className?: string;
  accentIcon?: boolean;
}

export const PortalCard: React.FC<PortalCardProps> = ({
  icon,
  title,
  description,
  actionText,
  onClick,
  className = '',
  accentIcon = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`group p-5 bg-surface-lowest border border-hairline hover:border-hairline-strong rounded-xs shadow-xs cursor-pointer flex flex-col justify-between transition-all hover:bg-surface-low/50 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-2.5 rounded-xs border ${
              accentIcon
                ? 'bg-action-subtle text-action border-action/20'
                : 'bg-surface-container text-ink-primary border-hairline'
            }`}
          >
            {icon}
          </div>
          <ArrowUpRight className="w-4 h-4 text-ink-tertiary group-hover:text-action transition-colors" />
        </div>
        <h2 className="font-primary font-bold text-sm uppercase tracking-wide text-ink-primary">
          {title}
        </h2>
        <p className="text-xs text-ink-secondary font-body mt-1 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs font-primary font-semibold text-ink-primary group-hover:text-action uppercase tracking-wider transition-colors">
        <span>{actionText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
