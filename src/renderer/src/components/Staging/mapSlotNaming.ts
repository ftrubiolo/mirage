import { SlotName } from '../../store/pbrMaterialStore';
import { MapVariantItem } from '../../store/variantStore';

export const getNextSlotTargetType = (
  slot: SlotName,
  existingVariants: MapVariantItem[],
  slug: string
): string => {
  const hasBase = existingVariants.some((v) => {
    const fn = v.fileName || '';
    const name = v.name || '';
    return (
      fn.startsWith(`${slug}_${slot}.`) ||
      fn === `${slug}_${slot}` ||
      name === `${slug}_${slot}` ||
      name === slot
    );
  });

  if (!hasBase && existingVariants.length === 0) {
    return slot;
  }

  let index = 2;
  while (
    existingVariants.some((v) => {
      const fn = v.fileName || '';
      const name = v.name || '';
      return (
        fn.startsWith(`${slug}_${slot}-${index}.`) ||
        fn === `${slug}_${slot}-${index}` ||
        name === `${slug}_${slot}-${index}` ||
        name === `${slot}-${index}`
      );
    })
  ) {
    index++;
  }
  return `${slot}-${index}`;
};

export const getNextBaseColorTargetType = (
  existingVariants: MapVariantItem[],
  slug: string
): string => {
  return getNextSlotTargetType('baseColor', existingVariants, slug);
};
