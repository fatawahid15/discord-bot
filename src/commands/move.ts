import { SlashCommandBuilder } from '@discordjs/builders';
import { executeMove } from '../music/commands';

export const data = new SlashCommandBuilder().setName('move').setDescription('Move an upcoming track to another queue position.').addIntegerOption(option => option.setName('from').setDescription('Current queue position.').setRequired(true).setMinValue(1)).addIntegerOption(option => option.setName('to').setDescription('New queue position.').setRequired(true).setMinValue(1));
export const execute = executeMove;
