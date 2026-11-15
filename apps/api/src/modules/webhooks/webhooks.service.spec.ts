import { WebhooksService } from './webhooks.service';
import { SupabaseService } from '../../supabase/supabase.service';

describe('Slack webhook destination', () => {
  const service = new WebhooksService({} as SupabaseService);
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it.each([
    'http://127.0.0.1/internal',
    'http://169.254.169.254/latest/meta-data/',
    'https://hooks.slack.com.evil.example/services/T/B/secret',
    'https://hooks.slack.com@evil.example/services/T/B/secret',
    'https://hooks.slack.com:444/services/T/B/secret',
  ])('rejects an unsafe destination before making a request: %s', async (url) => {
    let requests = 0;
    global.fetch = async () => { requests++; return new Response('ok'); };
    await expect(service.sendSlackMessage(url, 'test')).rejects.toThrow();
    expect(requests).toBe(0);
  });

  it('does not follow a redirect from Slack to another destination', async () => {
    let redirect: RequestRedirect | undefined;
    global.fetch = async (_url, options) => {
      redirect = options?.redirect;
      return new Response('ok');
    };
    await service.sendSlackMessage('https://hooks.slack.com/services/T/B/secret', 'test');
    expect(redirect).toBe('error');
  });
});
