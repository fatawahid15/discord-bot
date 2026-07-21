import { SlashCommandBuilder } from '@discordjs/builders';
import { executeRemove } from '../music/commands';

export const data = new SlashCommandBuilder().setName('remove').setDescription('Remove one track or a range from the queue.').addIntegerOption(option => option.setName('position').setDescription('First queue position shown by /queue.').setRequired(true).setMinValue(1)).addIntegerOption(option => option.setName('end').setDescription('Optional final queue position.').setMinValue(1));
export const execute = executeRemove;
