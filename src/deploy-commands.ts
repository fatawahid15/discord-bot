import fs from 'fs';
import path from 'path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

console.log('Reading commands from the /commands directory...');

const commands = [];
const guildOnlyCommands = new Set([
    '8d', 'autoplay', 'bassboost', 'clear', 'disconnect', 'duplicates', 'exportqueue', 'filter', 'history',
    'importqueue', 'loop', 'lyrics', 'move', 'nowplaying', 'pause', 'pitch', 'play', 'previous', 'queue',
    'remove', 'replay', 'resume', 'search', 'seek', 'shuffle', 'skip', 'speed', 'stop', 'tremolo', 'vibrato', 'volume',
]);
const commandsPath = path.join(__dirname, 'commands');
// We read the compiled .js files, not the source .ts files.
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Retrieve required environment variables.
const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;

// Validate that the required environment variables are set.
if (!clientId || !token) {
    throw new Error('CLIENT_ID and DISCORD_TOKEN must be set in the .env file.');
}

if (/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error(
        'DISCORD_TOKEN appears to contain the application Public Key. Use the token from Developer Portal > Bot > Reset Token instead.'
    );
}

// Loop over each command file, import it, and add its data to the commands array.
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    const definition = command.data.toJSON();
    if (guildOnlyCommands.has(definition.name)) definition.contexts = [0];
    commands.push(definition);
    console.log(`- Loaded command: /${command.data.name}`);
}

// Construct and prepare an instance of the REST module to make API calls.
const rest = new REST({ version: '10' }).setToken(token);

// This is the main function that deploys the commands.
(async () => {
    try {
        console.log(`
Started refreshing ${commands.length} application (/) commands globally.`);

        // The `put` method is used to fully refresh all commands with the current set.
        // By using `Routes.applicationCommands(clientId)`, we are registering the commands globally.
        // This is different from `Routes.applicationGuildCommands(clientId, guildId)` which we used for testing.
        const data: any = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands globally.`);
        console.log('IMPORTANT: It may take up to an hour for global commands to appear in all servers.');

    } catch (error) {
        // Be sure to log any errors that occur during deployment.
        console.error('Failed to deploy global commands:', error);
        process.exitCode = 1;
    }
})();
