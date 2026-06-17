import { Injectable, OnModuleInit, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Columns added by later migrations that the running code hard-depends on. If
// any are missing, the relevant feature returns opaque 400s at request time;
// the boot probe below surfaces the real cause (an unapplied migration) once,
// loudly, at startup instead.
const REQUIRED_COLUMNS: { table: string; column: string; migration: string }[] = [
  { table: 'time_entries', column: 'paused_seconds', migration: '005_pause_tracking' },
  { table: 'screenshots', column: 'thumbnail_path', migration: '007_screenshot_thumbnails' },
];

@Injectable()
export class SupabaseService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(SupabaseService.name);
  private _client!: SupabaseClient;
  private _authClient!: SupabaseClient;

  onModuleInit() {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    // DB/admin client: must stay session-free so every request runs as the
    // service_role (which bypasses RLS). Never call signInWithPassword on it.
    this._client = createClient(url, key, { auth: { persistSession: false } });
    // Isolated client for auth flows that set a session (e.g. signInWithPassword).
    // We only read the value such calls return, never this client's stored session,
    // so it never pollutes the DB client's role.
    this._authClient = createClient(url, key, { auth: { persistSession: false } });
    this.logger.log('Supabase client initialized');
  }

  // Best-effort schema sanity check: warn clearly if a migration the code relies
  // on hasn't been applied to this environment. Never throws — the API still
  // boots, but the logs point straight at the missing migration.
  async onApplicationBootstrap() {
    for (const { table, column, migration } of REQUIRED_COLUMNS) {
      const { error } = await this._client.from(table).select(column).limit(1);
      // 42703 = undefined_column. Any other error (e.g. transient) is ignored here.
      if (error?.code === '42703') {
        this.logger.error(
          `Missing column ${table}.${column} — run migration ${migration}. ` +
            `Features depending on it will fail until the migration is applied.`,
        );
      }
    }
  }

  get client(): SupabaseClient {
    return this._client;
  }

  /** Use only for auth calls that mutate session state. Never use for DB queries. */
  get authClient(): SupabaseClient {
    return this._authClient;
  }
}
