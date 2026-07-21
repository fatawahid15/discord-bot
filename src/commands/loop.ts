import { SlashCommandBuilder } from '@discordjs/builders';
import { executeLoop } from '../music/commands';

export const data = new SlashCommandBuilder().setName('loop').setDescription('Set the music loop mode.').addStringOption(option => option.setName('mode').setDescription('Loop mode.').setRequired(true).addChoices({ name: 'Off', value: 'off' }, { name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' }));
export const execute = executeLoop;
