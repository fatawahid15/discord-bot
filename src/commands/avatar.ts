import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ Show off your or another user\'s profile picture!')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The user whose avatar you want to grab.')
            .setRequired(false))
    .addBooleanOption(option =>
        option.setName('public')
            .setDescription('Show it to the whole channel? (Default: only you can see it)')
            .setRequired(false));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    // Get the options from the command
    const user = interaction.options.getUser('user') || interaction.user;
    const isPublic = interaction.options.getBoolean('public') || false;

    // Get the highest resolution avatar URL
    const avatarUrl = user.displayAvatarURL({ size: 1024 });

    const avatarEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${user.username}\'s Avatar`)
        .setImage(avatarUrl)
        .setDescription(`[Download Link](${avatarUrl})`);

    await interaction.reply({
        embeds: [avatarEmbed],
        ephemeral: !isPublic // If isPublic is true, ephemeral is false.
    });
};