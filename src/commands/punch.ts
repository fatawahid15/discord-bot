import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

// --- GIF URLs ---
// INSTRUCTIONS: Replace these placeholder URLs with actual GIF URLs from a site like Giphy or Tenor.
const punchGifs = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2lwNTI4ODFmOGpyMDlyMGtqZTgwNXRwb3J5aGw5bTlnaHMxdGFiYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WynnqxhdFEPYY/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGlsZ2hjcm9vaTMzejVneTRjZ2tkdTAycTZicDY0cWNiaXo2dDE4byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IRUb7GTCaPU8E/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzY5NW9meDRiaHY2bjk4ZWVkdnZvdDZ6ZGxvaHdjZW5kOGZqcWgyaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lrr9rHuoJOE0w/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmpibjBvdWltZDdicmxjYmkyaTNoNXd3d2ZiYzNhajhqZnhkczc0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/49mdjsMrH7oze/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2cycG5kcm9qMndsdzRiejVkczgwMXNuNmg3Zm92Y2UybDNwa3FrdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5eyhBKLvYhafu/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDN6ZzBva3FoZTVhZDhsYzNlYTN4bW4yNGwxcWh3cnNqeWlvMDU4cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/wSY4wcrHnB0CA/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3ZyZjA1cDZ0MWphOGtvbjltMXhhNXdoaXczcmRyZWZkNWI3OW95bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NgA5xoalnq0RlBLAnq/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnNsd2F6a3lnd3Zqdjh1bGZkNWh1M2J3OW84bml3MGlycmJhMnNvNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/od5H3PmEG5EVq/giphy.gif",
];

export const data = new SlashCommandBuilder()
    .setName('punch')
    .setDescription('💥 Give another user a powerful punch! 💥')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user you want to punch.')
            .setRequired(true));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const author = interaction.user;
    const targetUser = interaction.options.getUser('user');

    if (!targetUser) {
        await interaction.reply({ content: 'You must specify a user to punch.', ephemeral: true });
        return;
    }

    // Prevent users from punchging themselves
    if (author.id === targetUser.id) {
        await interaction.reply({ content: 'You can\'t punch yourself!', ephemeral: true });
        return;
    }

    // Select a random GIF from the array
    const randomGif = punchGifs[Math.floor(Math.random() * punchGifs.length)];

    const punchEmbed = new EmbedBuilder()
        .setColor('#ff99cc') // A warm pink color
        .setDescription(`**${author} gives ${targetUser} a big punch!**`)
        .setImage(randomGif);

    await interaction.reply({ embeds: [punchEmbed] });
};