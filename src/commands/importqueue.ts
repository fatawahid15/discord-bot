import { SlashCommandBuilder } from '@discordjs/builders';
import { executeImportQueue } from '../music/commands';

export const data = new SlashCommandBuilder().setName('importqueue').setDescription('Import a queue exported by this bot.').addAttachmentOption(option => option.setName('file').setDescription('A music-queue.json file.').setRequired(true));
export const execute = executeImportQueue;
