import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

it('limits repeated password reset email requests from one address', async () => {
  const module = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
    controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: { forgotPassword: async () => ({ success: true }) } },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
  }).compile();
  const app = module.createNestApplication();
  await app.listen(0, '127.0.0.1');
  try {
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const response = await fetch(`${await app.getUrl()}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'member@example.com' }),
      });
      statuses.push(response.status);
      await response.text();
    }
    expect(statuses).toEqual([201, 201, 201, 429]);
  } finally { await app.close(); }
});
