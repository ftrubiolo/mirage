import React from 'react';

export interface BrandIconProps {
  size?: number;
  className?: string;
}

/**
 * Mirage primary brand mark ("M Horizon"):
 * architectural M silhouette over a mirrored optical datum line.
 */
export const MirageLogo: React.FC<BrandIconProps> = ({
  size = 20,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 14.5V6.5L12 13L20.5 6.5V14.5"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M3.5 17.25H20.5"
        stroke="var(--action)"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path
        d="M6.75 20H17.25"
        stroke="var(--action)"
        strokeWidth="1.35"
        strokeOpacity="0.55"
        strokeLinecap="square"
      />
    </svg>
  );
};

/**
 * Functional 3D workbench & metrology icon ("Metrology Triad"):
 * bounding-box corner brackets framing a centered 3D axis gizmo.
 */
export const MetrologyTriadIcon: React.FC<BrandIconProps> = ({
  size = 18,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 8V3.5H8M16 3.5H20.5V8M20.5 16V20.5H16M8 20.5H3.5V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path
        d="M12 6.25V12.5M12 12.5L17.25 15.5M12 12.5L6.75 15.5"
        stroke="var(--action)"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="1.65" fill="currentColor" />
    </svg>
  );
};
