import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { VectorUtil } from 'src/utils/vectorStore';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
  );

  const configService = app.get(ConfigService);
  const vectorStore = new VectorUtil(configService)

  // vectorStore.CreateVectorStore()

  app.useGlobalPipes(new ValidationPipe())
  app.enableCors({
    allowedHeaders: '*',
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  })

  await app.listen(3000, '0.0.0.0');
}

bootstrap();
