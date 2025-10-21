import { Message, TextChannel, EmbedBuilder, GuildMember } from 'discord.js';
import { tiers } from './config';
import { client as dbClient } from './database'; // Import the connected MongoDB client

// Define the structure of a user document in the database
interface UserData {
    userId: string;
    guildId: string;
    xp: number;
}

const usersCollection = dbClient.db().collection<UserData>('users');

// --- Exported Functions ---

/**
 * Calculates the level based on the user's XP (message count).
 */
export const calculateLevel = (xp: number): number => {
    const sortedTiers = [...tiers].sort((a, b) => a.messages - b.messages);
    let currentLevel = 0;
    for (const tier of sortedTiers) {
        if (xp >= tier.messages) {
            currentLevel++;
        } else {
            break;
        }
    }
    return currentLevel;
};

/**
 * Retrieves the XP for a given user in a specific guild from the database.
 */
export const getUserXP = async (userId: string, guildId: string): Promise<number> => {
    const user = await usersCollection.findOne({ userId, guildId });
    return user?.xp || 0;
};

/**
 * Retrieves the rank of a given user in a specific guild from the database.
 */
export const getRank = async (userId: string, guildId: string): Promise<number> => {
    const users = await usersCollection.find({ guildId }).sort({ xp: -1 }).toArray();
    const rank = users.findIndex(user => user.userId === userId);
    return rank + 1;
};

// --- Core Logic ---

/**
 * Checks a user's message count and assigns the highest applicable role.
 */
async function updateUserRoles(member: GuildMember, xp: number) {
    const sortedTiers = [...tiers].sort((a, b) => b.messages - a.messages);

    for (const tier of sortedTiers) {
        if (xp >= tier.messages) {
            if (!member.roles.cache.has(tier.roleId)) {
                try {
                    await member.roles.add(tier.roleId);
                    console.log(`Assigned role '${tier.roleName}' to ${member.user.username}`);
                    break;
                } catch (error) {
                    console.error(`Failed to assign role '${tier.roleName}'.`);
                }
            }
            break;
        }
    }
}

/**
 * This function is called for every message to handle leveling and role assignments.
 */
export const handleMessageForLeveling = async (message: Message) => {
    // Ensure the message is from a server and has a member object
    if (!message.guild || !message.member) return;

    const { author, guild, member } = message;

    // Atomically find and update the user's document, incrementing XP by 1.
    // The `upsert: true` option creates the document if it doesn't exist.
    // The `returnDocument: 'after'` option ensures the updated document is returned.
    const result = await usersCollection.findOneAndUpdate(
        { userId: author.id, guildId: guild.id },
        { $inc: { xp: 1 }, $setOnInsert: { userId: author.id, guildId: guild.id } },
        { upsert: true, returnDocument: 'after' }
    );

    // The result from findOneAndUpdate is the document itself, or null.
    // It is NOT wrapped in a 'value' property in this driver version.
    if (!result) {
        console.error('Could not update or find user document after operation.');
        return;
    }

    const newXP = result.xp;
    const oldXP = newXP - 1;

    // 2. Check for level up and send a message
    const oldLevel = calculateLevel(oldXP);
    const newLevel = calculateLevel(newXP);

    if (newLevel > oldLevel) {
        if (message.channel instanceof TextChannel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 Level Up! 🎉')
                .setDescription(`Congratulations, ${author}! You have reached **Level ${newLevel}**!`)
                .setThumbnail(author.displayAvatarURL())
                .setTimestamp();
            message.channel.send({ embeds: [levelUpEmbed] });
        }
    }

    // 3. Update user roles based on their new message count
    await updateUserRoles(member, newXP);
};