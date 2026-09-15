import { useState, useLayoutEffect, useEffect, RefObject } from 'react';

export type DropdownHorizontalPlacement = 'left' | 'right' | 'center';
export type DropdownVerticalPlacement = 'up' | 'down';

export interface DropdownPlacement {
  horizontal: DropdownHorizontalPlacement;
  vertical: DropdownVerticalPlacement;
}

/**
 * Unified position-aware dropdown placement hook.
 *
 * Automatically calculates both horizontal alignment and vertical orientation:
 * - Vertical: Opens downwards (`top-full mt-1`) if in upper half of window,
 *             or upwards (`bottom-full mb-1.5`) if in lower half (e.g. Status Bar).
 * - Horizontal: Centers under trigger button, snapping flush to `left-0` or
 *               `right-0` if near window boundaries.
 */
export function useDropdownPlacement(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  popupWidth: number = 224
): DropdownPlacement {
  const getComputed = (): DropdownPlacement => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const halfWidth = popupWidth / 2;
      const center = rect.left + rect.width / 2;

      const isLowerHalf = rect.top > window.innerHeight / 2;
      const vertical: DropdownVerticalPlacement = isLowerHalf ? 'up' : 'down';

      let horizontal: DropdownHorizontalPlacement = 'center';
      if (center - halfWidth < 12) {
        horizontal = 'left';
      } else if (center + halfWidth > window.innerWidth - 12) {
        horizontal = 'right';
      } else {
        horizontal = 'center';
      }
      return { horizontal, vertical };
    }
    return { horizontal: 'center', vertical: 'down' };
  };

  const [placement, setPlacement] = useState<DropdownPlacement>(getComputed);

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const computePlacement = () => {
      setPlacement(getComputed());
    };

    computePlacement();
    window.addEventListener('resize', computePlacement);
    return () => window.removeEventListener('resize', computePlacement);
  }, [isOpen, popupWidth, containerRef]);

  return placement;
}

export const getDropdownPlacementClass = (placement: DropdownPlacement | string): string => {
  if (typeof placement === 'string') {
    switch (placement) {
      case 'left':
        return 'left-0';
      case 'right':
        return 'right-0';
      case 'center':
      default:
        return 'left-1/2 -translate-x-1/2';
    }
  }

  const verticalClass = placement.vertical === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1';
  const horizontalClass =
    placement.horizontal === 'left'
      ? 'left-0'
      : placement.horizontal === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return `${verticalClass} ${horizontalClass}`;
};
