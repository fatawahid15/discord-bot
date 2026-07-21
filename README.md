# Discord Bot

A stateless Discord entertainment and music bot built with Node.js, TypeScript, and Discord.js. Music playback runs inside the Node process, and queues reset when the process restarts.

## Features

- Music from YouTube and SoundCloud, with Spotify links resolved to playable sources
- Requester-owned track controls with role-free listener voting for shared actions
- A single rich player controller, queue files, autoplay, lyrics, history, and audio effects
- Anime and manga search and recommendations
- Social action commands and server information
- No application database

## Requirements

- Node.js 24 or newer
- A Discord application and bot token

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill in the values:

```env
DISCORD_TOKEN=your_token_from_the_discord_developer_portal_bot_page
CLIENT_ID=your_application_id_from_the_general_information_page
```

Use the token from Discord Developer Portal > **Bot**, not the application Public Key.

3. Register slash commands:

```bash
npm run deploy
```

Global command updates can take time to appear in every server.

4. Build and start the bot:

```bash
npm run build
npm start
```

For a one-command local build and start:

```bash
npm run dev
```

## Commands

### Music

- Playback: `/play`, `/search`, `/pause`, `/resume`, `/skip`, `/stop`, `/disconnect`, `/previous`, `/replay`
- Queue: `/queue`, `/remove`, `/move`, `/clear`, `/duplicates`, `/history`, `/exportqueue`, `/importqueue`
- Session: `/nowplaying`, `/volume`, `/loop`, `/autoplay`, `/shuffle`, `/seek`
- Effects: `/filter`, `/bassboost`, `/8d`, `/speed`, `/pitch`, `/tremolo`, `/vibrato`
- Information: `/lyrics`

Users must be in the bot's voice channel to change playback. The requester directly controls their current song. Controlling another user's song or changing shared queue/session state starts a listener vote; Discord roles and server permissions do not bypass it. Stop and disconnect require private confirmation before voting.

Votes require half of the human listeners, with at least two votes when multiple people are present. If the requester leaves, their track becomes vote-controlled. Audio filters reset when the next track starts.

The queue supports up to 500 upcoming tracks, playlist additions are capped at 50, and play requests have a short per-user cooldown. The bot disconnects after two minutes with an empty queue or voice channel. Supported media URLs are restricted to YouTube, SoundCloud, and Spotify.

### Entertainment And Discovery

- `/cuddle`, `/hug`, `/kiss`, `/pat`, `/poke`, `/punch`, `/slap`
- `/anime`, `/manga`, `/serverinfo`, `/help`

## Discord Permissions

Invite the bot with the `bot` and `applications.commands` scopes. Music and response features need these channel permissions:

- View Channels
- Send Messages
- Embed Links
- Connect
- Speak
- Use Application Commands

The bot only requests the `Guilds` and `GuildVoiceStates` gateway intents. No privileged message-content intent is required.

## External Services

- Discord Player, MediaPlex, YouTube.js, and bundled FFmpeg provide in-process audio playback.
- `@snazzah/davey` provides Discord's required DAVE voice protocol support.
- Spotify links provide metadata only; Spotify audio is not streamed directly.

## Development

Run the test suite and dependency audit:

```bash
npm test
npm audit
```

Builds clean `dist` before compiling so removed commands cannot remain in deployment output.

## License

MIT. See [LICENSE](LICENSE).
