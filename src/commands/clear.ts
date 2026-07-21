import { SlashCommandBuilder } from '@discordjs/builders';
import { executeClear } from '../music/commands';

export const data = new SlashCommandBuilder().setName('clear').setDescription('Clear your tracks, the queue, or audio filters.').addStringOption(option => option.setName('target').setDescription('What to clear.').setRequired(true).addChoices(
    { name: 'My tracks', value: 'mine' }, { name: 'Entire queue (vote)', value: 'queue' }, { name: 'Audio filters', value: 'filters' },
));
export const execute = executeClear;
