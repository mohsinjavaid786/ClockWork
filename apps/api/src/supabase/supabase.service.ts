import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
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

  get client(): SupabaseClient {
    return this._client;
  }

  /** Use only for auth calls that mutate session state. Never use for DB queries. */
  get authClient(): SupabaseClient {
    return this._authClient;
  }
}
