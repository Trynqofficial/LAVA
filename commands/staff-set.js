const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-set')
        .setDescription('Dodaj/Usuń rolę Staff do ticketów')
        .addRoleOption(option => option.setName('rola').setDescription('Rola Staffu').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const role = interaction.options.getRole('rola');
        const configPath = path.join(__dirname, '../config.json');
        let config = { staffRoles: [] };

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const index = config.staffRoles.indexOf(role.id);
        if (index === -1) {
            config.staffRoles.push(role.id);
            await interaction.reply({ content: `✅ Dodano rolę **${role.name}** do systemu.`, ephemeral: true });
        } else {
            config.staffRoles.splice(index, 1);
            await interaction.reply({ content: `🗑️ Usunięto rolę **${role.name}**.`, ephemeral: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    },
};
