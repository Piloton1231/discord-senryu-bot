"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['log', 'error', 'warn', 'debug'],
        });
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Discord Senryu Bot API')
            .setDescription('REST API for managing and monitoring the Discord Senryu Detection Bot')
            .setVersion('1.0')
            .addTag('Bot Management', 'Endpoints for bot statistics and channel management')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        app.use('/api-docs', (req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            next();
        });
        swagger_1.SwaggerModule.setup('api-docs', app, document, {
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
        await app.listen(3000);
        logger.log('Discord Senryu Bot is running!');
        logger.log('API Documentation available at http://localhost:3000/api-docs');
    }
    catch (error) {
        logger.error('Failed to start Discord Senryu Bot', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map