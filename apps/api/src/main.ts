import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';

import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionsFilter } from './common/filters/global-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { API_PREFIX, SWAGGER_PATH } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.set('trust proxy', 1);

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Security headers & compression
  app.use(helmet());
  app.use(compression());

  // CORS
  const corsOrigin = configService.get<string>('app.corsOrigin') || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Global prefix with exclusions for root health and swagger
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  // Global pipes, filters & interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionsFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NammaBus AI - API Platform')
    .setDescription(
      'Production-grade REST API backend for NammaBus AI real-time student bus tracking, ETA calculation, and safety platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer-jwt',
    )
    .addTag('Health & Observability', 'Liveness and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'NammaBus AI - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port') || 4000;
  await app.listen(port);

  logger.log(`🚀 NammaBus AI Backend started on: http://localhost:${port}`);
  logger.log(`📚 API Documentation available at: http://localhost:${port}/${SWAGGER_PATH}`);
  logger.log(`💓 Liveness endpoint: http://localhost:${port}/health`);
  logger.log(`🩺 Readiness endpoint: http://localhost:${port}/health/ready`);
}

bootstrap().catch((err) => {
  console.error('Fatal application bootstrap failure:', err);
  process.exit(1);
});
