import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { SenryuDetectorService } from './senryu-detector.service';
export declare class DiscordBotService implements OnModuleInit {
    private readonly configService;
    private readonly prisma;
    private readonly senryuDetector;
    private readonly logger;
    private client;
    private monitoredChannels;
    private ready;
    constructor(configService: ConfigService, prisma: PrismaService, senryuDetector: SenryuDetectorService);
    onModuleInit(): Promise<void>;
    isReady(): boolean;
    private loadMonitoredChannels;
    private onReady;
    private registerCommands;
    private onMessageCreate;
    private saveSenryu;
    private onSlashCommand;
    private handleSenryuChannelCommand;
    private handleSenryuListCommand;
    private handleSenryuStatsCommand;
}
