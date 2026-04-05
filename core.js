const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType 
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = '1465447308111118520'; 

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// --- ŁADOWANIE KOMEND ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

function getConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) return { staffRoles: [] };
    try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return data.staffRoles ? data : { staffRoles: [] };
    } catch (e) { return { staffRoles: [] }; }
}

client.once('ready', async () => {
    console.log(`✅ Lava Bot Online!`);
    const SERWER_TAG = 'LAVA';
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) {
            const botMember = await guild.members.fetch(client.user.id);
            await botMember.setNickname(`${SERWER_TAG} ${client.user.username}`);
        }
    } catch (error) {
        console.log("⚠️ Błąd Nickname:", error.message);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
    }

    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    const config = getConfig();
    const staffRoles = config.staffRoles;
    const isStaff = interaction.member.roles.cache.some(role => staffRoles.includes(role.id)) || 
                    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 1. KLIKNIĘCIE PRZYCISKU -> MODAL
    if (interaction.isButton() && interaction.customId.startsWith('t_')) {
        const key = interaction.customId.replace('t_', '');
        
        const modal = new ModalBuilder()
            .setCustomId(`modal_open_${key}`)
            .setTitle('Formularz zgłoszeniowy Lava');

        const input = new TextInputBuilder()
            .setCustomId('user_input')
            .setLabel("W czym możemy pomóc?")
            .setPlaceholder("Opisz krótko swoją sprawę...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    // 2. MODAL SUBMIT -> TWORZENIE KANAŁU
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

        const overwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];

        staffRoles.forEach(id => {
            overwrites.push({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] });
        });

        const channel = await interaction.guild.channels.create({
            name: `${cat.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: cat.category,
            permissionOverwrites: overwrites,
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`${cat.emoji} Lava Support - ${cat.label}`)
            .setDescription(`Witaj ${interaction.user}!\n\n**Twoje zgłoszenie:**\n\`\`\`${userInput}\`\`\`\n\n**Status:** ⏳ Zaraz ktoś z ekipy Lavy zajrzy do Twojej sprawy!`)
            .setColor('#ff6600')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Przejmij').setEmoji('🔥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `@everyone`, embeds: [welcomeEmbed], components: [row] });
        await interaction.reply({ content: `✅ Twój bilet został otwarty: ${channel}`, ephemeral: true });
    }

    // 3. CLAIM
    if (interaction.isButton() && interaction.customId === 'claim') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko ekipa Lavy może to zrobić!", ephemeral: true });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claimed').setLabel('Przejęte').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ components: [buttons] });
        await interaction.channel.send({ 
            embeds: [new EmbedBuilder().setDescription(`🔥 Zgłoszenie obsługuje teraz: **${interaction.user.username}**`).setColor('#ff6600')] 
        });
    }

    // 4. CLOSE
    if (interaction.isButton() && interaction.customId === 'close_req') {
        if (!isStaff) return interaction.reply({ content: "❌ Nie masz uprawnień.", ephemeral: true });

        const modal = new ModalBuilder().setCustomId('modal_close').setTitle('Zamykanie Ticketu');
        const input = new TextInputBuilder().setCustomId('reason').setLabel("Powód zamknięcia:").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_close') {
        const reason = interaction.fields.getTextInputValue('reason');
        await interaction.reply("🌋 Zamykanie za 5 sekund...");
        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }
});

client.login(TOKEN);
