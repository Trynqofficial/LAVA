const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('setup').setDescription('Panel Lava'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔥 LAVA SUPPORT')
            .setDescription('Wybierz kategorię, aby otrzymać pomoc:\n\n📩 Pomoc\n🚫 Zgłoszenia\n💎 Sklep\n🤝 Współpraca\n✨ Inne')
            .setColor('#ff6600');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_pomoc').setLabel('Pomoc').setEmoji('📩').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_zglos').setLabel('Zgłoś').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_sklep').setLabel('Sklep').setEmoji('💎').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_wspolpraca').setLabel('Współpraca').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('t_inne').setLabel('Inne').setEmoji('✨').setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel wysłany!', ephemeral: true });
    }
};
