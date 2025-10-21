# Discord Bot

This is a feature-rich Discord bot built with Node.js, TypeScript, and Discord.js. It includes a variety of commands for user interaction, server management, and entertainment. The bot also features a leveling system that rewards users with roles based on their activity.

## Features

*   **Anime & Manga:** Search for anime and manga, and get recommendations.
*   **Avatar:** Display a user's avatar.
*   **Fun Actions:** `cuddle`, `hug`, `kiss`, `pat`, `poke`, `punch`, `slap`
*   **Help:** Get a list of all available commands.
*   **Leaderboard:** Show the server's message leaderboard.
*   **Rank:** Check your or another user's level and rank.
*   **Server Info:** Display detailed information about the server.
*   **User Info:** Display detailed information about a user.
*   **Leveling System:** Users gain XP for messaging and are assigned roles based on their level.

## Installation and Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [MongoDB](https://www.mongodb.com/) (A running instance, either local or cloud-hosted)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/discord-bot.git
cd discord-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

Create a `.env` file in the root of the project and add the following environment variables:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
MONGODB_URI=your_mongodb_connection_string
```

You will also need to configure the role IDs in `src/config.ts`.

### 4. Running the Bot

*   **Development:**

```bash
npm run dev
```

This will compile the TypeScript code and restart the bot on any file changes.

*   **Production:**

```bash
npm start
```

### 5. Deploying Commands

To register the slash commands with Discord, run the following command:

```bash
npm run deploy
```

**Note:** It may take up to an hour for global commands to appear in all servers.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
