import fs from 'fs';
import path from 'path';
import { Client, ClientOptions, Collection, GatewayIntentBits, Interaction, Message } from 'discord.js';
import * as dotenv from 'dotenv';
import { handleMessageForLeveling } from './leveling';
import { connectToDB } from './database'; // Import the database connection function

dotenv.config();

// Extend the Client class to include a 'commands' property
class BotClient extends Client {
    commands: Collection<string, any>;

    constructor(options: ClientOptions) {
        super(options);
        this.commands = new Collection();
    }
}

const client = new BotClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Main async function to start the bot
async function start() {
    // Connect to the database before doing anything else
    await connectToDB();

    // --- Event Listeners ---

    client.once('ready', () => {
        console.log('Bot is ready and logged in!');
    });

    client.on('interactionCreate', async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    });

    client.on('messageCreate', async (message: Message) => {
        if (message.author.bot || !message.guild) return; // Ignore bots and DMs
        await handleMessageForLeveling(message);
    });

    // Login to Discord
    client.login(process.env.DISCORD_TOKEN);
}

// Run the bot
start();