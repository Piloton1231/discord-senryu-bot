import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug'],
    });

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Discord Senryu Bot API')
      .setDescription('REST API for managing and monitoring the Discord Senryu Detection Bot')
      .setVersion('1.0')
      .addTag('Bot Management', 'Endpoints for bot statistics and channel management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    // Prevent CDN/browser caching
    app.use('/api-docs', (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      next();
    });

    SwaggerModule.setup('api-docs', app, document, {
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #2c3e50; font-size: 2rem; }
        .swagger-ui { background-color: #f8f9fa; }
        .swagger-ui .opblock-tag { font-size: 1.2rem; color: #34495e; }
        .swagger-ui .opblock { border-radius: 8px; margin-bottom: 1rem; }
      `,
      customSiteTitle: 'Discord Senryu Bot API',
      customfavIcon: 'https://cdn-icons-png.flaticon.com/512/2111/2111615.png',
    });

    logger.log('Discord Senryu Bot is starting...');
    
    // Start HTTP server on port 3000 for API endpoints
    await app.listen(3000);
    
    logger.log('Discord Senryu Bot is running!');
    logger.log('API Documentation available at http://localhost:3000/api-docs');
  } catch (error) {
    logger.error('Failed to start Discord Senryu Bot', error);
    process.exit(1);
  }
}

bootstrap();
