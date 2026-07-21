import { SlashCommandBuilder } from '@discordjs/builders';
import { executeReplay } from '../music/commands';

export const data = new SlashCommandBuilder().setName('replay').setDescription('Replay the current track from the beginning.');
export const execute = executeReplay;
