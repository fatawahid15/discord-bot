import { SlashCommandBuilder } from '@discordjs/builders';
import { executeSkip } from '../music/commands';

export const data = new SlashCommandBuilder().setName('skip').setDescription('Skip the current track.');
export const execute = executeSkip;
