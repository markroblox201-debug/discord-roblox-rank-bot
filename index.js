require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const noblox = require("noblox.js");
const http = require("http");

// =====================
// ✅ ENV / CONFIG
// =====================
const TOKEN = (process.env.DISCORD_TOKEN || "").trim();
const CLIENT_ID = (process.env.CLIENT_ID || "").trim(); // Discord Application ID
const ALLOWED_GUILD_ID = (process.env.GUILD_ID || "").trim(); // YOUR Discord server ID
const GROUP_ID = Number(process.env.ROBLOX_GROUP_ID);
const COOKIE = (process.env.ROBLOX_COOKIE || "").trim();

function must(name, val) {
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

must("DISCORD_TOKEN", TOKEN);
must("CLIENT_ID", CLIENT_ID);
must("GUILD_ID", ALLOWED_GUILD_ID);
must("ROBLOX_GROUP_ID", GROUP_ID);
must("ROBLOX_COOKIE", COOKIE);

// =====================
// 🤖 DISCORD CLIENT (ONLY ONCE)
// =====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// =====================
// 🔒 SECURITY #1: AUTO-LEAVE UNAUTHORIZED SERVERS
// =====================
client.on("guildCreate", async (guild) => {
  if (guild.id !== ALLOWED_GUILD_ID) {
    console.log(`🚫 Unauthorized server joined: ${guild.name} (${guild.id}) -> leaving`);
    try {
      await guild.leave();
      console.log("✅ Left unauthorized server");
    } catch (e) {
      console.error("❌ Failed to leave unauthorized server:", e);
    }
  }
});

// =====================
// 🔒 SECURITY #2: BLOCK COMMANDS OUTSIDE YOUR SERVER
// =====================
async function blockIfWrongServer(interaction) {
  if (interaction.guildId !== ALLOWED_GUILD_ID) {
    await interaction.reply({
      content: "🚫 This bot is private and only works in its main server.",
      ephemeral: true,
    });
    return true;
  }
  return false;
}

// =====================
// 🧩 SLASH COMMANDS
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Rank a Roblox user (ADMIN ONLY)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // 🔒 SECURITY #3
    .addStringOption((o) =>
      o.setName("username").setDescription("Roblox username").setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName("rankid").setDescription("Roblox group role ID").setRequired(true)
    ),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  console.log("📌 Registering slash commands...");
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, ALLOWED_GUILD_ID), {
    body: commands,
  });
  console.log("✅ Slash commands registered.");
}

// =====================
// 🎮 ROBLOX LOGIN
// =====================
async function loginRoblox() {
  console.log("🔑 Logging into Roblox...");
  await noblox.setCookie(COOKIE);
  const me = await noblox.getCurrentUser();
  console.log(`✅ Logged into Roblox as ${me.UserName}`);
}

// =====================
// ✅ READY
// =====================
client.once("ready", async () => {
  console.log(`✅ Discord ready: ${client.user.tag}`);

  try {
    await registerCommands();
  } catch (e) {
    console.error("❌ Command registration failed:", e);
  }

  try {
    await loginRoblox();
  } catch (e) {
    console.error("❌ Roblox login failed:", e);
  }
});

// =====================
// ⚡ COMMAND HANDLER
// =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 🔒 Block outside server
  if (await blockIfWrongServer(interaction)) return;

  if (interaction.commandName === "rank") {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString("username", true);
    const rankId = interaction.options.getNumber("rankid", true);

    try {
      const userId = await noblox.getIdFromUsername(username);
      await noblox.setRank(GROUP_ID, userId, rankId);

      await interaction.editReply(`✅ Ranked **${username}** to rank ID **${rankId}**`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Rank failed. Check username/rank ID/bot permissions.");
    }
  }
});

// =====================
// 🌐 RENDER WEB SERVER (KEEP-ALIVE)
// =====================
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is running.");
  })
  .listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// =====================
// 🔑 LOGIN (ONLY ONCE, KEEP LAST)
// =====================
client.login(TOKEN);
