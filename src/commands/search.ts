import { SlashCommandBuilder } from '@discordjs/builders';
import { executeSearch } from '../music/commands';

export const data = new SlashCommandBuilder().setName('search').setDescription('Search for music and choose from five results.').addStringOption(option => option.setName('query').setDescription('Song or artist to search for.').setRequired(true).setMaxLength(200));
export const execute = executeSearch;
