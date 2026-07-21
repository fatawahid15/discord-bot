import { SlashCommandBuilder } from '@discordjs/builders';
import { executePause } from '../music/commands';

export const data = new SlashCommandBuilder().setName('pause').setDescription('Pause the current track.');
export const execute = executePause;
