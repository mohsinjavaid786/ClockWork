import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const proxyHops = Number(process.env['TRUST_PROXY_HOPS'] ?? 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5');
  }
  app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);

  app.setGlobalPrefix('api/v1');

  // Allow one or more comma-separated portal origins. Only fall back to
  // localhost in development — in production a missing ADMIN_URL must NOT
  // silently allow localhost with credentials, so we reject all origins and log
  // loudly instead of opening a credentialed hole.
  const isProd = process.env['NODE_ENV'] === 'production';
  const adminUrls = (process.env['ADMIN_URL'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!adminUrls.length && !isProd) adminUrls.push('http://localhost:3000');
  if (!adminUrls.length) {
    Logger.warn(
      'ADMIN_URL is not set — CORS will reject browser origins. Set ADMIN_URL to the portal origin(s).',
      'Bootstrap',
    );
  }
  app.enableCors({
    origin: adminUrls.length ? adminUrls : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle('Clockwork API')
      .setDescription('Internal time tracking API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
  if (!isProd) Logger.log(`Swagger at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
