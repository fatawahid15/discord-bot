import { SlashCommandBuilder } from '@discordjs/builders';
import { executeDisconnect } from '../music/commands';

export const data = new SlashCommandBuilder().setName('disconnect').setDescription('Disconnect the bot and clear the queue.');
export const execute = executeDisconnect;
