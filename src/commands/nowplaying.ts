import { SlashCommandBuilder } from '@discordjs/builders';
import { executeNowPlaying } from '../music/commands';

export const data = new SlashCommandBuilder().setName('nowplaying').setDescription('Show the current track and playback controls.');
export const execute = executeNowPlaying;
