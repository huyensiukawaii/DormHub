import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  const corsOriginRaw = process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL;
  const allowedOrigins = (corsOriginRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return allowedOrigins.includes(origin)
          ? callback(null, true)
          : callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('DormHub API')
    .setDescription('API hệ thống quản lý ký túc xá')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();