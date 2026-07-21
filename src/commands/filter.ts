import { SlashCommandBuilder } from '@discordjs/builders';
import { executeFilter } from '../music/commands';

export const data = new SlashCommandBuilder().setName('filter').setDescription('Apply an audio effect to the current track.').addStringOption(option => option.setName('preset').setDescription('Audio filter preset.').setRequired(true).addChoices(
    { name: 'Off', value: 'off' }, { name: 'Bass boost', value: 'bassboost' }, { name: 'Bass boost high', value: 'bassboost_high' },
    { name: '8D', value: '8D' }, { name: 'Nightcore', value: 'nightcore' }, { name: 'Vaporwave', value: 'vaporwave' },
    { name: 'Tremolo', value: 'tremolo' }, { name: 'Vibrato', value: 'vibrato' }, { name: 'Treble', value: 'treble' },
    { name: 'Karaoke', value: 'karaoke' }, { name: 'Lo-fi', value: 'lofi' }, { name: 'Normalizer', value: 'normalizer' },
));
export const execute = executeFilter;
