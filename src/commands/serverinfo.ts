import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('🌟 Displays detailed information about this amazing server! 🌟');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const { guild } = interaction;

    // Fetch the owner to ensure we have the most up-to-date information
    const owner = await guild.fetchOwner();

    // Count channels by type
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const serverInfoEmbed = new EmbedBuilder()
        .setColor('#5865F2') // Discord Blurple
        .setTitle(`Server Info: ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
            { name: 'Owner', value: owner.user.tag, inline: true },
            { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
            { name: 'Created', value: `<t:${createdTimestamp}:F>`, inline: false },
            { name: '\u200B', value: '\u200B', inline: false }, // Spacer
            { name: 'Members', value: `Total: ${guild.memberCount}`, inline: true },
            { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Spacer
            { name: 'Channels', value: `**${textChannels}** Text | **${voiceChannels}** Voice | **${categories}** Categories`, inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [serverInfoEmbed] });
};