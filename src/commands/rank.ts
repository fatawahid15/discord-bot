import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { getUserXP, calculateLevel, getRank } from '../leveling';
import { Canvas, loadImage } from 'skia-canvas';

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('✨ Check your or another user\'s level and rank! ✨')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user whose rank you want to see.')
            .setRequired(false));

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const xp = await getUserXP(targetUser.id, interaction.guild.id);
    const level = calculateLevel(xp);
    const rank = await getRank(targetUser.id, interaction.guild.id);

    const canvas = new Canvas(934, 282);
    const ctx = canvas.getContext('2d');

    const background = await loadImage('https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fA%3D%3D');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(targetUser.username, 260, 160);

    ctx.font = '30px sans-serif';
    ctx.fillText(`Level: ${level}`, 260, 200);

    ctx.font = '30px sans-serif';
    ctx.fillText(`Rank: #${rank}`, 260, 240);

    const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.beginPath();
    ctx.arc(125, 141, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 25, 41, 200, 200);

    const attachment = new AttachmentBuilder(await canvas.toBuffer('png'), { name: 'rank-card.png' });

    await interaction.editReply({ files: [attachment] });
};