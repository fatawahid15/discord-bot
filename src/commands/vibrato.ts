import { SlashCommandBuilder } from '@discordjs/builders';
import { executeVibrato } from '../music/commands';

export const data = new SlashCommandBuilder().setName('vibrato').setDescription('Apply vibrato to the current track.').addNumberOption(option => option.setName('frequency').setDescription('Frequency from 0.1Hz to 14Hz.').setRequired(true).setMinValue(0.1).setMaxValue(14)).addNumberOption(option => option.setName('depth').setDescription('Depth from 0 to 1.').setRequired(true).setMinValue(0).setMaxValue(1));
export const execute = executeVibrato;
