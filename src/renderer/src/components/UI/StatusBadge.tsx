import React from 'react';

export type StatusVariant =
  | 'active'
  | 'pending'
  | 'workshop'
  | 'dispatched'
  | 'delivered'
  | 'madeToOrder'
  | 'preorder'
  | 'critical'
  | 'neutral';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const defaultLabels: Record<StatusVariant, string> = {
  active: 'En Stock',
  pending: 'En Revisión',
  workshop: 'En Taller',
  dispatched: 'En Camino',
  delivered: 'Entregado',
  madeToOrder: 'Bajo Pedido',
  preorder: 'Preventa',
  critical: 'Crítico',
  neutral: 'Archivo'
};

const variantClasses: Record<StatusVariant, string> = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30',
  pending: 'bg-amber-50 text-amber-800 border-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30',
  workshop: 'bg-blue-50 text-blue-800 border-blue-300/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30',
  dispatched: 'bg-indigo-50 text-indigo-800 border-indigo-300/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/30',
  delivered: 'bg-teal-50 text-teal-800 border-teal-300/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-500/30',
  madeToOrder: 'bg-orange-50 text-orange-800 border-orange-300/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/30',
  preorder: 'bg-purple-50 text-purple-800 border-purple-300/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/30',
  critical: 'bg-rose-50 text-rose-800 border-rose-300/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30',
  neutral: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700/60'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  const label = children !== undefined ? children : defaultLabels[variant];

  return (
    <span
      className={`inline-flex items-center font-body font-medium uppercase tracking-wider border rounded-xs select-none ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {label}
    </span>
  );
};
