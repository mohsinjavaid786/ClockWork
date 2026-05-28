import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _client!: SupabaseClient;

  onModuleInit() {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    this._client = createClient(url, key, { auth: { persistSession: false } });
    this.logger.log('Supabase client initialized');
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
