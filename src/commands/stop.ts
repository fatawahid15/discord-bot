import { SlashCommandBuilder } from '@discordjs/builders';
import { executeStop } from '../music/commands';

export const data = new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue.');
export const execute = executeStop;
