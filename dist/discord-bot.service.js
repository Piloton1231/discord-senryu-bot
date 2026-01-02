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
var DiscordBotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBotService = void 0;
const common_1 = require("@nestjs/common");
const discord_js_1 = require("discord.js");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("./prisma.service");
const senryu_detector_service_1 = require("./senryu-detector.service");
let DiscordBotService = DiscordBotService_1 = class DiscordBotService {
    configService;
    prisma;
    senryuDetector;
    logger = new common_1.Logger(DiscordBotService_1.name);
    client;
    monitoredChannels = new Set();
    ready = false;
    constructor(configService, prisma, senryuDetector) {
        this.configService = configService;
        this.prisma = prisma;
        this.senryuDetector = senryuDetector;
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
            ],
        });
    }
    async onModuleInit() {
        const token = this.configService.get('DISCORD_BOT_TOKEN');
        if (!token || token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
            this.logger.warn('DISCORD_BOT_TOKEN is not set or is placeholder. Bot will not start, but API will remain available.');
            return;
        }
        await this.loadMonitoredChannels();
        this.client.on('ready', () => this.onReady());
        this.client.on('messageCreate', (message) => this.onMessageCreate(message));
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
                await this.onSlashCommand(interaction);
            }
        });
        try {
            await this.client.login(token);
            this.logger.log('Discord bot logged in successfully');
        }
        catch (error) {
            this.logger.error('Failed to login to Discord. Bot will not be available, but API will remain accessible.', error);
        }
    }
    isReady() {
        return this.ready;
    }
    async loadMonitoredChannels() {
        try {
            const settings = await this.prisma.channel_settings.findMany();
            this.monitoredChannels = new Set(settings.map(s => s.channel_id));
            this.logger.log(`Loaded ${this.monitoredChannels.size} monitored channels`);
        }
        catch (error) {
            this.logger.error('Failed to load monitored channels', error);
        }
    }
    async onReady() {
        this.logger.log(`Discord bot ready! Logged in as ${this.client.user?.tag}`);
        this.ready = true;
        await this.registerCommands();
    }
    async registerCommands() {
        const token = this.configService.get('DISCORD_BOT_TOKEN');
        const clientId = this.client.user?.id;
        if (!token || !clientId) {
            this.logger.error('Cannot register commands: missing token or client ID');
            return;
        }
        const commands = [
            new discord_js_1.SlashCommandBuilder()
                .setName('senryu-channel')
                .setDescription('川柳検出チャンネルの設定')
                .addSubcommand(subcommand => subcommand
                .setName('set')
                .setDescription('現在のチャンネルを川柳検出の対象に設定'))
                .addSubcommand(subcommand => subcommand
                .setName('unset')
                .setDescription('現在のチャンネルを川柳検出の対象から除外'))
                .addSubcommand(subcommand => subcommand
                .setName('list')
                .setDescription('監視中のチャンネル一覧を表示'))
                .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels)
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName('senryu-list')
                .setDescription('検出された川柳の一覧を表示(最新10件)')
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName('senryu-stats')
                .setDescription('川柳検出統計を表示')
                .toJSON(),
        ];
        const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
        try {
            this.logger.log('Registering slash commands...');
            await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: commands });
            this.logger.log('Slash commands registered successfully');
        }
        catch (error) {
            this.logger.error('Failed to register slash commands', error);
        }
    }
    async onMessageCreate(message) {
        if (message.author.bot)
            return;
        if (!this.monitoredChannels.has(message.channel.id))
            return;
        if (!message.content)
            return;
        try {
            const senryu = await this.senryuDetector.detectSenryu(message.content);
            if (senryu) {
                this.logger.log(`Senryu detected in message ${message.id}: ${senryu.line1} / ${senryu.line2} / ${senryu.line3}`);
                await message.react('🔖');
                await message.reply({
                    content: `川柳を検出しました!\n\n${senryu.line1}\n${senryu.line2}\n${senryu.line3}`,
                });
                await this.saveSenryu(message, senryu);
            }
        }
        catch (error) {
            this.logger.error(`Error processing message ${message.id}`, error);
        }
    }
    async saveSenryu(message, senryu) {
        try {
            await this.prisma.senryu_record.create({
                data: {
                    guild_id: message.guild?.id || 'DM',
                    channel_id: message.channel.id,
                    message_id: message.id,
                    line1: senryu.line1,
                    line2: senryu.line2,
                    line3: senryu.line3,
                    author_id: message.author.id,
                },
            });
            this.logger.log(`Saved senryu to database: ${message.id}`);
        }
        catch (error) {
            this.logger.error('Failed to save senryu to database', error);
        }
    }
    async onSlashCommand(interaction) {
        const { commandName } = interaction;
        try {
            if (commandName === 'senryu-channel') {
                await this.handleSenryuChannelCommand(interaction);
            }
            else if (commandName === 'senryu-list') {
                await this.handleSenryuListCommand(interaction);
            }
            else if (commandName === 'senryu-stats') {
                await this.handleSenryuStatsCommand(interaction);
            }
        }
        catch (error) {
            this.logger.error(`Error handling command ${commandName}`, error);
            await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
        }
    }
    async handleSenryuChannelCommand(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel?.id;
        const guildId = interaction.guild?.id;
        if (!channelId || !guildId) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }
        if (subcommand === 'set') {
            await this.prisma.channel_settings.upsert({
                where: {
                    guild_id_channel_id: { guild_id: guildId, channel_id: channelId },
                },
                create: {
                    guild_id: guildId,
                    channel_id: channelId,
                },
                update: {},
            });
            this.monitoredChannels.add(channelId);
            await interaction.reply({ content: `<#${channelId}> を川柳検出の対象に設定しました。`, ephemeral: true });
        }
        else if (subcommand === 'unset') {
            await this.prisma.channel_settings.deleteMany({
                where: {
                    guild_id: guildId,
                    channel_id: channelId,
                },
            });
            this.monitoredChannels.delete(channelId);
            await interaction.reply({ content: `<#${channelId}> を川柳検出の対象から除外しました。`, ephemeral: true });
        }
        else if (subcommand === 'list') {
            const settings = await this.prisma.channel_settings.findMany({
                where: { guild_id: guildId },
            });
            if (settings.length === 0) {
                await interaction.reply({ content: '現在監視中のチャンネルはありません。', ephemeral: true });
            }
            else {
                const channelList = settings.map(s => `<#${s.channel_id}>`).join('\n');
                await interaction.reply({ content: `**監視中のチャンネル:**\n${channelList}`, ephemeral: true });
            }
        }
    }
    async handleSenryuListCommand(interaction) {
        const guildId = interaction.guild?.id;
        if (!guildId) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }
        const records = await this.prisma.senryu_record.findMany({
            where: { guild_id: guildId },
            orderBy: { detected_at: 'desc' },
            take: 10,
        });
        if (records.length === 0) {
            await interaction.reply({ content: 'まだ川柳が検出されていません。', ephemeral: true });
            return;
        }
        const list = records.map((r, i) => {
            const date = r.detected_at.toLocaleDateString('ja-JP');
            return `**${i + 1}.** <@${r.author_id}> (${date})\n${r.line1}\n${r.line2}\n${r.line3}`;
        }).join('\n\n');
        await interaction.reply({ content: `**検出された川柳(最新10件):**\n\n${list}`, ephemeral: true });
    }
    async handleSenryuStatsCommand(interaction) {
        const guildId = interaction.guild?.id;
        if (!guildId) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }
        const totalCount = await this.prisma.senryu_record.count({
            where: { guild_id: guildId },
        });
        const authorCounts = await this.prisma.$queryRaw ` 
      SELECT author_id, COUNT(*) as count
      FROM senryu_record
      WHERE guild_id = ${guildId}
      GROUP BY author_id
      ORDER BY count DESC
      LIMIT 5
    `;
        const ranking = authorCounts.map((a, i) => {
            return `**${i + 1}.** <@${a.author_id}>: ${a.count.toString()}句`;
        }).join('\n');
        const stats = `**川柳検出統計**\n\n**総検出数:** ${totalCount}句\n\n**投稿者ランキング(Top 5):**\n${ranking || 'データなし'}`;
        await interaction.reply({ content: stats, ephemeral: true });
    }
};
exports.DiscordBotService = DiscordBotService;
exports.DiscordBotService = DiscordBotService = DiscordBotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        senryu_detector_service_1.SenryuDetectorService])
], DiscordBotService);
//# sourceMappingURL=discord-bot.service.js.map