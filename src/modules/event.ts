import { APIEmbedField, ActionRowBuilder, Attachment, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Colors, EmbedBuilder, GuildMember, Message, MessageActionRowComponentBuilder, SlashCommandBuilder, User } from "discord.js"
import { maxRSsize, rseventlogchannel, rsmasterrole, rsroles, runlogchannel, scorecheckchannel, scorekeeperchannel } from "../../config/config.js"
import { getQueueByID, logrun } from "./redstar.js"
import { fetchChannel, fetchMember, fetchRole, sendEmbed, sendMessage } from "../bot.js"
import { getDark, getD } from "./utils.js"
import { queryDB } from "./DB.js"
import { allArguments, command, commandGroup } from "./command.js"
import { hasAdminPerms, hasCoordPerms, hasdefaultPerms } from "./user.js"

const verifybutton = new ButtonBuilder()
    .setCustomId('verify')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
const disabledVerifybutton = new ButtonBuilder()
    .setCustomId('verify')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
    .setDisabled(true)
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
    .addComponents(disabledVerifybutton, rejectbutton, voidbutton);

function initevent(BaseCommandGroup: commandGroup) {
    const list = new command("list", [], [], "Lists all RS runs that haven't been logged yet during a RS Event", listExec, [rseventlogchannel], hasdefaultPerms, true, false)
    const leaderboard = new command("leaderboard", ["scoreboard", "lb", "sb", "score"], [allArguments.rslevelor0Argument, allArguments.eventseasonArgument], "Displays the RS event leaderboard for the specified RS level and optionally of the specified season. ", leaderboardExec, [scorecheckchannel], hasdefaultPerms, true, false)
    const startevent = new command("startevent", [], [], "Starts a new RS event", starteventExec, [scorekeeperchannel], hasAdminPerms, false, true)
    const stopevent = new command("stopevent", [], [], "Stops the ongoing RS event", stopeventExec, [scorekeeperchannel], hasAdminPerms, false, true)
    const rseresult = new command("rseresult", [], [], "Prints out the results of the most recent RS event", rseresultExec, [], hasCoordPerms, true, true)

    BaseCommandGroup.addsubcommand(list)
    BaseCommandGroup.addsubcommand(leaderboard)
    BaseCommandGroup.addsubcommand(startevent)
    BaseCommandGroup.addsubcommand(stopevent)
    BaseCommandGroup.addsubcommand(rseresult)

    return BaseCommandGroup
}

function initeventCommands() {
    const log = new SlashCommandBuilder()
        .setName("log")
        .setDescription("Logs the score of a run from the RS queue")
        .addIntegerOption(option =>
            option.setName("runid")
                .setDescription(`The ID of the Run. Accessible in the RS channel and <#${runlogchannel}>`)
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
                .setDescription("Screenshot of the ingame RS completion message. It must show the name of the corp it was run in")
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
                .setDescription("Screenshot of the ingame RS completion message. It must show the name of the corp it was run in")
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
                .setDescription("Screenshot of the ingame RS completion message. It must show the name of the corp it was run in")
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("player1")
                .setDescription("The first player in the Run")
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("player2")
                .setDescription("The second player in the Run")
        )
        .addUserOption(option =>
            option.setName("player3")
                .setDescription("The third player in the Run")
        )
        .addUserOption(option =>
            option.setName("player4")
                .setDescription("The fourth player in the Run")
        )
        .setDMPermission(false)
    return ([log, solo, run])
}

async function listExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = (await queryDB("SELECT event FROM config"))[0].event
    if (event !== 0) {
        queryDB(`SELECT runID FROM runlog WHERE event = ${event} AND logged = 0`)
            .then(runs => {
                let fields: APIEmbedField[] = []
                let k = 0
                if (runs.length !== 0) {
                    runs.forEach(async run => {
                        const queue = await getQueueByID(run.runID)
                        let content = `Level: ${queue.queue.level + 3}\nPlayers:`
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
    const event = (await queryDB("SELECT event FROM config"))[0].event
    if (event !== 0) {
        let requestedEvent = event
        if (args.length === 2) requestedEvent = parseInt(args[1].lowercase)
        const level = parseInt(args[0].lowercase) - 3
        let levelcheck = `AND maxlevels.maxlevel = ${level} `
        if (level === -3) levelcheck = ""
        queryDB(`SELECT playerinrun.playerID, SUM(runlog.points / p1.playercount) AS points, COUNT(playerinrun.playerID) AS runcount, maxlevels.maxlevel FROM playerinrun JOIN runlog ON playerinrun.runID = runlog.runID JOIN (SELECT runID, COUNT(*) AS playercount FROM playerinrun WHERE isGuest = 0 GROUP BY runID) p1 ON playerinrun.runID = p1.runID JOIN (SELECT playerID, MAX(runlog.level) AS maxlevel FROM playerinrun JOIN runlog ON playerinrun.runID = runlog.runID WHERE playerinrun.isGuest = 0 GROUP BY playerID) maxlevels ON playerinrun.playerID = maxlevels.playerID WHERE playerinrun.isGuest = 0 AND runlog.event = ${requestedEvent} AND runlog.verified = 1 ${levelcheck}GROUP BY playerinrun.playerID ORDER BY points DESC`)
            .then(players => {
                if (players.length === 0) {
                    sendMessage(message.channel.id, `No Data found for RS${level + 3} In Season ${requestedEvent} of the RS Event`)
                }
                else {
                    let contents: string[] = []
                    let content = ""
                    if (level === -3) content = "```    Points  | Avg.  | Runs | lvl | Player"
                    else content = "```    Points  | Avg.  | Runs | Player"
                    let k = 0
                    players.forEach(async player => {
                        const member = await fetchMember(player.playerID)
                        const points = parseFloat(player.points)
                        const averagePoints = ((points) / player.runcount)
                        const averageFormattedPoints = averagePoints.toFixed(0)
                        const formattedPoints = points.toFixed(0)
                        let leveldisplay = ""
                        if (level === -3) leveldisplay = ` ${player.maxlevel + 3}${" ".repeat(3 - (player.maxlevel + 3).toString().length)} |`
                        const toAdd = `\n${k + 1}.${" ".repeat(3 - (k + 1).toString().length)}${formattedPoints}${" ".repeat(8 - formattedPoints.length)}| ${averageFormattedPoints}${" ".repeat(6 - averageFormattedPoints.length)}| ${player.runcount}${" ".repeat(4 - player.runcount.toString().length)} |${leveldisplay} ${member.displayName}`
                        if ((content + toAdd).length > 4090) {
                            contents.push(content += "```")
                            if (level === -3) content = `\`\`\`    Points  | Avg.  | Runs | lvl | Player${toAdd}`
                            else content = `\`\`\`    Points  | Avg.  | Runs | Player${toAdd}`
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
                                    if (level === -3) leaderboardembed.setTitle(`The top runners are:`)
                                    else leaderboardembed.setTitle(`The top runners of RS${level + 3} are:`)
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

async function starteventExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = (await queryDB("SELECT event FROM config"))[0].event
    if (event === 0) {
        const lastevent = (await queryDB("SELECT lastevent FROM config"))[0].lastevent
        queryDB(`UPDATE config SET event = ${lastevent + 1}`)
        sendMessage(message.channel.id, `Successfully started Season ${lastevent + 1} of the Red Star Event. Happy Hunting!`)
    }
    else {
        sendMessage(message.channel.id, "This command is not available during a Red Star Event")
    }
}

async function stopeventExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = (await queryDB("SELECT event FROM config"))[0].event
    if (event !== 0) {
        queryDB(`UPDATE config SET event = 0, lastevent = ${event}`)
        sendMessage(message.channel.id, `Successfully stopped Season ${event} of the Red Star Event. See you next time!`)
    }
    else {
        sendMessage(message.channel.id, "This command is only available during a Red Star Event")
    }
}

async function rseresultExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const event = (await queryDB("SELECT event FROM config"))[0].event
    if (event === 0) {
        const lastevent = (await queryDB("SELECT lastevent FROM config"))[0].lastevent
        queryDB(`WITH validPlayers AS (SELECT p.playerID, MAX(e.level) AS maxLevel, COUNT(DISTINCT p.runID) AS runcount FROM playerinrun p JOIN runlog e ON p.runID = e.runID WHERE p.isGuest = 0 AND e.verified = 1 AND e.event = ${lastevent} GROUP BY p.playerID HAVING COUNT(DISTINCT p.runID) >= 8), playerScores AS (SELECT p.playerID, validPlayers.maxLevel, COUNT(DISTINCT p.runID) AS runcount, SUM(e.points / p1.playercount) AS totalPoints FROM playerinrun p JOIN runlog e ON p.runID = e.runID JOIN (SELECT runID, COUNT(*) AS playercount FROM playerinrun WHERE isGuest = 0 GROUP BY runID) p1 ON p.runID = p1.runID JOIN validPlayers ON p.playerID = validPlayers.playerID WHERE p.isGuest = 0 AND e.level = validPlayers.maxLevel AND e.verified = 1 AND e.event = ${lastevent} GROUP BY p.playerID, validPlayers.maxLevel), rankedPlayers AS (SELECT ps.playerID, ps.maxLevel, ps.runcount, ps.totalPoints, ROW_NUMBER() OVER (PARTITION BY ps.maxLevel ORDER BY ps.totalPoints DESC) AS rank FROM playerScores ps) SELECT playerID, maxLevel AS level, runcount, totalPoints FROM rankedPlayers WHERE rank <= 3 ORDER BY level DESC, rank;`)
            .then(topPlayers => {
                if (topPlayers.length === 0) {
                    sendMessage(message.channel.id, `No Data found for Season ${lastevent} of the RS Event`)
                }
                else {
                    class rseResultHandler {
                        texts: { level: number, content: string, nextRank: number }[]
                        constructor() {
                            this.texts = []
                        }
                        async addPlayer(member: GuildMember, level: number, points: number, runcount: number) {
                            let symbols = ""
                            if (this.texts.some(txt => txt.level === level) || this.texts.length === 0) {
                                const index = this.texts.findIndex(txt => txt.level === level)
                                this.texts[index].content += `\n${this.texts[index].nextRank}. <@${member.id}>: ${points} pts. in ${runcount} runs`
                                symbols = ["💎", "🏅"][this.texts[index].nextRank - 1]
                                this.texts[index].nextRank++
                            }
                            else {
                                let content = `1. <@${member.id}>: ${points} pts. in ${runcount} runs`
                                this.texts.push({ level: level, content: content, nextRank: 2 })
                                //await member.roles.add(rsmasterrole)
                                symbols = "👑"
                            }
                            const newname = `${member.displayName}${symbols}RS${level + 3}${symbols}`
                            sendMessage(message.channel.id, newname)
                            if (newname.length <= 32) {
                                //await member.setNickname(newname)
                            }
                        }
                        sort() {
                            this.texts.sort((a, b) => b.level - a.level)
                        }
                    }

                    let resultHandler = new rseResultHandler()
                    let k = 0
                    topPlayers.forEach(async player => {
                        const member = await fetchMember(player.playerID)
                        const points = parseInt(player.totalPoints)
                        const level = parseInt(player.level)
                        const runcount = parseInt(player.runcount)
                        await resultHandler.addPlayer(member, level, points, runcount)
                        k++
                        if (k === topPlayers.length) {
                            resultHandler.sort()
                            let content = `### RSE ${lastevent} internal player ranking\n`
                            resultHandler.texts.forEach(text => {
                                content += `\n\n**RS${text.level + 3}**\n${text.content}`
                            })
                            sendMessage(message.channel.id, content)
                        }
                    })
                }
            })
    }
    else {
        sendMessage(message.channel.id, "This command is only available after a Red Star Event")
    }
}

function handleLog(interaction: ChatInputCommandInteraction) {
    const runID = interaction.options.getInteger('runid')
    const points = interaction.options.getInteger('points')
    const screenshot = interaction.options.getAttachment('screenshot')

    getQueueByID(runID)
        .then(async queue => {
            if (queue === null) {
                interaction.followUp({ content: 'Invalid runID. Please correct your input', ephemeral: true })
            }
            else if (queue.queue.event !== (await queryDB("SELECT event FROM config"))[0].event) {
                interaction.followUp({ content: 'This RS was not run during this RS Event. Please correct your input', ephemeral: true })
            }
            else if (queue.queue.logged) {
                interaction.followUp({ content: 'This run has already been logged. Please correct your input', ephemeral: true })
            }
            else {
                addScoreToRun(queue.queue.ID, points, screenshot, { level: queue.queue.level, dark: queue.queue.dark })
                interaction.followUp({ content: 'Successfully logged this RS' })
            }
        }).catch(err => { })
}

async function handleSolo(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('level') - 3
    const dark = interaction.options.getString('type') === "dark"
    const points = interaction.options.getInteger('points')
    const screenshot = interaction.options.getAttachment('screenshot')
    if (dark && level < 4) {
        interaction.followUp({ content: 'DRS only supports runs at DRS7+. Please correct your input', ephemeral: true })
    }
    else {
        logrun(Date.now(), { level: level, dark: dark }, [{ playerID: interaction.user.id, type: 0 }], (await queryDB("SELECT event FROM config"))[0].event)
            .then(runID => {
                addScoreToRun(runID.ID, points, screenshot, { level: level, dark: dark })
                interaction.followUp({ content: 'Successfully logged this RS' })
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
        const user = interaction.options.getUser(`player${i}`) ?? null
        if (user !== null && !users.some(u => u.id === user.id)) {
            users.push(user)
        }
    }

    if (dark && (users.length > 3 || level < 4)) {
        interaction.followUp({ content: 'DRS only support up to 3 players at DRS7+. Please correct your input', ephemeral: true })
    }
    else {
        logrun(Date.now(), { level: level, dark: dark }, users.map(user => { return { playerID: user.id, type: 0 } }), (await queryDB("SELECT event FROM config"))[0].event)
            .then(runID => {
                addScoreToRun(runID.ID, points, screenshot, { level: level, dark: dark })
                interaction.followUp({ content: 'Successfully logged this RS' })
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
    interaction.message.edit({ embeds: [verificationEmbed], components: [verifiedrow] })
    interaction.followUp({ content: 'Successfully verified this RS', ephemeral: true })
}

function handleReject(interaction: ButtonInteraction) {
    queryDB(`UPDATE runlog SET verified = 0, logged = 0, points = 0, verificationmessage = NULL WHERE verificationmessage = ${interaction.message.id}`)
    interaction.message.delete()
    interaction.followUp({ content: 'Successfully rejected the score of this RS', ephemeral: true })
}

function handleVoid(interaction: ButtonInteraction) {
    queryDB(`DELETE FROM runlog WHERE verificationmessage = ${interaction.message.id}`)
    interaction.message.delete()
    interaction.followUp({ content: 'Successfully voided this RS', ephemeral: true })
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
                        .setTimestamp(queue.queue.ID)
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