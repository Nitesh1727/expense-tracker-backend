import { z } from 'zod';

const idParamSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
});

export { idParamSchema };
