import { SlashCommandBuilder } from '@discordjs/builders';
import { executePlay } from '../music/commands';

export const data = new SlashCommandBuilder().setName('play').setDescription('Play or queue music from a search or URL.').addStringOption(option => option.setName('query').setDescription('Song, artist, YouTube, SoundCloud, or Spotify URL.').setRequired(true));
export const execute = executePlay;
