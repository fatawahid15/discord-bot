import { SlashCommandBuilder } from '@discordjs/builders';
import { executePitch } from '../music/commands';

export const data = new SlashCommandBuilder().setName('pitch').setDescription('Change pitch while preserving track speed.').addIntegerOption(option => option.setName('percentage').setDescription('Pitch from 50% to 200%.').setRequired(true).setMinValue(50).setMaxValue(200));
export const execute = executePitch;
