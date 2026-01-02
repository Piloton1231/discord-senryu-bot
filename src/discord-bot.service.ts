import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, Message, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { SenryuDetectorService } from './senryu-detector.service';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;
  private monitoredChannels: Set<string> = new Set();
  private ready = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly senryuDetector: SenryuDetectorService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  async onModuleInit() {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    if (!token || token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
      this.logger.warn('DISCORD_BOT_TOKEN is not set or is placeholder. Bot will not start, but API will remain available.');
      return;
    }

    // Load monitored channels from database
    await this.loadMonitoredChannels();

    // Register event handlers
    this.client.on('ready', () => this.onReady());
    this.client.on('messageCreate', (message) => this.onMessageCreate(message));
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.onSlashCommand(interaction);
      }
    });

    // Login to Discord
    try {
      await this.client.login(token);
      this.logger.log('Discord bot logged in successfully');
    } catch (error) {
      this.logger.error('Failed to login to Discord. Bot will not be available, but API will remain accessible.', error);
      // Don't throw - allow the app to continue running for API access
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private async loadMonitoredChannels() {
    try {
      const settings = await this.prisma.channel_settings.findMany();
      this.monitoredChannels = new Set(settings.map(s => s.channel_id));
      this.logger.log(`Loaded ${this.monitoredChannels.size} monitored channels`);
    } catch (error) {
      this.logger.error('Failed to load monitored channels', error);
    }
  }

  private async onReady() {
    this.logger.log(`Discord bot ready! Logged in as ${this.client.user?.tag}`);
    this.ready = true;
    
    // Register slash commands
    await this.registerCommands();
  }

  private async registerCommands() {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    const clientId = this.client.user?.id;

    if (!token || !clientId) {
      this.logger.error('Cannot register commands: missing token or client ID');
      return;
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('senryu-channel')
        .setDescription('川柳検出チャンネルの設定')
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('現在のチャンネルを川柳検出の対象に設定')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('unset')
            .setDescription('現在のチャンネルを川柳検出の対象から除外')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('監視中のチャンネル一覧を表示')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON(),
      
      new SlashCommandBuilder()
        .setName('senryu-list')
        .setDescription('検出された川柳の一覧を表示(最新10件)')
        .toJSON(),
      
      new SlashCommandBuilder()
        .setName('senryu-stats')
        .setDescription('川柳検出統計を表示')
        .toJSON(),
    ];

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      this.logger.log('Registering slash commands...');
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      this.logger.log('Slash commands registered successfully');
    } catch (error) {
      this.logger.error('Failed to register slash commands', error);
    }
  }

  private async onMessageCreate(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if channel is monitored
    if (!this.monitoredChannels.has(message.channel.id)) return;

    // Ignore messages without content
    if (!message.content) return;

    try {
      // Detect senryu
      const senryu = await this.senryuDetector.detectSenryu(message.content);
      
      if (senryu) {
        this.logger.log(`Senryu detected in message ${message.id}: ${senryu.line1} / ${senryu.line2} / ${senryu.line3}`);
        
        // React with bookmark emoji
        await message.react('🔖');
        
        // Reply with detected senryu
        await message.reply({
          content: `川柳を検出しました!\n\n${senryu.line1}\n${senryu.line2}\n${senryu.line3}`,
        });
        
        // Save to database
        await this.saveSenryu(message, senryu);
      }
    } catch (error) {
      this.logger.error(`Error processing message ${message.id}`, error);
    }
  }

  private async saveSenryu(message: Message, senryu: { line1: string; line2: string; line3: string }) {
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
    } catch (error) {
      this.logger.error('Failed to save senryu to database', error);
    }
  }

  private async onSlashCommand(interaction: ChatInputCommandInteraction) {
    const { commandName } = interaction;

    try {
      if (commandName === 'senryu-channel') {
        await this.handleSenryuChannelCommand(interaction);
      } else if (commandName === 'senryu-list') {
        await this.handleSenryuListCommand(interaction);
      } else if (commandName === 'senryu-stats') {
        await this.handleSenryuStatsCommand(interaction);
      }
    } catch (error) {
      this.logger.error(`Error handling command ${commandName}`, error);
      await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
    }
  }

  private async handleSenryuChannelCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const channelId = interaction.channel?.id;
    const guildId = interaction.guild?.id;

    if (!channelId || !guildId) {
      await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      return;
    }

    if (subcommand === 'set') {
      // Add channel to monitoring
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
    } else if (subcommand === 'unset') {
      // Remove channel from monitoring
      await this.prisma.channel_settings.deleteMany({
        where: {
          guild_id: guildId,
          channel_id: channelId,
        },
      });
      
      this.monitoredChannels.delete(channelId);
      await interaction.reply({ content: `<#${channelId}> を川柳検出の対象から除外しました。`, ephemeral: true });
    } else if (subcommand === 'list') {
      // List monitored channels in this guild
      const settings = await this.prisma.channel_settings.findMany({
        where: { guild_id: guildId },
      });
      
      if (settings.length === 0) {
        await interaction.reply({ content: '現在監視中のチャンネルはありません。', ephemeral: true });
      } else {
        const channelList = settings.map(s => `<#${s.channel_id}>`).join('\n');
        await interaction.reply({ content: `**監視中のチャンネル:**\n${channelList}`, ephemeral: true });
      }
    }
  }

  private async handleSenryuListCommand(interaction: ChatInputCommandInteraction) {
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

  private async handleSenryuStatsCommand(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guild?.id;
    
    if (!guildId) {
      await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      return;
    }

    const totalCount = await this.prisma.senryu_record.count({
      where: { guild_id: guildId },
    });

    // Get top contributors
    const authorCounts = await this.prisma.$queryRaw<Array<{ author_id: string; count: bigint }>>` 
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
}
