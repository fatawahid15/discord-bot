import { SlashCommandBuilder } from '@discordjs/builders';
import { executePrevious } from '../music/commands';

export const data = new SlashCommandBuilder().setName('previous').setDescription('Return to the previously played track.');
export const execute = executePrevious;
