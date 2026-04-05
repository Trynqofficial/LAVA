const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Wysyła panel ticketów Lava Support'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔥 CENTRUM WSPARCIA LAVA')
            .setDescription(
                'Masz problem? Chcesz o coś zapytać? Wybierz kategorię!\n\n' +
                '📩 **Pomoc ogólna**\n' +
                '🚫 **Zgłoś gracza**\n' +
                '💎 **Sklep i Płatności**\n' +
                '🤝 **Współpraca**\n' +
                '✨ **Inne / Pozostałe**\n\n' +
                '---\n' +
                '*Kliknij przycisk poniżej, aby otworzyć bilet.*'
            )
            .setColor('#ff6600')
            .setThumbnail(interaction.guild.iconURL());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_pomoc').setLabel('Pomoc ogólna').setEmoji('📩').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_zglos').setLabel('Zgłoś gracza').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_sklep').setLabel('Sklep i Płatności').setEmoji('💎').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_wspolpraca').setLabel('Współpraca').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_inne').setLabel('Inne').setEmoji('✨').setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel wysłany!', ephemeral: true });
    },
};
