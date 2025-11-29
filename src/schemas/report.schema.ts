import z from 'zod';

// Schema for get report return money delivery and return delivery
export const getReportReturnMoneyDeliveryAndReturnDeliverySchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid start date in ISO format'),
      endDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid end date in ISO format'),
      routeId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
        .optional(),
    }),
  })
  .refine(
    data => {
      const startDate = new Date(data.query.startDate);
      const endDate = new Date(data.query.endDate);
      return startDate <= endDate;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['query', 'startDate'],
    }
  )
  .refine(
    data => {
      const startDate = new Date(data.query.startDate);
      const endDate = new Date(data.query.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 45;
    },
    {
      message:
        'The difference between start date and end date must be less than or equal to 45 days',
      path: ['query', 'startDate'],
    }
  );
