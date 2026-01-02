import { Controller, Get, Post, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';
import { DiscordBotService } from './discord-bot.service';

class SetChannelDto {
  guildId: string;
  channelId: string;
}

@ApiTags('Bot Management')
@Controller('api')
export class ApiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordBot: DiscordBotService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Bot is running' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      botReady: this.discordBot.isReady(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get overall bot statistics' })
  @ApiResponse({ status: 200, description: 'Returns bot statistics' })
  async getStats() {
    const totalSenryu = await this.prisma.senryu_record.count();
    const totalChannels = await this.prisma.channel_settings.count();
    
    return {
      totalSenryuDetected: totalSenryu,
      totalMonitoredChannels: totalChannels,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all monitored channels' })
  @ApiResponse({ status: 200, description: 'Returns list of monitored channels' })
  async getChannels() {
    const channels = await this.prisma.channel_settings.findMany({
      orderBy: { created_at: 'desc' },
    });
    return { channels };
  }

  @Get('senryu/:guildId')
  @ApiOperation({ summary: 'Get senryu records for a specific guild' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiResponse({ status: 200, description: 'Returns senryu records for the guild' })
  async getSenryuByGuild(@Param('guildId') guildId: string) {
    const records = await this.prisma.senryu_record.findMany({
      where: { guild_id: guildId },
      orderBy: { detected_at: 'desc' },
      take: 50,
    });
    return { guildId, count: records.length, records };
  }

  @Get('senryu')
  @ApiOperation({ summary: 'Get recent senryu records' })
  @ApiResponse({ status: 200, description: 'Returns recent senryu records' })
  async getRecentSenryu() {
    const records = await this.prisma.senryu_record.findMany({
      orderBy: { detected_at: 'desc' },
      take: 20,
    });
    return { count: records.length, records };
  }
}
