import { SlashCommandBuilder } from '@discordjs/builders';
import { executeResume } from '../music/commands';

export const data = new SlashCommandBuilder().setName('resume').setDescription('Resume paused music.');
export const execute = executeResume;
