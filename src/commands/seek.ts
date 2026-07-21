import { SlashCommandBuilder } from '@discordjs/builders';
import { executeSeek } from '../music/commands';

export const data = new SlashCommandBuilder().setName('seek').setDescription('Seek within the current track.').addStringOption(option => option.setName('position').setDescription('Seconds, MM:SS, or HH:MM:SS.').setRequired(true));
export const execute = executeSeek;
