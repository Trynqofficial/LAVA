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

// --- KONFIGURACJA STAFFU (RAILWAY SAFE) ---
const STAFF_ROLES = ['1489993021113241722']; // ID Twojego Trial Staffa

const CATEGORIES = {
    pomoc: { label: 'Pomoc Ogólna', emoji: '📩', prefix: 'pomoc', category: '1490292110522323065' },
    zglos: { label: 'Zgłoszenie Gracza', emoji: '🚫', prefix: 'skarga', category: '1490292239895888062' },
    sklep: { label: 'Sklep i Płatności', emoji: '💎', prefix: 'sklep', category: '1490292329834086480' },
    wspolpraca: { label: 'Współpraca', emoji: '🤝', prefix: 'wspolpraca', category: '1490292412210221127' },
    inne: { label: 'Inne / Pozostałe', emoji: '✨', prefix: 'inne', category: '1490292506578128936' }
};

// --- ŁADOWANIE KOMEND SLASH ---
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
    // 1. KOMENDY SLASH (np. /setup)
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
    }

    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    const isStaff = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id)) || 
                    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 2. PRZYCISK OTWIERAJĄCY FORMULARZ (MODAL)
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

    // 3. TWORZENIE KANAŁU TICKETU (Z LIMITEM 1)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_open_')) {
        const key = interaction.customId.replace('modal_open_', '');
        const userInput = interaction.fields.getTextInputValue('user_input');
        const cat = CATEGORIES[key];

        const allCategoryIds = Object.values(CATEGORIES).map(c => c.category);
        const existingTicket = interaction.guild.channels.cache.find(channel => 
            allCategoryIds.includes(channel.parentId) && 
            channel.name.includes(interaction.user.username.toLowerCase())
        );

        if (existingTicket) {
            return interaction.reply({ content: `❌ Masz już otwarty bilet: ${existingTicket}`, ephemeral: true });
        }

        const channel = await interaction.guild.channels.create({
            name: `${cat.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: cat.category,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
                ...STAFF_ROLES.map(id => ({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] }))
            ],
        });

        const welcome = new EmbedBuilder()
            .setTitle(`${cat.emoji} Lava Support - ${cat.label}`)
            .setDescription(`Witaj ${interaction.user}!\n\n**Zgłoszenie:**\n\`\`\`${userInput}\`\`\``)
            .setColor('#ff6600')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Przejmij').setEmoji('🔥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `@everyone`, embeds: [welcome], components: [row] });
        await interaction.reply({ content: `✅ Ticket utworzony: ${channel}`, ephemeral: true });
    }

    // 4. OBSŁUGA CLAIM (PRZEJĘCIA)
    if (interaction.isButton() && interaction.customId === 'claim') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko Staff!", ephemeral: true });
        await interaction.update({ components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c').setLabel('Przejęte').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setStyle(ButtonStyle.Danger)
        )] });
        await interaction.channel.send({ embeds: [new EmbedBuilder().setDescription(`🔥 Obsługuje: ${interaction.user}`).setColor('#ff6600')] });
    }

    // 5. OBSŁUGA PRZYCISKU ZAMKNIJ (OTWIERA POWÓD)
    if (interaction.isButton() && interaction.customId === 'close_req') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko Staff!", ephemeral: true });
        const modal = new ModalBuilder().setCustomId('modal_close').setTitle('Zamykanie zgłoszenia');
        const input = new TextInputBuilder().setCustomId('reason').setLabel("Powód zamknięcia:").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    // 6. FINALNE USUWANIE I WYSYŁKA DM DO UŻYTKOWNIKA
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_close') {
        const reason = interaction.fields.getTextInputValue('reason');
        const channel = interaction.channel;
        
        // Szukamy ID klienta (osoby, która nie jest botem i nie jest staffem) w uprawnieniach kanału
        const targetPerm = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.id !== client.user.id && !STAFF_ROLES.includes(po.id));

        await interaction.reply({ content: `🌋 Zamykanie za 5s... Powód wysłano na DM.` });

        if (targetPerm) {
            try {
                const user = await client.users.fetch(targetPerm.id);
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔒 Twój ticket został zamknięty')
                    .setDescription(`Twoje zgłoszenie na serwerze **${interaction.guild.name}** zostało zakończone przez zespół LAVA.`)
                    .addFields(
                        { name: '📂 Kanał', value: `\`#${channel.name}\``, inline: true },
                        { name: '📝 Powód zamknięcia', value: `\`\`\`${reason}\`\`\`` }
                    )
                    .setColor('#ff6600')
                    .setTimestamp();
                await user.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.log(`Nie można wysłać DM (użytkownik ma zablokowane wiadomości).`);
            }
        }
        
        setTimeout(() => { channel.delete().catch(() => {}); }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
