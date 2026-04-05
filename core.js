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

// --- KONFIGURACJA NA SZTYWNO (RAILWAY SAFE) ---
function getStaffRoles() {
    return ['1489993021113241722']; // ID Trial Staffa Lava
}

const CATEGORIES = {
    pomoc: { label: 'Pomoc Ogólna', emoji: '📩', prefix: 'pomoc', category: '1490292110522323065' },
    zglos: { label: 'Zgłoszenie Gracza', emoji: '🚫', prefix: 'skarga', category: '1490292239895888062' },
    sklep: { label: 'Sklep i Płatności', emoji: '💎', prefix: 'sklep', category: '1490292329834086480' },
    wspolpraca: { label: 'Współpraca', emoji: '🤝', prefix: 'wspolpraca', category: '1490292412210221127' },
    inne: { label: 'Inne / Pozostałe', emoji: '✨', prefix: 'inne', category: '1490292506578128936' }
};

// --- ŁADOWANIE KOMEND ---
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
    // OBSŁUGA KOMEND SLASH
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
    }

    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    const staffRoles = getStaffRoles();
    const isStaff = interaction.member.roles.cache.some(role => staffRoles.includes(role.id)) || 
                    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 1. OTWIERANIE MODALA PO KLIKNIĘCIU PRZYCISKU
    if (interaction.isButton() && interaction.customId.startsWith('t_')) {
        const key = interaction.customId.replace('t_', '');
        const modal = new ModalBuilder()
            .setCustomId(`modal_open_${key}`)
            .setTitle('Formularz Lava Support');

        const input = new TextInputBuilder()
            .setCustomId('user_input')
            .setLabel("Opisz krótko swoją sprawę:")
            .setPlaceholder("Wpisz tutaj treść zgłoszenia...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    // 2. PRZETWARZANIE FORMULARZA I TWORZENIE KANAŁU
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_open_')) {
        const key = interaction.customId.replace('modal_open_', '');
        const userInput = interaction.fields.getTextInputValue('user_input');
        const cat = CATEGORIES[key];

        // SPRAWDZANIE CZY UŻYTKOWNIK MA JUŻ TICKET (LIMIT 1)
        const allCategoryIds = Object.values(CATEGORIES).map(c => c.category);
        const existingTicket = interaction.guild.channels.cache.find(channel => 
            allCategoryIds.includes(channel.parentId) && 
            channel.name.includes(interaction.user.username.toLowerCase())
        );

        if (existingTicket) {
            return interaction.reply({ 
                content: `❌ Masz już otwarty bilet w dziale ${existingTicket.parent ? existingTicket.parent.name : 'wsparcia'}: ${existingTicket}`, 
                ephemeral: true 
            });
        }

        // TWORZENIE KANAŁU
        const channel = await interaction.guild.channels.create({
            name: `${cat.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: cat.category,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
                ...staffRoles.map(id => ({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] }))
            ],
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`${cat.emoji} Lava Support - ${cat.label}`)
            .setDescription(`Witaj ${interaction.user}!\n\n**Twoja sprawa:**\n\`\`\`${userInput}\`\`\`\n\n*Zaraz ktoś z ekipy Lavy zajmie się Twoim zgłoszeniem.*`)
            .setColor('#ff6600')
            .setFooter({ text: 'Lava Ticket System', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Przejmij').setEmoji('🔥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `@everyone`, embeds: [welcomeEmbed], components: [row] });
        await interaction.reply({ content: `✅ Twój ticket został utworzony: ${channel}`, ephemeral: true });
    }

    // 3. OBSŁUGA PRZYCISKU CLAIM (PRZEJMIJ)
    if (interaction.isButton() && interaction.customId === 'claim') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko ekipa Lavy może przejmować zgłoszenia!", ephemeral: true });

        const claimEmbed = new EmbedBuilder()
            .setDescription(`🔥 To zgłoszenie jest teraz obsługiwane przez: **${interaction.user.username}**`)
            .setColor('#00ff00');

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claimed').setLabel('Przejęte').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ components: [disabledRow] });
        await interaction.channel.send({ embeds: [claimEmbed] });
    }

    // 4. OBSŁUGA PRZYCISKU CLOSE (ZAMKNIJ)
    if (interaction.isButton() && interaction.customId === 'close_req') {
        if (!isStaff) return interaction.reply({ content: "❌ Nie masz uprawnień do zamykania ticketów.", ephemeral: true });

        const modal = new ModalBuilder().setCustomId('modal_close').setTitle('Zamykanie zgłoszenia');
        const input = new TextInputBuilder().setCustomId('reason').setLabel("Powód zamknięcia:").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal
