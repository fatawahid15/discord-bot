import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Need help? Here is a list of all my commands!');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const commandsPath = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const helpEmbed = new EmbedBuilder()
        .setColor('#5865F2') // Discord Blurple
        .setTitle('🤖 My Commands')
        .setDescription('Here\'s everything I can do:');

    for (const file of commandFiles) {
        // We use require() here to synchronously load the command modules
        const command = require(path.join(commandsPath, file));
        if (command.data) {
            helpEmbed.addFields({ name: `/${command.data.name}`, value: command.data.description });
        }
    }

    await interaction.reply({
        embeds: [helpEmbed],
        ephemeral: true
    });
};