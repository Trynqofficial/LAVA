require('dotenv').config();
const { 
    Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, 
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// System rang na sztywno dla Railway
function getStaffRoles() {
    return ['1489993021113241722']; // ID Trial Staffa
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command) client.commands.set(command.data.name, command);
    }
}

client.once('ready', () => {
    console.log(`✅ Lava Bot Online!`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
    }

    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    const staffRoles = getStaffRoles();
    const isStaff = interaction.member.roles.cache.some(role => staffRoles.includes(role.id)) || 
                    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 1. OTWIERANIE MODALA
    if (interaction.isButton() && interaction.customId.startsWith('t_')) {
        const key = interaction.customId.replace('t_', '');
        const modal = new ModalBuilder()
            .setCustomId(`modal_open_${key}`)
            .setTitle('Formularz Lava Support');

        const input = new TextInputBuilder()
            .setCustomId('user_input')
            .setLabel("Opisz swoją sprawę:")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    // 2. TWORZENIE TICKETU
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_open_')) {
        const key = interaction.customId.replace('modal_open_', '');
        const userInput = interaction.fields.getTextInputValue('user_input');
        
        const CATEGORIES = {
            pomoc: { label: 'Pomoc Ogólna', emoji: '📩', prefix: 'pomoc', category: '1490292110522323065' },
            zglos: { label: 'Zgłoszenie Gracza', emoji: '🚫', prefix: 'skarga', category: '1490292239895888062' },
            sklep: { label: 'Sklep i Płatności', emoji: '💎', prefix: 'sklep', category: '1490292329834086480' },
            wspolpraca: { label: 'Współpraca', emoji: '🤝', prefix: 'wspolpraca', category: '1490292412210221127' },
            inne: { label: 'Inne / Pozostałe', emoji: '✨', prefix: 'inne', category: '1490292506578128936' }
        };
        
        const cat = CATEGORIES[key];
        const channel = await interaction.guild.channels.create({
            name: `${cat.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: cat.category,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ...staffRoles.map(id => ({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
            ],
        });

        const welcome = new EmbedBuilder()
            .setTitle(`🌋 Lava Support - ${cat.label}`)
            .setDescription(`Witaj ${interaction.user}!\n\n**Zgłoszenie:**\n\`\`\`${userInput}\`\`\``)
            .setColor('#ff6600').setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Przejmij').setEmoji('🔥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `@everyone`, embeds: [welcome], components: [row] });
        await interaction.reply({ content: `✅ Otwarto ticket: ${channel}`, ephemeral: true });
    }

    // 3. CLAIM & CLOSE
    if (interaction.customId === 'claim') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko Staff!", ephemeral: true });
        await interaction.channel.send({ embeds: [new EmbedBuilder().setDescription(`🔥 Obsługuje: ${interaction.user}`).setColor('#ff6600')] });
        await interaction.update({ components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c').setLabel('Przejęte').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setStyle(ButtonStyle.Danger)
        )] });
    }

    if (interaction.customId === 'close_req') {
        if (!isStaff) return interaction.reply({ content: "❌ Brak uprawnień", ephemeral: true });
        await interaction.reply("🌋 Zamykanie za 5s...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
