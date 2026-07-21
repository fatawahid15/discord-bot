import fs from 'fs';
import path from 'path';
import { ChatInputCommandInteraction, Client, ClientOptions, Collection, Events, GatewayIntentBits, Interaction } from 'discord.js';
import * as dotenv from 'dotenv';
import { initializeMusic, shutdownMusic, startMusic } from './music/service';
import { handleMusicInteraction } from './music/governance';

dotenv.config({ quiet: true });

const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error('DISCORD_TOKEN must be set in the .env file.');
}

if (/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error(
        'DISCORD_TOKEN appears to contain the application Public Key. Use the token from Developer Portal > Bot > Reset Token instead.'
    );
}

// Extend the Client class to include a 'commands' property
interface CommandModule {
    data: { name: string };
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

class BotClient extends Client {
    commands: Collection<string, CommandModule>;

    constructor(options: ClientOptions) {
        super(options);
        this.commands = new Collection();
    }
}

const client = new BotClient({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
initializeMusic(client);

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
    // --- Event Listeners ---

    client.once(Events.ClientReady, () => {
        console.log('Bot is ready and logged in!');
    });

    client.on('interactionCreate', async (interaction: Interaction) => {
        try {
            if (interaction.isButton()) {
                if (await handleMusicInteraction(interaction)) return;
                return;
            }

            if (!interaction.isChatInputCommand()) return;
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                await interaction.reply({ content: 'That command is not available.', ephemeral: true });
                return;
            }
            await command.execute(interaction);
        } catch (error) {
            console.error('Interaction failed:', error);
            if (!interaction.isRepliable()) return;
            const response = { content: 'There was an error executing this command.', ephemeral: true } as const;
            try {
                if (interaction.deferred) await interaction.editReply({ content: response.content });
                else if (interaction.replied) await interaction.followUp(response);
                else await interaction.reply(response);
            } catch (responseError) {
                console.error('Could not send interaction error response:', responseError);
            }
        }
    });

    // Login to Discord
    await startMusic();
    await client.login(token);
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down.`);
    await shutdownMusic();
    client.destroy();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

// Run the bot
start().catch(error => {
    console.error('Failed to start the bot:', error);
    process.exitCode = 1;
});
