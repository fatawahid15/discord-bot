import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { isUnknownMessage, jikanArray, jikanObject, logCollectorError, randomJikanId, validMalId } from '../jikan';

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
            const animeData = (await jikanArray<JikanAnime>(`/anime?q=${encodeURIComponent(title)}`))
                .filter(item => Boolean(item?.title && item?.url && item?.images?.jpg?.image_url));

            if (animeData.length === 0) {
                await interaction.editReply(`Could not find any results for "${title}".`);
                return;
            }

            const pagedEmbeds: EmbedBuilder[][] = [];
            const itemsPerPage = 5;
            for (let i = 0; i < animeData.length; i += itemsPerPage) {
                const chunk = animeData.slice(i, i + itemsPerPage);
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
                        .setCustomId('anime:search:previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('anime:search:next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pagedEmbeds.length === 1)
                );

            const message = await interaction.editReply({
                embeds: pagedEmbeds[currentPage],
                components: [row]
            });

            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', i => {
                void (async () => {
                    if (i.user.id !== interaction.user.id) {
                        await i.reply({ content: `These buttons aren\'t for you!`, ephemeral: true });
                        return;
                    }

                    if (i.customId === 'anime:search:next') currentPage++;
                    else if (i.customId === 'anime:search:previous') currentPage--;
                    currentPage = Math.max(0, Math.min(currentPage, pagedEmbeds.length - 1));
                    row.components[0].setDisabled(currentPage === 0);
                    row.components[1].setDisabled(currentPage === pagedEmbeds.length - 1);
                    await i.update({ embeds: pagedEmbeds[currentPage], components: [row] });
                })().catch(error => logCollectorError('Anime pagination failed:', error));
            });

            collector.on('end', () => {
                row.components.forEach(component => component.setDisabled(true));
                void message.edit({ components: [row] }).catch(error => logCollectorError('Anime pagination cleanup failed:', error));
            });

        } catch (error) {
            console.error('Anime search command failed:', error);
            await interaction.editReply({ content: 'Anime data is temporarily unavailable. Please try again later.', embeds: [], components: [] });
        }
    } else if (interaction.options.getSubcommand() === 'recommend') {
        await interaction.deferReply();
        const genre = interaction.options.getString('genre');

        let active = true;
        let busy = false;
        const recommendationRow = (disabled = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('anime:recommend:next').setLabel('Next Recommendation').setStyle(ButtonStyle.Primary).setDisabled(disabled)
        );

        const sendRecommendation = async (): Promise<boolean> => {
            try {
                let animeId: number;

                if (genre) {
                    const genresData = await jikanArray<JikanGenre>('/genres/anime');
                    const genreObj = genresData.find((g: JikanGenre) => g.name.toLowerCase() === genre.toLowerCase());

                    if (!genreObj) {
                        if (active) await interaction.editReply({ content: `Could not find the genre "${genre}". Please check the spelling.`, embeds: [], components: [] });
                        return false;
                    }

                    const animeData = await jikanArray<JikanAnime>(`/anime?genres=${genreObj.mal_id}&order_by=score&sort=desc`);

                    const candidates = animeData.filter(item => validMalId(item?.mal_id));
                    if (!candidates.length) {
                        if (active) await interaction.editReply({ content: `Could not find any anime in the "${genre}" genre.`, embeds: [], components: [] });
                        return false;
                    }

                    animeId = candidates[Math.floor(Math.random() * candidates.length)].mal_id;

                } else {
                    animeId = await randomJikanId('anime');
                }

                const anime = await jikanObject<JikanAnimeFull>(`/anime/${animeId}/full`);
                if (!anime.title || !anime.url || !anime.images?.jpg?.image_url) throw new Error('Jikan returned incomplete anime data.');

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
                            value: `• **Score:** ${anime.score ? anime.score.toString() : 'N/A'}/10\n• **Rank:** #${anime.rank ? anime.rank.toString() : 'N/A'}\n• **Popularity Rank:** #${anime.popularity ? anime.popularity.toString() : 'N/A'}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `Source: MyAnimeList`, iconURL: 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png' });

                if (!active) return false;
                await interaction.editReply({ content: null, embeds: [animeEmbed], components: [recommendationRow()] });
                return true;

            } catch (error) {
                console.error('Anime recommend command failed:', error);
                if (isUnknownMessage(error) || !active) return false;
                await interaction.editReply({ content: 'Anime recommendations are temporarily unavailable. Please try again later.', embeds: [], components: [] })
                    .catch(editError => logCollectorError('Anime recommendation error reply failed:', editError));
                return false;
            }
        };

        if (!await sendRecommendation()) return;

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 }); // 5 minutes

        collector.on('collect', i => {
            void (async () => {
                if (i.customId !== 'anime:recommend:next') return;
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: `These buttons aren\'t for you!`, ephemeral: true });
                    return;
                }
                if (busy) {
                    await i.reply({ content: 'A recommendation is already loading.', ephemeral: true });
                    return;
                }
                busy = true;
                await i.update({ components: [recommendationRow(true)] });
                await sendRecommendation();
                busy = false;
            })().catch(error => {
                busy = false;
                logCollectorError('Anime recommendation control failed:', error);
            });
        });

        collector.on('end', () => {
            active = false;
            void message.edit({ components: [recommendationRow(true)] }).catch(error => logCollectorError('Anime recommendation cleanup failed:', error));
        });
    }
};
