import { APIEmbedField, ActionRowBuilder, Attachment, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Colors, EmbedBuilder, Message, MessageActionRowComponentBuilder, SlashCommandBuilder, User } from "discord.js"
import { maxRSsize, rseventlogchannel, rsroles, runlogchannel, scorecheckchannel, scorekeeperchannel } from "../../config/config.js"
import { getQueueByID, logrun } from "./redstar.js"
import { fetchChannel, fetchMember, fetchRole, sendEmbed, sendMessage } from "../bot.js"
import { getDark, getD } from "./utils.js"
import { queryDB } from "./DB.js"
import { allArguments, command, commandGroup } from "./command.js"
import { hasdefaultPerms } from "./user.js"

const verifybutton = new ButtonBuilder()
    .setCustomId('verify')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
const rejectbutton = new ButtonBuilder()
    .setCustomId('reject')
    .setLabel('Reject')
    .setStyle(ButtonStyle.Secondary)
const voidbutton = new ButtonBuilder()
    .setCustomId('void')
    .setLabel('Void')
    .setStyle(ButtonStyle.Danger)
const loggedrow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(verifybutton, rejectbutton, voidbutton);
const verifiedrow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(verifybutton.setDisabled(true), rejectbutton, voidbutton);

function initevent(BaseCommandGroup: commandGroup) {
    const list = new command("list", [], [], "Lists all RS runs that haven't been logged yet during a RS Event", listExec, [rseventlogchannel], hasdefaultPerms, true, false)
    const leaderboard = new command("leaderboard", ["scoreboard", "lb", "sb", "score"], [allArguments.rslevelArgument, allArguments.eventseasonArgument], "Displays the RS event leaderboard for the specified RS level and optionally of the specified season. ", leaderboardExec, [scorecheckchannel], hasdefaultPerms, true, false)

    BaseCommandGroup.addsubcommand(list)
    BaseCommandGroup.addsubcommand(leaderboard)

    return BaseCommandGroup
}

function initeventCommands() {
    const log = new SlashCommandBuilder()
        .setName("log")
        .setDescription("Logs the score of a run from the RS queue")
        .addIntegerOption(option =>
            option.setName("runID")
                .setDescription(`The ID of the Run. Accessible in the RS channel, <#${runlogchannel}> or in your DMs if they are enabled`)
                .setRequired(true)
                .setMinValue(0)
        )
        .addIntegerOption(option =>
            option.setName("points")
                .setDescription(`The total points achieved in this run. They are shown ingame on the RS scan message`)
                .setRequired(true)
                .setMinValue(0)
        )
        .addAttachmentOption(option =>
            option.setName("screenshot")
                .setDescription("Attach the screenshot of the ingame RS completion message here. It must show the name of the corp it was run in")
                .setRequired(true)
        )
        .setDMPermission(false)
    const solo = new SlashCommandBuilder()
        .setName("solo")
        .setDescription("Logs the score of a solo run that wasn't recorded in the RS queue")
        .addIntegerOption(option =>
            option.setName("level")
                .setDescription(`The level of the RS`)
                .setRequired(true)
                .setMinValue(3)
                .setMaxValue(11)
        )
        .addStringOption(option =>
            option.setName("type")
                .setDescription(`The type of the RS`)
                .setRequired(true)
                .addChoices(
                    { name: 'Regular RS', value: "regular" },
                    { name: 'DRS', value: "dark" }
                )
        )
        .addIntegerOption(option =>
            option.setName("points")
                .setDescription(`The total points achieved in this run. They are shown ingame on the RS scan message`)
                .setRequired(true)
                .setMinValue(0)
        )
        .addAttachmentOption(option =>
            option.setName("screenshot")
                .setDescription("Attach the screenshot of the ingame RS completion message here. It must show the name of the corp it was run in")
                .setRequired(true)
        )
        .setDMPermission(false)
    const run = new SlashCommandBuilder()
        .setName("run")
        .setDescription("Logs the score of a multiplayer run that wasn't recorded in the RS queue")
        .addIntegerOption(option =>
            option.setName("level")
                .setDescription(`The level of the RS`)
                .setRequired(true)
                .setMinValue(3)
                .setMaxValue(11)
        )
        .addStringOption(option =>
            option.setName("type")
                .setDescription(`The type of the RS`)
                .setRequired(true)
                .addChoices(
                    { name: 'Regular RS', value: "regular" },
                    { name: 'DRS', value: "dark" }
                )
        )
        .addIntegerOption(option =>
            option.setName("points")
                .setDescription(`The total points achieved in this run. They are shown ingame on the RS scan message`)
                .setRequired(true)
                .setMinValue(0)
        )
        .addAttachmentOption(option =>
            option.setName("screenshot")
                .setDescription("Attach the screenshot of the ingame RS completion message here. It must show the name of the corp it was run in")
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("Player 1")
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("Player 2")
        )
        .addUserOption(option =>
            option.setName("Player 3")
        )
        .addUserOption(option =>
            option.setName("Player 4")
        )
        .setDMPermission(false)
    return ([log, solo, run])
}

async function listExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = await queryDB("SELECT event FROM config")[0].event
    if (event !== 0) {
        queryDB(`SELECT runID FROM runlog WHERE event = ${event} AND logged = 0`)
            .then(runs => {
                let fields: APIEmbedField[] = []
                let k = 0
                if (runs.length !== 0) {
                    runs.forEach(async run => {
                        const queue = await getQueueByID(run.runID)
                        let content = `Level: ${queue.queue.level}\nPlayers:`
                        let j = 0
                        queue.queueUsers.forEach(async user => {
                            const member = await fetchMember(user.playerID)
                            content += ` ${member.displayName},`
                            j++
                            if (j === queue.queueUsers.length) {
                                fields.push({ name: `ID: ${queue.queue.shortID}`, value: content.slice(0, -1) })
                                k++
                                if (k === runs.length) {
                                    let listembed = new EmbedBuilder()
                                        .setTitle("The runs that are not yet logged are:")
                                        .addFields(fields)
                                        .setTimestamp(d)
                                        .setColor(Colors.Yellow)
                                    sendEmbed(message.channel.id, "", listembed)
                                }
                            }
                        })
                    })
                }
                else {
                    sendMessage(message.channel.id, "No runs found that weren't already logged!")
                }
            }).catch(err => { })
    }
    else {
        sendMessage(message.channel.id, "This command is only available during a Red Star Event")
    }
}

async function leaderboardExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = await queryDB("SELECT event FROM config")[0].event
    if (event !== 0) {
        let requestedEvent = event
        if (args.length === 2) requestedEvent = parseInt(args[1].lowercase)
        const level = parseInt(args[0].lowercase)
        queryDB(`SELECT playerinrun.playerID, SUM(runlog.points / p1.playercount) AS points FROM playerinrun JOIN runlog ON playerinrun.runID = runlog.runID JOIN (SELECT runID, COUNT(*) AS playercount FROM playerinrun WHERE isGuest = 0 GROUP BY runID) p1 ON playerinrun.runID = p1.runID WHERE playerinrun.isGuest = 0 AND runlog.event = ${requestedEvent} AND runlog.verified = 1 AND runlog.level = ${level} GROUP BY playerinrun.playerID ORDER BY points DESC`)
            .then(players => {
                if (players.length === 0) {
                    sendMessage(message.channel.id, `No Data found for RS${level} In Season ${requestedEvent} of the RS Event`)
                }
                else {
                    let contents: string[] = []
                    let content = "```   Points  | Player"
                    let k = 0
                    players.forEach(async player => {
                        const member = await fetchMember(player.playerID)
                        const toAdd = `\n${k}.${" ".repeat(3 - k.toString().length)}${player.points}${" ".repeat(8 - player.points.toString().length)}| ${member.displayName}`
                        if ((content + toAdd).length > 4090) {
                            contents.push(content += "```")
                            content = `\`\`\`    Points  | Player${toAdd}`
                        }
                        else {
                            content += toAdd
                        }
                        k++
                        if (k === players.length) {
                            contents.push(content += "```")
                            for (let i = 0; i < contents.length; i++) {
                                let leaderboardembed = new EmbedBuilder()
                                if (i === 0) {
                                    leaderboardembed.setTitle(`The top runners of RS${level} are:`)
                                }
                                else {
                                    leaderboardembed.setTitle(`Continued:`)
                                }
                                leaderboardembed.setDescription(contents[i])
                                    .setColor(Colors.Green)
                                    .setTimestamp(d)
                                sendEmbed(message.channel.id, "", leaderboardembed)
                            }
                        }
                    })
                }
            }).catch(err => { })
    }
    else {
        sendMessage(message.channel.id, "This command is only available during a Red Star Event")
    }
}

function handleLog(interaction: ChatInputCommandInteraction) {
    const runID = interaction.options.getInteger('runID')
    const points = interaction.options.getInteger('points')
    const screenshot = interaction.options.getAttachment('screenshot')

    getQueueByID(runID)
        .then(async queue => {
            if (queue === null) {
                interaction.reply({ content: 'Invalid runID. Please correct your input', ephemeral: true })
            }
            else if (queue.queue.event !== await queryDB("SELECT event FROM config")[0].event) {
                interaction.reply({ content: 'This RS was not run during this RS Event. Please correct your input', ephemeral: true })
            }
            else if (queue.queue.logged) {
                interaction.reply({ content: 'This run has already been logged. Please correct your input', ephemeral: true })
            }
            else {
                addScoreToRun(runID, points, screenshot, { level: queue.queue.level, dark: queue.queue.dark })
                interaction.reply({ content: 'Successfully logged this RS' })
            }
        }).catch(err => { })
}

async function handleSolo(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('level') - 3
    const dark = interaction.options.getString('type') === "dark"
    const points = interaction.options.getInteger('points')
    const screenshot = interaction.options.getAttachment('screenshot')
    if (dark && level < 4) {
        interaction.reply({ content: 'DRS only supports runs at DRS7+. Please correct your input', ephemeral: true })
    }
    else {
        logrun(Date.now(), { level: level, dark: dark }, [{ playerID: interaction.user.id, type: 0 }], await queryDB("SELECT event FROM config")[0].event)
            .then(runID => {
                addScoreToRun(runID.ID, points, screenshot, { level: level, dark: dark })
                interaction.reply({ content: 'Successfully logged this RS' })
            }).catch(err => { })
    }
}

async function handleRun(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('level') - 3
    const dark = interaction.options.getString('type') === "dark"
    const points = interaction.options.getInteger('points')
    const screenshot = interaction.options.getAttachment('screenshot')
    let users: User[] = []
    for (let i = 1; i <= 4; i++) {
        const user = interaction.options.getUser(`Player ${i}`) ?? null
        if (user !== null && !users.some(u => u.id === user.id)) {
            users.push(user)
        }
    }

    if (dark && (users.length > 3 || level < 4)) {
        interaction.reply({ content: 'DRS only support up to 3 players at DRS7+. Please correct your input', ephemeral: true })
    }
    else {
        logrun(Date.now(), { level: level, dark: dark }, users.map(user => { return { playerID: user.id, type: 0 } }), await queryDB("SELECT event FROM config")[0].event)
            .then(runID => {
                addScoreToRun(runID.ID, points, screenshot, { level: level, dark: dark })
                interaction.reply({ content: 'Successfully logged this RS' })
            }).catch(err => { })
    }
}

async function handleVerify(interaction: ButtonInteraction) {
    queryDB(`UPDATE runlog SET verified = 1 WHERE verificationmessage = ${interaction.message.id}`)
    const oldembed = interaction.message.embeds[0]
    let verificationEmbed = new EmbedBuilder()
        .setTitle(`✅ Verified ${oldembed.title}`)
        .setDescription(oldembed.description)
        .setTimestamp(parseInt(oldembed.timestamp))
        .setColor(oldembed.color)
    interaction.message.edit({ embeds: [verificationEmbed], components: [verifiedrow], files: [] })
    interaction.reply({ content: 'Successfully verified this RS', ephemeral: true })
}

function handleReject(interaction: ButtonInteraction) {
    queryDB(`UPDATE runlog SET verified = 0, logged = 0, points = 0, verificationmessage = NULL WHERE verificationmessage = ${interaction.message.id}`)
    interaction.message.delete()
    interaction.reply({ content: 'Successfully rejected the score of this RS', ephemeral: true })
}

function handleVoid(interaction: ButtonInteraction) {
    queryDB(`DELETE FROM runlog WHERE verificationmessage = ${interaction.message.id}`)
    interaction.message.delete()
    interaction.reply({ content: 'Successfully voided this RS', ephemeral: true })
}

function addScoreToRun(runID: number, points: number, screenshot: Attachment, level: { level: number; dark: boolean }) {
    getQueueByID(runID)
        .then(async queue => {
            queryDB(`UPDATE runlog SET logged = 1, points = ${points} WHERE runID = ${runID}`)
            let content = `Points: **${points}**\nID: *${queue.queue.shortID}*\nPlayers:`
            let k = 0
            queue.queueUsers.forEach(async user => {
                const player = await fetchMember(user.playerID)
                content += `\n\t${player.displayName}`
                k++
                if (k === queue.queueUsers.length) {
                    const color = (await fetchRole(rsroles[level.level][getDark(level.dark)])).color
                    let verificationEmbed = new EmbedBuilder()
                        .setTitle(`${getD(level.dark)}RS${level.level + 3} (${queue.queueUsers.length}/${maxRSsize[getDark(level.dark)]})`)
                        .setDescription(content)
                        .setTimestamp(Math.floor(queue.queue.ID / 1000))
                        .setColor(color)
                    const channel = await fetchChannel(scorekeeperchannel)
                    channel.send({ embeds: [verificationEmbed], components: [loggedrow], files: [screenshot] })
                        .then(sent => {
                            queryDB(`UPDATE runlog SET verificationmessage = ${sent.id} WHERE runID = ${runID}`)
                        })
                }
            })
        }).catch(err => { })
}

export {
    initeventCommands,
    handleLog,
    handleSolo,
    handleRun,
    handleVerify,
    handleReject,
    handleVoid,
    initevent
}