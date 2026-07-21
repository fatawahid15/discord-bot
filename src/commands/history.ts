import { SlashCommandBuilder } from '@discordjs/builders';
import { executeHistory } from '../music/commands';

export const data = new SlashCommandBuilder().setName('history').setDescription('Show recently played tracks.');
export const execute = executeHistory;
