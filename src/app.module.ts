import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { SyllableCounterService } from './syllable-counter.service';
import { SenryuDetectorService } from './senryu-detector.service';
import { DiscordBotService } from './discord-bot.service';
import { ApiController } from './api.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ApiController],
  providers: [
    PrismaService,
    SyllableCounterService,
    SenryuDetectorService,
    DiscordBotService,
  ],
})
export class AppModule {}
