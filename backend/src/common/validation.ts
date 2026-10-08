import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
export function parse<T>(schema:z.ZodType<T>,input:unknown):T {const r=schema.safeParse(input);if(!r.success)throw new BadRequestException(r.error.issues.map(i=>`${i.path.join('.')||'Datos'}: ${i.message}`).join('; '));return r.data;}
export const slug=z.enum(['ronaldo','scarlet']);
export const password=z.string().min(4,'Mínimo 4 caracteres').max(128,'Máximo 128 caracteres');
export const uuid=z.uuid();
export const pageSchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1)});
