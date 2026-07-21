import { SlashCommandBuilder } from '@discordjs/builders';
import { executeVolume } from '../music/commands';

export const data = new SlashCommandBuilder().setName('volume').setDescription('Set music volume from 1 to 100.').addIntegerOption(option => option.setName('level').setDescription('Volume percentage.').setRequired(true).setMinValue(1).setMaxValue(100));
export const execute = executeVolume;
