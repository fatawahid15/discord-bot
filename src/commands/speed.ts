import { SlashCommandBuilder } from '@discordjs/builders';
import { executeSpeed } from '../music/commands';

export const data = new SlashCommandBuilder().setName('speed').setDescription('Change playback speed for the current track.').addIntegerOption(option => option.setName('percentage').setDescription('Speed from 50% to 200%.').setRequired(true).setMinValue(50).setMaxValue(200));
export const execute = executeSpeed;
