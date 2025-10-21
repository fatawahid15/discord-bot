import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

// --- GIF URLs ---
// INSTRUCTIONS: Replace these placeholder URLs with actual GIF URLs.
const kissGifs = [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTZrMnVvdXprNGVtdnp3eWlxdnVlY2RnOWI3eTM4dThkZnM5dHpvNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MQVpBqASxSlFu/giphy.gif ",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExc203MXBneTh5cnljY3dlcTQ3NmpyMGtpdmJjdnM4cHJiZ2c2dzQ2dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FqBTvSNjNzeZG/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHFtdGNkbzM5aTg0MzZnaTk2ODQydGs2ZWc1MWQyeDlrcjd4ZDd6OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jR22gdcPiOLaE/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWhzMHI2YTM2a3dtbzl1OHE4enI1dGxrMThxb2Jtb3g0NWU5MGFteiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11rWoZNpAKw8w/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzR1bzZobnV4NHE3c2Zpbzh6djJyaDFwMWRteG1qNHJpc2t2NWg5MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12VXIxKaIEarL2/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTcyYmVnbnd3ODl4OHlta290cTh1eHA5MjA5OWpicnBpcG44cnNucSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IdzovcoOUoUM0/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnRzeWV5cjdldHoxY2Y0eTZzaDh0emJjMDdwNDEzaGlkdDJvOWVoaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/nyGFcsP0kAobm/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWhnMDdyNDU1dWFvOTQxemtzcXo4NWUzbjVleXhqZGVsbXJjYjV2NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/hLEKX6GArrtOJA34Pw/giphy.gif",
];

export const data = new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('💖 Give another user a sweet kiss! 💖')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user you want to kiss.')
            .setRequired(true));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const author = interaction.user;
    const targetUser = interaction.options.getUser('user');

    if (!targetUser) {
        await interaction.reply({ content: 'You must specify a user to kiss.', ephemeral: true });
        return;
    }

    if (author.id === targetUser.id) {
        await interaction.reply({ content: 'You can\'t kiss yourself!', ephemeral: true });
        return;
    }

    const randomGif = kissGifs[Math.floor(Math.random() * kissGifs.length)];

    const kissEmbed = new EmbedBuilder()
        .setColor('#ff69b4') // Hot pink color
        .setDescription(`**${author} gives ${targetUser} a little kiss!**`)
        .setImage(randomGif);

    await interaction.reply({ embeds: [kissEmbed] });
};