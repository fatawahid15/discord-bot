import { SlashCommandBuilder } from '@discordjs/builders';
import { executeShuffle } from '../music/commands';

export const data = new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the upcoming music queue.');
export const execute = executeShuffle;
