import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

// --- GIF URLs ---
const cuddleGifs = [
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzF1aXF1azNrOXprNWFxZHBramx4end0bWE5cmpuZHU3M2VqODY5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PHZ7v9tfQu0o0/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnhqcGQzbno0NXl1YmExOWJpZXB4aTFmdWp6Mndoczlxc2JmdXZzbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GMFUrC8E8aWoo/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGtvaGt5cGlwMjZpc2tqMTZwdXM2aDlmOTVmOHltcDZjeTN3emc5byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BXrwTdoho6hkQ/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTFoZWZzNXpmb2NidG95YjJ6aWR5NTZpcHJkN2Q5dnI2bGtpMmY0cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LIqFOpO9Qh0uA/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmNnNGx3dmU4N2luNXRlOGJoNmMyb3ZheTQ5Z3UyeGI2bHRiNWg5YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/eMpDBxxTzKety/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExanVhaTVxcjZ6b2p0NHAyZTI0enl4OTI3NXRpdmZvenl5MHQ0MmN6biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MrXjQjL5HV8urYBhLZ/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExanVhaTVxcjZ6b2p0NHAyZTI0enl4OTI3NXRpdmZvenl5MHQ0MmN6biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MrXjQjL5HV8urYBhLZ/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmk1OXZldHBnOG9kYXpmN21jazZyM3k0dXpwODFncnl0NGJ3MmQzaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7ZsnUYLno9IWI/giphy.gif",
];

export const data = new SlashCommandBuilder()
  .setName("cuddle")
  .setDescription("🤗 Need a cuddle? Give one to a friend!")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The lucky user you want to cuddle.")
      .setRequired(true)
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const author = interaction.user;
  const targetUser = interaction.options.getUser("user");

  if (!targetUser) {
    await interaction.reply({
      content: "You must specify a user to cuddle with.",
      ephemeral: true,
    });
    return;
  }

  if (author.id === targetUser.id) {
    await interaction.reply({
      content: "You can't cuddle with yourself!",
      ephemeral: true,
    });
    return;
  }

  const randomGif = cuddleGifs[Math.floor(Math.random() * cuddleGifs.length)];

  const cuddleEmbed = new EmbedBuilder()
    .setColor("#add8e6") // Light blue color
    .setDescription(`**${author} gives ${targetUser} a warm cuddle. How sweet!**`)
    .setImage(randomGif);

  await interaction.reply({ embeds: [cuddleEmbed] });
};
