import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

const categories: Record<string, string[]> = {
    'Music Playback': ['play', 'search', 'pause', 'resume', 'skip', 'stop', 'disconnect', 'previous', 'replay', 'nowplaying', 'volume', 'loop', 'autoplay', 'seek'],
    'Music Queue': ['queue', 'shuffle', 'remove', 'move', 'clear', 'duplicates', 'history', 'exportqueue', 'importqueue'],
    'Music Effects': ['filter', 'bassboost', '8d', 'speed', 'pitch', 'tremolo', 'vibrato', 'lyrics'],
    Discovery: ['anime', 'manga'],
    Entertainment: ['cuddle', 'hug', 'kiss', 'pat', 'poke', 'punch', 'slap'],
    Utility: ['serverinfo', 'help'],
};

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Need help? Here is a list of all my commands!');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const commandsPath = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const commands = new Map<string, string>();

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) commands.set(command.data.name, command.data.description);
    }

    const helpEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Bot Commands')
        .setDescription('Commands are grouped by purpose. Use Discord’s command picker to view options.');

    for (const [category, names] of Object.entries(categories)) {
        const entries = names.filter(name => commands.has(name)).map(name => `**/${name}** — ${commands.get(name)}`);
        if (entries.length) helpEmbed.addFields({ name: category, value: entries.join('\n') });
    }

    await interaction.reply({
        embeds: [helpEmbed],
        ephemeral: true
    });
};
