import { z } from 'zod';

const additionalInformationProductConfigSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
  position: z.number().min(1, 'Position is required').max(6, 'Maximum 6 position are allowed'),
  selected: z.boolean().optional(),
});

export const updateAdditionalInformationProductConfigSchema = z.object({
  body: z.object({
    additionalInformationProductList: z
      .array(additionalInformationProductConfigSchema)
      .min(1, 'At least one additional information product is required')
      .max(6, 'Maximum 6 additional information product are allowed')
      .refine(
        additionalInformationProductList => {
          const positions = additionalInformationProductList.map(item => item.position);
          const uniquePositions = new Set(positions);
          return positions.length === uniquePositions.size;
        },
        {
          message: 'Duplicate additional information product position are not allowed',
        }
      )
      .refine(
        additionalInformationProductList => {
          const selectedCount = additionalInformationProductList.filter(
            item => item.selected === true
          ).length;
          return selectedCount <= 1;
        },
        {
          message: 'Only one additional information product can be selected',
        }
      ),
  }),
});

export type UpdateAdditionalInformationProductInput = z.infer<
  typeof updateAdditionalInformationProductConfigSchema
>;
