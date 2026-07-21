import { SlashCommandBuilder } from '@discordjs/builders';
import { executeAutoplay } from '../music/commands';

export const data = new SlashCommandBuilder().setName('autoplay').setDescription('Vote to enable or disable recommended tracks.').addBooleanOption(option => option.setName('enabled').setDescription('Whether autoplay should be enabled.').setRequired(true));
export const execute = executeAutoplay;
