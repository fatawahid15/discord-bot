import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { request } from 'undici';

// --- Jikan API Interfaces ---
interface JikanAnime {
    mal_id: number;
    url: string;
    images: { jpg: { image_url: string } };
    title: string;
    synopsis: string | null;
    score: number | null;
    episodes: number | null;
    status: string;
}

interface JikanAnimeSearchResponse {
    data: JikanAnime[];
}

interface JikanGenre {
    mal_id: number;
    name: string;
}

interface JikanGenresResponse {
    data: JikanGenre[];
}

interface JikanRandomResponse {
    data: JikanAnime;
}

interface JikanAnimeFull extends JikanAnime {
    aired: { string: string | null; };
    genres: JikanGenre[];
    type: string | null;
    rank: number | null;
    popularity: number | null;
    members: number | null;
    favorites: number | null;
    studios: { name: string }[];
    producers: { name: string }[];
    licensors: { name: string }[];
}

interface JikanAnimeFullResponse {
    data: JikanAnimeFull;
}


export const data = new SlashCommandBuilder()
    .setName('anime')
    .setDescription('✨ Your one-stop-shop for all things anime!')
    .addSubcommand(subcommand =>
        subcommand
            .setName('search')
            .setDescription('🔍 Find details about any anime.')
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('The title you want to look up.')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('recommend')
            .setDescription('🎁 Get a surprise anime recommendation!')
            .addStringOption(option =>
                option.setName('genre')
                    .setDescription('Filter your recommendation by a specific genre.')
                    .setRequired(false)
            )
    );

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (interaction.options.getSubcommand() === 'search') {
        await interaction.deferReply();
        const title = interaction.options.getString('title');

        if (!title) {
            await interaction.editReply({ content: 'You must provide a title to search for.' });
            return;
        }

        try {
            const animeResponse = await request(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}`);
            const animeData = await animeResponse.body.json() as JikanAnimeSearchResponse;

            if (!animeData.data || animeData.data.length === 0) {
                await interaction.editReply(`Could not find any results for "${title}".`);
                return;
            }

            const pagedEmbeds: EmbedBuilder[][] = [];
            const itemsPerPage = 5;
            for (let i = 0; i < animeData.data.length; i += itemsPerPage) {
                const chunk = animeData.data.slice(i, i + itemsPerPage);
                const pageEmbeds = chunk.map(anime => {
                    return new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(anime.title)
                        .setURL(anime.url)
.setImage(anime.images.jpg.image_url)
                        .setDescription(anime.synopsis ? anime.synopsis.slice(0, 100) + '...' : 'No synopsis available.')
                        .addFields(
                            { name: 'Score', value: anime.score ? anime.score.toString() : 'N/A', inline: true },
                            { name: 'Episodes', value: anime.episodes ? anime.episodes.toString() : 'N/A', inline: true },
                            { name: 'Status', value: anime.status ? anime.status : 'N/A', inline: true }
                        )
                        .setFooter({ text: `Source: MyAnimeList`, iconURL: 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png' });
                });
                pagedEmbeds.push(pageEmbeds);
            }

            let currentPage = 0;

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pagedEmbeds.length === 1)
                );

            const message = await interaction.editReply({
                embeds: pagedEmbeds[currentPage],
                components: [row]
            });

            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    i.reply({ content: `These buttons aren\'t for you!`, ephemeral: true });
                    return;
                }

                if (i.customId === 'next') {
                    currentPage++;
                } else if (i.customId === 'previous') {
                    currentPage--;
                }

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === pagedEmbeds.length - 1);

                await i.update({
                    embeds: pagedEmbeds[currentPage],
                    components: [row]
                });
            });

            collector.on('end', async () => {
                row.components.forEach(component => component.setDisabled(true));
                await interaction.editReply({ components: [row] });
            });

        } catch (error) {
            console.error('Anime search command failed:', error);
            await interaction.editReply({ content: 'An error occurred while fetching anime data. Please try again later.' });
        }
    } else if (interaction.options.getSubcommand() === 'recommend') {
        await interaction.deferReply();
        const genre = interaction.options.getString('genre');

        const sendRecommendation = async () => {
            try {
                let animeId: number;

                if (genre) {
                    const genresResponse = await request('https://api.jikan.moe/v4/genres/anime');
                    const genresData = await genresResponse.body.json() as JikanGenresResponse;
                    const genreObj = genresData.data.find((g: JikanGenre) => g.name.toLowerCase() === genre.toLowerCase());

                    if (!genreObj) {
                        await interaction.editReply(`Could not find the genre "${genre}". Please check the spelling.`);
                        return;
                    }

                    const animeResponse = await request(`https://api.jikan.moe/v4/anime?genres=${genreObj.mal_id}&order_by=score&sort=desc`);
                    const animeData = await animeResponse.body.json() as JikanAnimeSearchResponse;

                    if (!animeData.data || animeData.data.length === 0) {
                        await interaction.editReply(`Could not find any anime in the "${genre}" genre.`);
                        return;
                    }

                    animeId = animeData.data[Math.floor(Math.random() * animeData.data.length)].mal_id;

                } else {
                    const randomResponse = await request('https://api.jikan.moe/v4/random/anime');
                    const randomData = await randomResponse.body.json() as JikanRandomResponse;
                    animeId = randomData.data.mal_id;
                }

                const fullAnimeResponse = await request(`https://api.jikan.moe/v4/anime/${animeId}/full`);
                const fullAnimeData = await fullAnimeResponse.body.json() as JikanAnimeFullResponse;
                const anime = fullAnimeData.data;

                const animeEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(anime.title)
                    .setURL(anime.url)
                    .setThumbnail(anime.images.jpg.image_url)
                    .setImage(anime.images.jpg.image_url)
                    .setDescription(anime.synopsis ? anime.synopsis.slice(0, 256) + '...' : 'No synopsis available.')
                    .addFields(
                        { name: '\📅 Stream', value: anime.aired.string ? anime.aired.string : 'N/A', inline: false },
                        { name: '\📚 Genres', value: anime.genres.map((g: JikanGenre) => g.name).join(', ') || 'N/A', inline: false },
                        { 
                            name: '\ℹ️ Info', 
                            value: `• **Type:** ${anime.type || 'N/A'}\n• **Status:** ${anime.status || 'N/A'}\n• **Episodes:** ${anime.episodes || 'N/A'}`,
                            inline: true 
                        },
                        { 
                            name: '\⭐ Popularity', 
                            value: `• **Score:** ${anime.score ? anime.score.toString() : 'N/A'}/100\n• **Rank:** #${anime.rank ? anime.rank.toString() : 'N/A'}\n• **Popularity Rank:** #${anime.popularity ? anime.popularity.toString() : 'N/A'}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `Source: MyAnimeList`, iconURL: 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png' });

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('next_recommendation')
                            .setLabel('Next Recommendation')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.editReply({ embeds: [animeEmbed], components: [row] });

            } catch (error) {
                console.error('Anime recommend command failed:', error);
                await interaction.editReply({ content: 'An error occurred while fetching an anime recommendation. Please try again later.' });
            }
        };

        await sendRecommendation();

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 }); // 5 minutes

        collector.on('collect', async i => {
            if (i.customId === 'next_recommendation') {
                await i.deferUpdate();
                await sendRecommendation();
            }
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('next_recommendation')
                        .setLabel('Next Recommendation')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            await interaction.editReply({ components: [disabledRow] });
        });
    }
};
