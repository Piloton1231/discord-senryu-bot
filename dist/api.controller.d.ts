import { PrismaService } from './prisma.service';
import { DiscordBotService } from './discord-bot.service';
export declare class ApiController {
    private readonly prisma;
    private readonly discordBot;
    constructor(prisma: PrismaService, discordBot: DiscordBotService);
    getHealth(): {
        status: string;
        timestamp: string;
        botReady: boolean;
    };
    getStats(): Promise<{
        totalSenryuDetected: number;
        totalMonitoredChannels: number;
        timestamp: string;
    }>;
    getChannels(): Promise<{
        channels: {
            id: number;
            guild_id: string;
            channel_id: string;
            created_at: Date;
        }[];
    }>;
    getSenryuByGuild(guildId: string): Promise<{
        guildId: string;
        count: number;
        records: {
            line1: string;
            line2: string;
            line3: string;
            id: number;
            guild_id: string;
            channel_id: string;
            message_id: string;
            author_id: string;
            detected_at: Date;
        }[];
    }>;
    getRecentSenryu(): Promise<{
        count: number;
        records: {
            line1: string;
            line2: string;
            line3: string;
            id: number;
            guild_id: string;
            channel_id: string;
            message_id: string;
            author_id: string;
            detected_at: Date;
        }[];
    }>;
}
