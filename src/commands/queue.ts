import { SlashCommandBuilder } from '@discordjs/builders';
import { executeQueue } from '../music/commands';

export const data = new SlashCommandBuilder().setName('queue').setDescription('Show the upcoming music queue.').addIntegerOption(option => option.setName('page').setDescription('Queue page to display.').setMinValue(1));
export const execute = executeQueue;
