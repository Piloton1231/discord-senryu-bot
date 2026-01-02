"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("./prisma.service");
const discord_bot_service_1 = require("./discord-bot.service");
class SetChannelDto {
    guildId;
    channelId;
}
let ApiController = class ApiController {
    prisma;
    discordBot;
    constructor(prisma, discordBot) {
        this.prisma = prisma;
        this.discordBot = discordBot;
    }
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            botReady: this.discordBot.isReady(),
        };
    }
    async getStats() {
        const totalSenryu = await this.prisma.senryu_record.count();
        const totalChannels = await this.prisma.channel_settings.count();
        return {
            totalSenryuDetected: totalSenryu,
            totalMonitoredChannels: totalChannels,
            timestamp: new Date().toISOString(),
        };
    }
    async getChannels() {
        const channels = await this.prisma.channel_settings.findMany({
            orderBy: { created_at: 'desc' },
        });
        return { channels };
    }
    async getSenryuByGuild(guildId) {
        const records = await this.prisma.senryu_record.findMany({
            where: { guild_id: guildId },
            orderBy: { detected_at: 'desc' },
            take: 50,
        });
        return { guildId, count: records.length, records };
    }
    async getRecentSenryu() {
        const records = await this.prisma.senryu_record.findMany({
            orderBy: { detected_at: 'desc' },
            take: 20,
        });
        return { count: records.length, records };
    }
};
exports.ApiController = ApiController;
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Health check endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bot is running' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ApiController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overall bot statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns bot statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('channels'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all monitored channels' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns list of monitored channels' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getChannels", null);
__decorate([
    (0, common_1.Get)('senryu/:guildId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get senryu records for a specific guild' }),
    (0, swagger_1.ApiParam)({ name: 'guildId', description: 'Discord guild ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns senryu records for the guild' }),
    __param(0, (0, common_1.Param)('guildId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getSenryuByGuild", null);
__decorate([
    (0, common_1.Get)('senryu'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recent senryu records' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns recent senryu records' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getRecentSenryu", null);
exports.ApiController = ApiController = __decorate([
    (0, swagger_1.ApiTags)('Bot Management'),
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        discord_bot_service_1.DiscordBotService])
], ApiController);
//# sourceMappingURL=api.controller.js.map