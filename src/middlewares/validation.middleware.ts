import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Update request with transformed/validated data
      if (validatedData.body) {
        req.body = validatedData.body;
      }
      if (validatedData.query) {
        req.query = validatedData.query as any;
      }
      if (validatedData.params) {
        req.params = validatedData.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages,
        });
        return;
      }
      next(error);
    }
  };
};
