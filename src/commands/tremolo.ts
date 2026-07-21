import { SlashCommandBuilder } from '@discordjs/builders';
import { executeTremolo } from '../music/commands';

export const data = new SlashCommandBuilder().setName('tremolo').setDescription('Apply tremolo to the current track.').addNumberOption(option => option.setName('frequency').setDescription('Frequency from 0.1Hz to 20Hz.').setRequired(true).setMinValue(0.1).setMaxValue(20)).addNumberOption(option => option.setName('depth').setDescription('Depth from 0 to 1.').setRequired(true).setMinValue(0).setMaxValue(1));
export const execute = executeTremolo;
