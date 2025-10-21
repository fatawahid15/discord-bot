import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { client as dbClient } from '../database';
import { calculateLevel } from '../leveling';

interface UserData {
    userId: string;
    guildId: string;
    xp: number;
}

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 See who is at the top of the message leaderboard!');

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const usersCollection = dbClient.db().collection<UserData>('users');

    const topUsers = await usersCollection.find({ guildId: interaction.guild.id })
        .sort({ xp: -1 })
        .limit(10)
        .toArray();

    const leaderboardEmbed = new EmbedBuilder()
        .setColor('#DAA520')
        .setTitle(`🏆 Leaderboard for ${interaction.guild.name}`);

    if (topUsers.length === 0) {
        leaderboardEmbed.setDescription('It\'s empty in here... Start chatting to get on the board!');
    } else {
        const fields = await Promise.all(topUsers.map(async (user, index) => {
            try {
                const discordUser = await interaction.client.users.fetch(user.userId);
                const level = calculateLevel(user.xp);
                return {
                    name: `#${index + 1} ${discordUser.username}`,
                    value: `**Level:** ${level} | **XP:** ${user.xp}`,
                    inline: false
                };
            } catch {
                return {
                    name: `#${index + 1} *Unknown User*`,
                    value: `**Level:** ${calculateLevel(user.xp)} | **XP:** ${user.xp}`,
                    inline: false
                };
            }
        }));
        leaderboardEmbed.addFields(fields);
    }

    await interaction.editReply({ embeds: [leaderboardEmbed] });
};
