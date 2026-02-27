require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ✅ SERVER LOCK (leave unauthorized servers)
const ALLOWED_GUILD_ID = "PASTE_YOUR_SERVER_ID";

client.on("guildCreate", (guild) => {
  if (guild.id !== ALLOWED_GUILD_ID) {
    console.log(`Unauthorized server joined: ${guild.name} — leaving`);
    guild.leave();
  }
});


// your other events
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});


// login MUST stay last
client.login(process.env.DISCORD_TOKEN);

const noblox = require("noblox.js");

// ===== CONFIG =====
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const GROUP_ID = Number(process.env.ROBLOX_GROUP_ID);
const COOKIE = process.env.ROBLOX_COOKIE;

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== SLASH COMMAND =====
const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Rank a Roblox user")
    .addStringOption(o =>
      o.setName("username")
        .setDescription("Roblox username")
        .setRequired(true))
    .addNumberOption(o =>
      o.setName("rankid")
        .setDescription("Role ID in Roblox group")
        .setRequired(true))
].map(cmd => cmd.toJSON());


// ===== REGISTER COMMAND =====
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Commands registered.");
  } catch (err) {
    console.error(err);
  }
})();


// ===== LOGIN TO ROBLOX =====
async function loginRoblox() {
  try {
    await noblox.setCookie(COOKIE);
    const user = await noblox.getCurrentUser();
    console.log(`Logged into Roblox as ${user.UserName}`);
  } catch (err) {
    console.error("Roblox login failed:", err);
  }
}


// ===== BOT READY =====
client.once("ready", async () => {
  console.log(`Logged into Discord as ${client.user.tag}`);
  await loginRoblox();
});


// ===== COMMAND HANDLER =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "rank") {
    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const rankId = interaction.options.getNumber("rankid");

    try {
      const userId = await noblox.getIdFromUsername(username);

      await noblox.setRank(GROUP_ID, userId, rankId);

      await interaction.editReply(
        `✅ Ranked **${username}** to rank ID **${rankId}**`
      );

    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Rank failed.");
    }
  }
});


client.login(TOKEN);
// ===== RENDER KEEP-ALIVE SERVER =====
const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running.");
}).listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

