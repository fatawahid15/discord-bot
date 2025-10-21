import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

// --- GIF URLs ---
// INSTRUCTIONS: Replace these placeholder URLs with actual GIF URLs from a site like Giphy or Tenor.
const pokeGifs = [
    'https://media.tenor.com/Fp_f2b8SJOAAAAAC/poke-anime.gif',
    'https://media.tenor.com/2-bTR3aK8oQAAAAAC/anime-poke.gif',
    'https://media.tenor.com/0T5n_2v2j-AAAAAC/poke-smirk.gif',
    'https://media.tenor.com/l5f_h3n9j5kAAAAAC/poke.gif',
    'https://media.tenor.com/i2p3iI42vWAAAAAC/poke-anime.gif'
];

export const data = new SlashCommandBuilder()
    .setName('poke')
    .setDescription('👉 Annoy a friend with a poke!')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The person you want to poke.')
            .setRequired(true));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const author = interaction.user;
    const targetUser = interaction.options.getUser('user');

    if (!targetUser) {
        await interaction.reply({ content: 'You must specify a user to poke.', ephemeral: true });
        return;
    }

    // Prevent users from pokeging themselves
    if (author.id === targetUser.id) {
        await interaction.reply({ content: 'You can\'t poke yourself!', ephemeral: true });
        return;
    }

    // Select a random GIF from the array
    const randomGif = pokeGifs[Math.floor(Math.random() * pokeGifs.length)];

    const pokeEmbed = new EmbedBuilder()
        .setColor('#0099ff') // A nice blue color
        .setDescription(`**${author} gives ${targetUser} a poke! Hey!**`)
        .setImage(randomGif);

    await interaction.reply({ embeds: [pokeEmbed] });
};