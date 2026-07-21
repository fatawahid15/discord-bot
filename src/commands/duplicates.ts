import { SlashCommandBuilder } from '@discordjs/builders';
import { executeDuplicates } from '../music/commands';

export const data = new SlashCommandBuilder().setName('duplicates').setDescription('Vote to remove duplicate tracks from the queue.');
export const execute = executeDuplicates;
