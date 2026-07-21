import { SlashCommandBuilder } from '@discordjs/builders';
import { executeBassboost } from '../music/commands';

export const data = new SlashCommandBuilder().setName('bassboost').setDescription('Boost bass for the current track.').addIntegerOption(option => option.setName('percentage').setDescription('Bass boost from 0% to 200%.').setRequired(true).setMinValue(0).setMaxValue(200));
export const execute = executeBassboost;
