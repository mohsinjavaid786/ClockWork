import { BadRequestException, Logger } from '@nestjs/common';

const logger = new Logger('Database');

interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Supabase/Postgres errors carry internal detail — table, column and constraint
// names, raw SQL — that must never reach an API client. Log the full error
// server-side for debugging, but return a generic 400 so we don't disclose the
// schema. Use this everywhere instead of `new BadRequestException(error.message)`.
export function dbError(error: SupabaseLikeError | null, context?: string): BadRequestException {
  const where = context ? `${context}: ` : '';
  logger.error(
    `${where}${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.trim(),
  );
  return new BadRequestException('The request could not be completed.');
}
