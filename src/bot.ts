import { Client, GatewayIntentBits, EmbedBuilder, Guild, Message, GuildMember, Role, ColorResolvable, MessageReaction, User, Colors, Collection, GuildTextBasedChannel, Routes, REST, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GreeterRole, SFAcorp, adminRole, auditlogchannel, logchannel, prefix, recapchannel, representtiverole, rseventlogchannel, scorekeeperrole, welcomechannel } from '../config/config.js';
import { autoresponsecheck } from './modules/autoresponse.js';
import { commandGroup } from './modules/command.js';
import { initDB, queryDB } from "./modules/DB.js"
import { initHelp } from './modules/help.js';
import { initAFKTimeoutCheckLoop, initRS } from './modules/redstar.js';
import { initstats } from './modules/stats.js';
import { initRole } from './modules/role.js';
import { initUser } from './modules/user.js';
import { handleRecap, initWS, initWSCommands } from './modules/whitestar.js';
import { initmisc } from './modules/misc.js';
import { config } from 'dotenv';
import { handleLog, handleReject, handleRun, handleSolo, handleVerify, handleVoid, initevent, initeventCommands } from './modules/event.js';

let SFA_Guild: Guild;
let selfMember: GuildMember;
let BaseCommandGroup = new commandGroup("", [], [], [], "", false)

const bot = new Client({
    intents:
        [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages]
});

config()

const token = process.env.BOT_TOKEN

bot.login(token);

const rest = new REST().setToken(process.env.BOT_TOKEN);

bot.once('ready', () => {
    console.log("online!")

    initDB()
    BaseCommandGroup = initRS(BaseCommandGroup)
    BaseCommandGroup = initWS(BaseCommandGroup)
    BaseCommandGroup = initUser(BaseCommandGroup)
    BaseCommandGroup = initRole(BaseCommandGroup)
    BaseCommandGroup = initstats(BaseCommandGroup)
    BaseCommandGroup = initHelp(BaseCommandGroup)
    BaseCommandGroup = initmisc(BaseCommandGroup)
    BaseCommandGroup = initevent(BaseCommandGroup)
    const commands = [initeventCommands(), initWSCommands()].flat()
    refreshCommands(commands)
    initAFKTimeoutCheckLoop()
    bot.guilds.fetch(SFAcorp)
        .then(guild => {
            SFA_Guild = guild
            SFA_Guild.members.fetch()
                .then(members => {
                    selfMember = members.get(getSelfUser().id)
                })
        })
})

bot.on('guildMemberRemove', async (member) => {
    let farewellembed = new EmbedBuilder()
        .setColor(member.displayColor)
        .setTitle(`${member.user.tag} left the server.`)
        .addFields({ name: '\u200b', value: `ID: ${member.id}\nUsername: ${member.user.username}\nJoined at: <t:${Math.floor(member.joinedTimestamp / 1000)}:f>\nIn other words: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\nNew Server Members: ${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL({ size: 4096 }))
    sendEmbed(logchannel, "", farewellembed)
});
bot.on('guildMemberAdd', async member => {
    let greetembed = new EmbedBuilder()
        .setColor(member.displayColor)
        .setTitle(`${member.user.tag} joined the server.`)
        .addFields({ name: '\u200b', value: `ID: ${member.id}\nUsername: ${member.user.username}\nJoined at: <t:${Math.floor(member.joinedTimestamp / 1000)}:f>\nIn other words: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\nNew Server Members: ${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL({ size: 4096 }))
    sendEmbed(logchannel, "", greetembed)
    member.roles.add(representtiverole)
    member.setNickname(`[] ${member.user.username}`)
    sendMessage(welcomechannel, `Welcome, <@${member.id}>! A <@&${GreeterRole}> will be with you soon. Please answer the below questions:\n⇒ What Corporation are you from, if any?\n⇒ Are you on the lookout for a position in the SFA?\n-~-~-~-~-~-\nPlease visit the <#883082845663428668> channel and read the rules. To unlock RS-queues read through <#795153050104496139> and click the reaction.\n\nWelcome To the Spacefleet Alliance Server!\n<:SpFl:529449288145829918> <:Ender:704541877365375028> <:WC:752321386902716438> <:BMC:926246325287284838> <:DS:579658975692324864> <:SOL:883405937673662484> <:YAL:780171132417605682> <:C55:780171448517263370>`)
});
bot.on("messageUpdate", async (oldmessage, newmessage) => {
    if (oldmessage.content !== newmessage.content) {
        try {
            if (oldmessage.content === "") oldmessage.content = "This message had no content"
            if (newmessage.content === "") newmessage.content = "This message has no content"
            let auditlogEmbed = new EmbedBuilder()
                .setColor(Colors.Yellow)
                .setAuthor({ iconURL: newmessage.member.displayAvatarURL(), name: newmessage.member.displayName })
                .setTitle("ℹ️ Message Updated")
                .addFields(
                    { name: "Message ID", value: oldmessage.id, inline: true },
                    { name: "Channel", value: `<#${oldmessage.channel.id}>`, inline: true },
                    { name: "Old Message", value: oldmessage.content.substring(0, 1024) },
                    { name: "New Message", value: newmessage.content.substring(0, 1024) },
                )
            sendEmbed(auditlogchannel, "", auditlogEmbed)
        }
        catch (error) {
            sendMessage(logchannel, `Yo <@397435995429011467> your code is shit check this out (update):\n${oldmessage.id}\n<#${oldmessage.channel.id}>\n${newmessage.member.displayAvatarURL()}\n${newmessage.member.displayName}`)
            console.log(error);
        }
    }
})
bot.on("messageDelete", async (oldmessage) => {
    try {
        if (oldmessage.content === "") oldmessage.content = "This message had no content"
        let auditlogEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setAuthor({ iconURL: oldmessage.member.displayAvatarURL(), name: oldmessage.member.displayName })
            .setTitle("ℹ️ Message Deleted")
            .addFields(
                { name: "Message ID", value: oldmessage.id, inline: true },
                { name: "Channel", value: `<#${oldmessage.channel.id}>`, inline: true },
                { name: "Content", value: oldmessage.content.substring(0, 1024) },
            )
        sendEmbed(auditlogchannel, "", auditlogEmbed)
    }
    catch (error) {
        sendMessage(logchannel, `Yo <@397435995429011467> your code is shit check this out (delete):\n${oldmessage.id}\n<#${oldmessage.channel.id}>\n${oldmessage.content.substring(0, 1024)}\n${oldmessage.member.displayAvatarURL()}\n${oldmessage.member.displayName}`)
        console.log(error);
    }
})
bot.on("messageCreate", (message) => {
    const d = Date.now()
    if (message.author === bot.user || !message.inGuild()) {
        return;
    }
    const split = /"(.*?)"/g;
    let result: string[] = []
    let current: RegExpExecArray
    while (current = split.exec(message.content)) {
        result.push(current.pop());
    }

    let rawargs = message.content.split('"')
    let allargs: string[] = []
    for (let i = 0; i < rawargs.length; i++) {
        if ((i % 2 === 0 || i === rawargs.length - 1)) {
            if (rawargs[i].trim().split(' ')[0] !== "") {
                allargs = allargs.concat(rawargs[i].trim().split(' '))
            }
        }
        else {
            allargs.push(result[(i - 1) / 2])
        }
    }

    if (allargs.length > 0) {
        autoresponsecheck(message, d, [...allargs])

        let commandName = allargs[0]
        let args = allargs.slice(1).map(arg => { return { lowercase: arg.toLowerCase(), original: arg } })

        if (commandName.startsWith(prefix)) {
            BaseCommandGroup.call(commandName.slice(prefix.length), args, message, d, "", true)
        }
    }
})
bot.on("interactionCreate", async interaction => {
    if (interaction.isButton()) {
        const member = await fetchMember(interaction.user.id)
        if (member.roles.cache.some(role => role.id === scorekeeperrole || role.id === adminRole)) {
            const d = Date.now()
            interaction.deferReply({ ephemeral: true }).then(() => {
                if (interaction.customId === 'verify') {
                    handleVerify(interaction)
                }
                else if (interaction.customId === 'reject') {
                    handleReject(interaction)
                }
                else if (interaction.customId === 'void') {
                    handleVoid(interaction)
                }
            })
                .catch(err => {
                    console.log(err)
                    sendMessage(interaction.channel.id, `<@${interaction.user.id}> unfortunately, a critical latency error occured while processing this request. Please click the button again.`)
                })
        }
        else {
            interaction.reply({ content: 'You do not have the necessary permission to use this command', ephemeral: true })
        }
    }
    else if (interaction.isChatInputCommand()) {
        let func: (interaction: ChatInputCommandInteraction) => void
        let eventcommand = false
        let recapcommand = false
        switch (interaction.commandName) {
            case "log":
                func = handleLog
                eventcommand = true
                break
            case "solo":
                func = handleSolo
                eventcommand = true
                break
            case "run":
                func = handleRun
                eventcommand = true
                break
            case "recap":
                func = handleRecap
                recapcommand = true
                break
        }
        if (eventcommand) {
            queryDB("SELECT event FROM config")
                .then(event => {
                    if (event[0].event !== 0) {
                        if (interaction.channel.id !== rseventlogchannel) interaction.reply({ content: `This is not the correct channel for this command. Use <#${rseventlogchannel}>`, ephemeral: true })
                        else {
                            interaction.deferReply().then(() => {
                                func(interaction)
                            }).catch(err => {
                                sendMessage(interaction.channel.id, `<@${interaction.user.id}> unfortunately, a critical latency error occured while processing this request. Please resubmit the entire command.`)
                            })
                        }
                    }
                    else if (interaction.isRepliable()) {
                        interaction.reply({ content: 'There is no ongoing RS Event at the moment, all related commands have been disabled.', ephemeral: true })
                    }
                })
        }
        else if (recapcommand) {
            if (interaction.channel.id !== recapchannel) interaction.reply({ content: `This is not the correct channel for this command. Use <#${recapchannel}>`, ephemeral: true })
            else func(interaction)
        }
    }

})

async function sendMessage(channelID: string, content: string) {
    return new Promise<Message>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.send(content).then(sent => {
                    resolve(sent)
                })
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function sendDM(userID: string, content: string) {
    return new Promise<Message>((resolve, reject) => {
        bot.users.fetch(userID).then(user => {
            user.send(content).then(sent => {
                resolve(sent)
            })
        })
            .catch(err => {
                reject(err)
            })
    })
}

async function sendEmbed(channelID: string, content: string, embed: EmbedBuilder) {
    return new Promise<Message>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.send({ content: content, embeds: [embed] }).then(sent => {
                    resolve(sent)
                })
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function updateEmbed(channelID: string, messageID: string, content: string, embed: EmbedBuilder) {
    return new Promise<Message>((resolve, reject) => {
        fetchMessage(messageID, channelID)
            .then(message => {
                message.edit({ content: content, embeds: [embed] }).then(edited => {
                    resolve(edited)
                })

            })
            .catch(err => {
                reject(err)
            })
    })
}

async function fetchMessage(messageID: string, channelID: string) {
    return new Promise<Message>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.messages.fetch(messageID)
                    .then(message => {
                        resolve(message)
                    })
                    .catch(err => {
                        reject(err)
                    })
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function fetchMember(memberID: string) {
    return new Promise<GuildMember>((resolve, reject) => {
        SFA_Guild.members.fetch(memberID)
            .then(member => {
                if (member != undefined && member != null) {
                    resolve(member)
                }
                else {
                    reject()
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function fetchChannel(channelID: string) {
    return new Promise<GuildTextBasedChannel>((resolve, reject) => {
        SFA_Guild.channels.fetch(channelID, {})
            .then(channel => {
                if (!channel.isVoiceBased() && channel.isTextBased() && !channel.isThreadOnly()) {
                    resolve(channel)
                }
                else {
                    reject()
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function fetchRole(roleID: string) {
    return new Promise<Role | null>((resolve, reject) => {
        SFA_Guild.roles.fetch(roleID)
            .then(role => {
                resolve(role)
            })
            .catch(err => {
                reject(err)
            })
    })
}

function getSelfUser() {
    return bot.user
}

function getSelfMember() {
    return selfMember
}

async function getmember(channelID: string, membername: string, callerID: string, suppressErrorMessages: boolean) {
    //gets the member with the name membername, will ask for user input if multiple members were found. returns null if no members were found
    return new Promise<GuildMember>(async (resolve) => {
        getallMembers()
            .then(allmembers => {
                let members: GuildMember[] = []
                let membernames: string[] = []
                allmembers.forEach(thismember => {
                    if (thismember.displayName.toLowerCase().includes(membername) || thismember.user.username.toLowerCase().includes(membername) || membername.includes(thismember.id)) {
                        members.push(thismember)
                        membernames.push(`${thismember.displayName} / ${thismember.user.tag}`)
                    }
                })
                if (members.length === 0) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are no members with the name or ID of ${membername}`)
                    }
                    resolve(null)
                }
                else if (members.length >= 10) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are too many members with the name of ${membername}. Narrow down your search specifications or search by the member's ID or Mention.`)
                    }
                    resolve(null)
                }
                else if (members.length === 1) {
                    resolve(members[0])
                }
                else {
                    playerInputChoice(channelID, callerID, membernames, "Membername / Username", "Choose a Member", Colors.Yellow, `Multiple members with their names containing ${membername} were found! Please select one of them.`)
                        .then(index => {
                            resolve(members[index])
                        })
                        .catch(() => {
                            resolve(null)
                        })
                }
            })
    })
}

async function getallMembers() {
    return new Promise<Collection<string, GuildMember>>(async (resolve) => {
        SFA_Guild.members.fetch()
            .then(allmembers => {
                resolve(allmembers)
            })
    })
}

async function getrole(channelID: string, rolename: string, callerID: string, suppressErrorMessages: boolean) {
    //gets the role with the name rolename, will ask for user input if multiple roles were found. returns null if no roles were found
    return new Promise<Role>(async (resolve) => {
        SFA_Guild.roles.fetch()
            .then(allroles => {
                let roles: Role[] = []
                let rolenames: string[] = []
                allroles.forEach(thisrole => {
                    if (thisrole.name.toLowerCase().includes(rolename) || rolename.includes(thisrole.id)) {
                        roles.push(thisrole)
                        rolenames.push(thisrole.name)
                    }
                })
                if (roles.length === 0) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are no roles with the name or ID of ${rolename}`)
                    }
                    resolve(null)
                }
                else if (roles.length >= 10) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are too many roles with the name of ${rolename}. Narrow down your search specifications or search by the role's ID or Mention.`)
                    }
                    resolve(null)
                }
                else if (roles.length === 1) {
                    resolve(roles[0])
                }
                else {
                    playerInputChoice(channelID, callerID, rolenames, "Rolename", "Choose a Role", Colors.Yellow, `Multiple roles with their names containing ${rolename} were found! Please select one of them.`)
                        .then(index => {
                            resolve(roles[index])
                        })
                        .catch(() => {
                            resolve(null)
                        })
                }
            })
    })
}

async function playerInputChoice(channelID: string, userID: string, choiceList: string[], optionHeader: string, title: string, color: ColorResolvable, description: string) {
    return new Promise<number>((resolve, reject) => {
        if (choiceList.length <= 9) {
            const coiceReactions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"]
            fetchChannel(channelID)
                .then(channel => {
                    let choiceEmbed = new EmbedBuilder()
                        .setColor(color)
                        .setTitle(title)
                        .setFooter({ text: 'This query will auto-cancel in 1 minute' })
                    let content = `${description}\n\n\`\`\`#  ${optionHeader}\n-------------------------`
                    for (let i = 0; i < choiceList.length; i++) {
                        content += `\n${i + 1}  ${choiceList[i]}`
                    }
                    content += `\`\`\``
                    choiceEmbed.setDescription(content)
                    channel.send({ embeds: [choiceEmbed] }).then(sent => {
                        for (let i = 0; i < choiceList.length; i++) {
                            sent.react(coiceReactions[i])

                        }
                        sent.react("❌")
                            .then(() => {
                                const filter = (reaction: MessageReaction, user: User) => {
                                    return user.id === userID;
                                };
                                sent.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] }).then(reactions => {
                                    let reaction = reactions.first()
                                    sent.delete()
                                    let accepted = false
                                    for (let i = 0; i < choiceList.length; i++) {
                                        if (reaction.emoji.name === coiceReactions[i]) {
                                            accepted = true
                                            resolve(i)
                                        }
                                    }
                                    if (!accepted) {
                                        channel.send("Selection cancelled")
                                        reject()
                                    }
                                }).catch(() => {
                                    sent.delete()
                                    channel.send("Selection cancelled due to timeout")
                                    reject()
                                })
                            })
                    })
                })
        }
        else {
            reject()
        }
    })
}

async function refreshCommands(commands: SlashCommandOptionsOnlyBuilder[]) {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
        Routes.applicationCommands(bot.user.id),
        { body: commands },
    );
    //@ts-ignore
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}

function getAllCommands() {
    return BaseCommandGroup
}

export {
    sendMessage,
    sendEmbed,
    fetchMessage,
    fetchChannel,
    fetchMember,
    fetchRole,
    playerInputChoice,
    sendDM,
    getSelfUser,
    getrole,
    getmember,
    updateEmbed,
    getSelfMember,
    getAllCommands,
    getallMembers
}