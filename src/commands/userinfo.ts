import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('🌸 Uncover the secrets of a user with detailed information! 🌸')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to get information about.')
            .setRequired(false));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = (interaction.options.getMember('user') as GuildMember) || (interaction.member as GuildMember);

    if (!targetMember) {
        await interaction.editReply({ content: 'The user is not a member of this server.' });
        return;
    }

    // Format dates using Discord's dynamic timestamps
    const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedTimestamp = targetMember.joinedTimestamp ? Math.floor(targetMember.joinedTimestamp / 1000) : null;

    // Get a list of roles, excluding the @everyone role
    const roles = targetMember.roles.cache
        .filter(role => role.id !== interaction.guild!.id)
        .map(role => role.name)
        .join(', ') || 'None';

    const userInfoEmbed = new EmbedBuilder()
        .setColor(targetMember.displayHexColor) // Use the user's highest role color
        .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: 'ID', value: `\`${targetUser.id}\``, inline: true },
            { name: 'Status', value: targetMember.presence?.status || 'offline', inline: true },
            { name: 'Highest Role', value: targetMember.roles.highest.name, inline: true },
            { name: 'Account Created', value: `<t:${createdTimestamp}:R>`, inline: true },
            { name: 'Joined Server', value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : 'Unknown', inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Spacer
            { name: `Roles [${targetMember.roles.cache.size - 1}]`, value: roles, inline: false },
        )
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [userInfoEmbed] });
};