import { SlashCommandBuilder } from '@discordjs/builders';
import { executeExportQueue } from '../music/commands';

export const data = new SlashCommandBuilder().setName('exportqueue').setDescription('Export the current queue to a reusable file.');
export const execute = executeExportQueue;
