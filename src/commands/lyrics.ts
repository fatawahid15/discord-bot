import { SlashCommandBuilder } from '@discordjs/builders';
import { executeLyrics } from '../music/commands';

export const data = new SlashCommandBuilder().setName('lyrics').setDescription('Show lyrics for a song or the current track.').addStringOption(option => option.setName('query').setDescription('Song and artist; defaults to the current track.').setMaxLength(200));
export const execute = executeLyrics;
