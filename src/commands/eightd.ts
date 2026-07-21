import { SlashCommandBuilder } from '@discordjs/builders';
import { executeEightD } from '../music/commands';

export const data = new SlashCommandBuilder().setName('8d').setDescription('Apply a rotating 8D audio effect.').addNumberOption(option => option.setName('hz').setDescription('Rotation speed from 0.01Hz to 2Hz.').setRequired(true).setMinValue(0.01).setMaxValue(2));
export const execute = executeEightD;
