import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

// --- GIF URLs ---
const patGifs = [
    'https://media.tenor.com/yJv1jQJ3j-AAAAAC/anime-pat.gif',
    'https://media.tenor.com/t2g2-4hZ1-oAAAAAC/anime-pat.gif',
    'https://media.tenor.com/G12I7F28B5wAAAAAC/head-pat-anime.gif',
    'https://media.tenor.com/T6uA1YjB-G4AAAAAC/anime-pat.gif',
    'https://media.tenor.com/5-b23eJmH2oAAAAAC/anime-pat.gif'
];

export const data = new SlashCommandBuilder()
    .setName('pat')
    .setDescription('✋ Give a gentle pat to a friend.')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user who deserves a pat.')
            .setRequired(true));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const author = interaction.user;
    const targetUser = interaction.options.getUser('user');

    if (!targetUser) {
        await interaction.reply({ content: 'You must specify a user to pat.', ephemeral: true });
        return;
    }

    if (author.id === targetUser.id) {
        await interaction.reply({ content: 'You can\\\'t pat yourself!', ephemeral: true });
        return;
    }

    const randomGif = patGifs[Math.floor(Math.random() * patGifs.length)];

    const patEmbed = new EmbedBuilder()
        .setColor('#FFB6C1') // Light Pink color
        .setDescription(`**${author} gives ${targetUser} a gentle pat on the head.**`)
        .setImage(randomGif);

    await interaction.reply({ embeds: [patEmbed] });
};