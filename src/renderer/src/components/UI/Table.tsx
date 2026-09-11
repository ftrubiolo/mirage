import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table: React.FC<TableProps> = ({
  containerClassName = '',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-surface-lowest border border-hairline rounded-xs shadow-xs overflow-hidden w-full ${containerClassName}`}
    >
      <div className="overflow-x-auto w-full">
        <table className={`w-full text-left border-collapse ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <thead
      className={`bg-surface-low border-b border-hairline text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary select-none ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <tbody className={`divide-y divide-hairline font-body ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  clickable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  selected = false,
  clickable = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <tr
      className={`transition-colors ${
        selected
          ? 'bg-action-subtle/30'
          : clickable
            ? 'hover:bg-surface-container/40 cursor-pointer'
            : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  mono?: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({
  mono = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <td
      className={`px-4 py-3 text-xs text-ink-primary ${
        mono ? 'font-mono tabular-nums' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};
