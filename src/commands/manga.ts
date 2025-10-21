import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { request } from 'undici';

// --- Jikan API Interfaces ---
interface JikanManga {
    mal_id: number;
    url: string;
    images: { jpg: { image_url: string } };
    title: string;
    synopsis: string | null;
    score: number | null;
    chapters: number | null;
    volumes: number | null;
    status: string;
}

interface JikanMangaSearchResponse {
    data: JikanManga[];
}

interface JikanGenre {
    mal_id: number;
    name: string;
}

interface JikanGenresResponse {
    data: JikanGenre[];
}

interface JikanRandomMangaResponse {
    data: JikanManga;
}

interface JikanMangaFull {
    mal_id: number;
    url: string;
    images: { jpg: { image_url: string } };
    title: string;
    title_english: string | null;
    title_japanese: string | null;
    type: string | null;
    chapters: number | null;
    volumes: number | null;
    status: string;
    published: { string: string | null; };
    score: number | null;
    scored_by: number | null;
    rank: number | null;
    popularity: number | null;
    members: number | null;
    favorites: number | null;
    synopsis: string | null;
    background: string | null;
    authors: { mal_id: number; type: string; name: string; url: string; }[];
    serializations: { mal_id: number; type: string; name: string; url: string; }[];
    genres: { mal_id: number; type: string; name: string; url: string; }[];
    explicit_genres: { mal_id: number; type: string; name: string; url: string; }[];
    themes: { mal_id: number; type: string; name: string; url: string; }[];
    demographics: { mal_id: number; type: string; name: string; url: string; }[];
}

interface JikanMangaFullResponse {
    data: JikanMangaFull;
}


export const data = new SlashCommandBuilder()
    .setName('manga')
    .setDescription('📚 Your one-stop-shop for all things manga!')
    .addSubcommand(subcommand =>
        subcommand
            .setName('search')
            .setDescription('🔍 Find details about any manga.')
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('The title you want to look up.')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('recommend')
            .setDescription('🎁 Get a surprise manga recommendation!')
            .addStringOption(option =>
                option.setName('genre')
                    .setDescription('Filter your recommendation by a specific genre.')
                    .setRequired(false)
            )
    );

async function fetchAndSendMangaRecommendation(interaction: ChatInputCommandInteraction, genre: string | null) {
    try {
        let mangaId: number;

        if (genre) {
            const genresResponse = await request('https://api.jikan.moe/v4/genres/manga');
            const genresData = await genresResponse.body.json() as JikanGenresResponse;
            const genreObj = genresData.data.find((g: JikanGenre) => g.name.toLowerCase() === genre.toLowerCase());

            if (!genreObj) {
                await interaction.editReply(`Could not find the genre "${genre}". Please check the spelling.`);
                return { content: `Could not find the genre "${genre}". Please check the spelling.` };
            }

            const mangaResponse = await request(`https://api.jikan.moe/v4/manga?genres=${genreObj.mal_id}&order_by=score&sort=desc`);
            const mangaData = await mangaResponse.body.json() as JikanMangaSearchResponse;

            if (!mangaData.data || mangaData.data.length === 0) {
                await interaction.editReply(`Could not find any manga in the "${genre}" genre.`);
                return { content: `Could not find any manga in the "${genre}" genre.` };
            }

            mangaId = mangaData.data[Math.floor(Math.random() * mangaData.data.length)].mal_id;

        } else {
            const randomResponse = await request('https://api.jikan.moe/v4/random/manga');
            const randomData = await randomResponse.body.json() as JikanRandomMangaResponse;
            mangaId = randomData.data.mal_id;
        }

        const fullMangaResponse = await request(`https://api.jikan.moe/v4/manga/${mangaId}/full`);
        const fullMangaData = await fullMangaResponse.body.json() as JikanMangaFullResponse;
        const manga = fullMangaData.data;

        const mangaEmbed = new EmbedBuilder()
            .setColor('#e55c3a')
            .setTitle(manga.title)
            .setURL(manga.url)
            .setThumbnail(manga.images.jpg.image_url)
            .setImage(manga.images.jpg.image_url)
            .setDescription(manga.synopsis ? manga.synopsis.slice(0, 256) + '...' : 'No synopsis available.')
            .addFields(
                { name: '\📅 Published', value: manga.published.string ? manga.published.string : 'N/A', inline: false },
                { name: '\📚 Genres', value: manga.genres.map(g => g.name).join(', ') || 'N/A', inline: false },
                { 
                    name: '\ℹ️ Info', 
                    value: `• **Type:** ${manga.type || 'N/A'}\n• **Status:** ${manga.status || 'N/A'}\n• **Chapters:** ${manga.chapters || 'N/A'}\n• **Volumes:** ${manga.volumes || 'N/A'}`,
                    inline: true 
                },
                { 
                    name: '\⭐ Popularity', 
                    value: `• **Score:** ${manga.score ? manga.score.toString() : 'N/A'}/100\n• **Rank:** #${manga.rank ? manga.rank.toString() : 'N/A'}\n• **Popularity Rank:** #${manga.popularity ? manga.popularity.toString() : 'N/A'}`,
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

        return { embeds: [mangaEmbed], components: [row] };

    } catch (error) {
        console.error('Manga recommendation failed:', error);
        return { content: 'An error occurred while fetching a manga recommendation. Please try again later.' };
    }
}

export const execute = async (interaction: ChatInputCommandInteraction) => {
    if (interaction.options.getSubcommand() === 'search') {
        await interaction.deferReply();
        const title = interaction.options.getString('title');

        if (!title) {
            await interaction.editReply({ content: 'You must provide a title to search for.' });
            return;
        }

        try {
            const mangaResponse = await request(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}`);
            const mangaData = await mangaResponse.body.json() as JikanMangaSearchResponse;

            if (!mangaData.data || mangaData.data.length === 0) {
                await interaction.editReply(`Could not find any results for "${title}".`);
                return;
            }

            const pagedEmbeds: EmbedBuilder[][] = [];
            const itemsPerPage = 5;
            for (let i = 0; i < mangaData.data.length; i += itemsPerPage) {
                const chunk = mangaData.data.slice(i, i + itemsPerPage);
                const pageEmbeds = chunk.map(manga => {
                    return new EmbedBuilder()
                        .setColor('#e55c3a')
                        .setTitle(manga.title)
                        .setURL(manga.url)
                        .setImage(manga.images.jpg.image_url)
                        .setDescription(manga.synopsis ? manga.synopsis.slice(0, 100) + '...' : 'No synopsis available.')
                        .addFields(
                            { name: 'Score', value: manga.score ? manga.score.toString() : 'N/A', inline: true },
                            { name: 'Chapters', value: manga.chapters ? manga.chapters.toString() : 'N/A', inline: true },
                            { name: 'Volumes', value: manga.volumes ? manga.volumes.toString() : 'N/A', inline: true },
                            { name: 'Status', value: manga.status ? manga.status : 'N/A', inline: true }
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
            console.error('Manga search command failed:', error);
            await interaction.editReply({ content: 'An error occurred while fetching manga data. Please try again later.' });
        }
    } else if (interaction.options.getSubcommand() === 'recommend') {
        await interaction.deferReply();
        const genre = interaction.options.getString('genre');

        const sendRecommendation = async () => {
            const result = await fetchAndSendMangaRecommendation(interaction, genre);
            if (result.content) {
                await interaction.editReply({ content: result.content, embeds: [], components: [] });
            } else {
                await interaction.editReply({ embeds: result.embeds, components: result.components });
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
