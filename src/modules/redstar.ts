import { queryDB } from "./DB.js"
import { escape } from "mysql2"
import { rschannels, AFKTimeout, prefix, rsroles, runlogchannel, botchannels, maxRSsize, emojis } from "../../config/config.js"
import { Colors, EmbedBuilder, GuildMember, GuildTextBasedChannel, Message } from "discord.js"
import { fetchMember, fetchMessage, fetchRole, getmember, playerInputChoice, sendDM, sendEmbed, sendMessage } from "../bot.js"
import { getPlayerRSNotificationPreference, hasCaptainPerms, hasCoordPerms, hasdefaultPerms } from "./user.js"
import { commandGroup, command, allArguments } from "./command.js"
import { boolToInt, getD, getDark } from "./utils.js"
import { getPlayerModuleData } from "./compendium.js"

let lastRSrolemention: { regular: number, dark?: number }[] = [{ regular: 0 }, { regular: 0 }, { regular: 0 }, { regular: 0 }, { regular: 0, dark: 0 }, { regular: 0, dark: 0 }, { regular: 0, dark: 0 }, { regular: 0, dark: 0 }, { regular: 0, dark: 0 }, { regular: 0 }]

/*
    IMPORTANT: The RSlevel is stored as an int from 0-9, corresponding to rs3-12. This is so that arrays can easily be indexed by the rslevel directly, starting at 0.
*/
function initRS(BaseCommandGroup: commandGroup) {
    const allrschannels = rschannels.flatMap(channels => Object.values(channels))
    const ping = new command("ping", ["pingrs", "pingqueue", "pq", "p", "mention"], [], "Pings @RSX to ask for players to join.", pingExec, allrschannels, hasdefaultPerms, true, true)
    const sub = new command("sub", [], [], "Pings @RSX to ask for a sub for the last started queue.", subExec, allrschannels, hasdefaultPerms, true, true)

    const modgenesis = new command("genesis", ["gen", "g"], [allArguments.modlevelArgument], "Set the level of your genesis module to be displayed in the RS and DRS queue.", modgenesisExec, [], hasdefaultPerms, true, false)
    const modenrich = new command("enrich", ["en", "e"], [allArguments.modlevelArgument], "Set the level of your enrich module to be displayed in the RS and DRS queue.", modenrichExec, [], hasdefaultPerms, true, false)
    const modrse = new command("rse", ["rsle"], [allArguments.modlevelArgument], "Set the level of your RSE module to be displayed in the RS and DRS queue.", modrseExec, [], hasdefaultPerms, true, false)
    const mod = new commandGroup("module", ["mod"], [], [modgenesis, modenrich, modrse], "Command group for managing RS modules.", false)

    const rsruninfo = new command("runinfo", [], [allArguments.runidArgument], "Displays information about the RS run with the specified ID.", rsruninfoExec, [], hasdefaultPerms, true, false)
    const rsnotify = new command("notify", [], [], "Review and update your RS notification settings.", rsnotifyExec, [botchannels, allrschannels].flat(), hasdefaultPerms, true, false)
    //const rsbanadd = new command("add", [], [allArguments.memberArgument, allArguments.rslevelArgument], "Bans a specified member from participation in RS queues of the specified level and higher.", rsbanaddExec, [], hasCoordPerms, false, true)
    //const rsbanremove = new command("remove", ["delete", "alleviate"], [allArguments.memberArgument], "Removes all RS bans from a specified member.", rsbanremoveExec, [], hasCoordPerms, false, true)
    //const rsbanlist = new command("list", ["view", "show"], [], "Lists all active RS bans", rsbanlistExec, [], hasCaptainPerms, true, false)
    //const rsban = new commandGroup("ban", [], [], [rsbanadd, rsbanremove, rsbanlist], "Command group for managing RS bans.", false)

    const redstar = new commandGroup("redstar", ["rs"], [/*rsban*/], [rsruninfo, rsnotify], "Command group for managing RS related commands.", false)

    const in_ = new command("in", ["i", "join"], [], "Join a RS queue.", inExec, [], hasdefaultPerms, true, true)
    const out = new command("out", ["o", "leave"], [], "Leave a RS queue.", outExec, allrschannels, hasdefaultPerms, true, true)
    const start = new command("start", ["s"], [], "Start a queue you are in.", startExec, allrschannels, hasdefaultPerms, true, true)
    const queue = new command("queue", ["q"], [], "Lists the current RS queue.", queueExec, allrschannels, hasdefaultPerms, true, true)
    const guest = new command("guest", ["addguest", "ag", "g"], [], "Adds a guest to your RS queue.", guestExec, allrschannels, hasdefaultPerms, true, true)
    const removeguest = new command("removeguest", ["rg"], [], "Removes a guest from your RS queue.", removeguestExec, allrschannels, hasdefaultPerms, true, true)

    BaseCommandGroup.addsubcommandgroup(redstar)
    BaseCommandGroup.addsubcommandgroup(mod)

    BaseCommandGroup.addsubcommand(in_)
    BaseCommandGroup.addsubcommand(out)
    BaseCommandGroup.addsubcommand(start)
    BaseCommandGroup.addsubcommand(queue)
    BaseCommandGroup.addsubcommand(ping)
    BaseCommandGroup.addsubcommand(sub)
    BaseCommandGroup.addsubcommand(guest)
    BaseCommandGroup.addsubcommand(removeguest)

    return BaseCommandGroup
}

async function rsbanaddExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const member = await getmember(message.channel.id, args[0].lowercase, message.member.id, false)
    if (member !== null) {
        await queryDB(`DELETE FROM rsbannedplayers WHERE playerID = ${member.id}`)
        await queryDB(`INSERT INTO rsbannedplayers(playerID, level) VALUES (${member.id}, ${args[1].lowercase})`)
        sendMessage(message.channel.id, `${member.displayName} has been banned from participation in all red star queues level ${args[1].lowercase} and higher.`)
    }
}
async function rsbanremoveExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const member = await getmember(message.channel.id, args[0].lowercase, message.member.id, false)
    if (member !== null) {
        await queryDB(`DELETE FROM rsbannedplayers WHERE playerID = ${member.id}`)
        sendMessage(message.channel.id, `The rsban on ${member.displayName}, if there was one, has been alleviated.`)
    }
}
async function rsbanlistExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    let content = "Level - Player\n"
    for (let i = 0; i < bannedPlayers.length; i++) {
        const member = await getmember(message.channel.id, bannedPlayers[i].playerID, message.member.id, true)
        if (member !== null) content += `${bannedPlayers[i].level} - ${member.displayName}\n`
        if (i === bannedPlayers.length - 1) {
            let bannedEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Players banned from RS")
                .setDescription(content.slice(0, content.length - 1))
            sendEmbed(message.channel.id, "", bannedEmbed)
        }
    }
}
function pingExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel.level)) {
                pingQueue(rsLevel, d)
            }
            else {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are not currently in the ${getD(rsLevel.dark)}RS${rsLevel.level + 3} queue`)
            }
        })
        .catch(err => { })
}
function subExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const rsLevel = getrslevel(message.channel)
    getLastStartedQueue(rsLevel)
        .then(lastQueue => {
            if (lastQueue.queueUsers.some(user => user.playerID === message.author.id)) {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `<@&${rsroles[rsLevel.level][getDark(rsLevel.dark)]}> <@!${message.member.id}> needs a sub!`)
                lastRSrolemention[rsLevel.level][getDark(rsLevel.dark)] = d
            }
            else {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You cannot call a sub for ${getD(rsLevel.dark)}RS${rsLevel.level + 3} because you weren't in the last queue that started.`)
            }
        })
        .catch(err => { })
}
function rsruninfoExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const ID = parseInt(args[0].lowercase)
    getQueueByID(ID)
        .then(queue => {
            if (queue !== null) {
                displayRSqueue(queue, message.channel.id)
            }
            else {
                sendMessage(message.channel.id, "Invalid ID! You must select a valid RS run ID.")
            }
        })
        .catch(err => { })
}
function modgenesisExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const level = parseInt(args[0].lowercase)
    queryDB(`INSERT INTO rsmod (playerID, module, level) VALUES(${escape(message.member.id)}, 'genesis', ${escape(level)}) ON DUPLICATE KEY UPDATE level = ${escape(level)}`)
    sendMessage(message.channel.id, `Genesis for ${message.member.displayName} successfully set to level ${level}!`)
}
function modenrichExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const level = parseInt(args[0].lowercase)
    queryDB(`INSERT INTO rsmod (playerID, module, level) VALUES(${escape(message.member.id)}, 'enrich', ${escape(level)}) ON DUPLICATE KEY UPDATE level = ${escape(level)}`)
    sendMessage(message.channel.id, `Enrich for ${message.member.displayName} successfully set to level ${level}!`)
}
function modrseExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const level = parseInt(args[0].lowercase)
    queryDB(`INSERT INTO rsmod (playerID, module, level) VALUES(${escape(message.member.id)}, 'rse', ${escape(level)}) ON DUPLICATE KEY UPDATE level = ${escape(level)}`)
    sendMessage(message.channel.id, `RSE for ${message.member.displayName} successfully set to level ${level}!`)
}
function rsnotifyExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    queryDB(`SELECT notificationPreference FROM notificationOptions WHERE userID = ${message.member.id}`)
        .then(optionValue => {
            let currentPreference: number
            let noPref: boolean
            const preferences = ["Ping in the RS channel", "DM only", "Both"]
            if (optionValue.length === 0) {
                noPref = true
                currentPreference = 0
            }
            else {
                noPref = false
                currentPreference = parseInt(optionValue[0].notificationPreference)
            }
            playerInputChoice(message.channel.id, message.member.id, preferences, "Option", "Red Star Notification Settings", Colors.Yellow, `Your current selection is: ${preferences[currentPreference]}`)
                .then(async newPreference => {
                    sendMessage(message.channel.id, `Your setting has been updated to '${preferences[newPreference]}'`)
                    if (noPref) {
                        queryDB(`INSERT INTO notificationOptions(userID, notificationPreference) VALUES (${message.member.id}, ${newPreference})`)
                    }
                    else {
                        queryDB(`UPDATE notificationOptions SET notificationPreference=${newPreference} WHERE userID = ${message.member.id}`)
                    }
                })
                .catch(err => { })
        })
        .catch(err => { })
}
async function inExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const rsLevel = getrslevel(message.channel)
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    if (bannedPlayers.some(bannedplayer => bannedplayer.playerID === message.member.id && bannedplayer.level <= rsLevel.level)) {
        sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are banned from joining RS queues of this level. If you are not sure why, speak to a Coordinator`)
    }
    else {
        isPlayerInQueues(message.author.id)
            .then(queues => {
                if (queues.some(queue => queue.level === rsLevel.level && queue.dark === rsLevel.dark)) {
                    sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are in for ${getD(rsLevel.dark)}RS${rsLevel.level + 3}!`)
                    queryDB(`UPDATE rsqueueuser SET lastseenTimestamp=${d}, AFKwarned=0 WHERE playerID = ${message.member.id} AND level = ${rsLevel.level} AND dark = ${boolToInt(rsLevel.dark)}`)
                }
                else {
                    addToQueue(rsLevel, message.member, false, d)
                }
            })
            .catch(err => { })
    }
}
async function guestExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const rsLevel = getrslevel(message.channel)
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    if (bannedPlayers.some(bannedplayer => bannedplayer.playerID === message.member.id && bannedplayer.level <= rsLevel.level)) {
        sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are banned from adding guests to RS queues of this level. If you are not sure why, speak to a Coordinator`)
    }
    else {
        addToQueue(rsLevel, message.member, true, d)
    }
}
function outExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel.level && queue.dark === rsLevel.dark)) {
                removeFromQueue(rsLevel, message.member, false, { level: 0, dark: null })
            }
            else {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are not currently in the ${getD(rsLevel.dark)}RS${rsLevel.level + 3} queue`)
            }
        })
        .catch(err => { })
}
function removeguestExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const rsLevel = getrslevel(message.channel)
    queryDB(`SELECT level, type FROM rsqueueuser WHERE playerID = ${message.member.id} AND type = 1 AND level = ${rsLevel.level} AND dark = ${boolToInt(rsLevel.dark)}`)
        .then(queues => {
            if (queues.length !== 0) {
                removeFromQueue(rsLevel, message.member, true, { level: 0, dark: null })
            }
            else {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `Your guest is not currently in the ${getD(rsLevel.dark)}RS${rsLevel.level + 3} queue`)
            }
        })
        .catch(err => { })
}
function startExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel.level && queue.dark === rsLevel.dark)) {
                StartQueue(rsLevel, d)
            }
            else {
                sendMessage(rschannels[rsLevel.level][getDark(rsLevel.dark)], `You are not currently in the ${getD(rsLevel.dark)}RS${rsLevel.level + 3} queue`)
            }
        })
        .catch(err => { })
}
async function queueExec(args: { lowercase: string, original: string }[], message: Message<true>, d: number) {
    const rsLevel = getrslevel(message.channel)
    sendRSEmbed(rsLevel, false)
}

function getrslevel(channel: GuildTextBasedChannel) {
    const index = rschannels.findIndex(thisID => channel.id === thisID.regular)
    if (index !== -1) {
        return { level: index, dark: false }
    }
    else {
        const dindex = rschannels.findIndex(thisID => channel.id === thisID.dark)
        if (dindex !== -1) {
            return { level: dindex, dark: true }
        }
        else {
            console.error(`Couldn't find level of Channel "${channel.name}" with ID ${channel.id}. This function should not have been triggered by a message in this channel, please check your configuration`)
        }
    }
}

function pingQueue(level: { level: number, dark: boolean }, d: number) {
    getCurrentQueue(level)
        .then(currentQueue => {
            let content = ""
            if (lastRSrolemention[level.level][getDark(level.dark)] < (d - 300000)) {
                content += `<@&${rsroles[level.level][getDark(level.dark)]}>`
                lastRSrolemention[level.level][getDark(level.dark)] = d
            }
            else {
                content += `${getD(level.dark)}RS${level.level + 3}`
            }
            content += ` ${currentQueue.length}/${maxRSsize[getDark(level.dark)]} anyone?`
            content = content.slice(0, content.length - 1)
            sendMessage(rschannels[level.level][getDark(level.dark)], content)
        })
}

async function displayRSqueue(queue: { "queue": { "shortID": number, "ID": number, "level": number, "dark": boolean }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }, channelID: string) {
    let content = `Started at: <t:${Math.floor(queue.queue.ID / 1000)}:f>\n`
    let logembed = new EmbedBuilder
    logembed.setTitle(`${getD(queue.queue.dark)}RS${queue.queue.level + 3} (${queue.queueUsers.length}/${maxRSsize[getDark(queue.queue.dark)]})`)
    const color = (await fetchRole(rsroles[queue.queue.level][getDark(queue.queue.dark)])).color
    logembed.setColor(color)
    let k = 0
    queue.queueUsers.forEach(async (playerInQueue) => {
        let member = await fetchMember(playerInQueue.playerID)
        if (!playerInQueue.isGuest) {
            content += `\n${member.displayName}`
        }
        else {
            content += `\n${member.displayName}'s guest`
        }
        k++
        if (k === queue.queueUsers.length) {
            logembed.setDescription(content)
                .setFooter({ text: `Run ID: ${queue.queue.shortID}` })
                .setTimestamp()
            sendEmbed(channelID, "", logembed).catch(err => { })
        }
    })
}

async function addToQueue(level: { level: number, dark: boolean }, player: GuildMember, guest: boolean, d: number) {
    return new Promise<boolean>((resolve, reject) => {
        let type = 0
        let name = player.displayName
        if (guest) {
            type = 1
            name = `${player.displayName}'s guest`
        }
        getCurrentQueue(level)
            .then(currentQueue => {
                if (currentQueue.length < maxRSsize[getDark(level.dark)]) {
                    queryDB(`INSERT INTO rsqueueuser(level, dark, playerID, lastseenTimestamp, joinedTimestamp, AFKwarned, type) VALUES (${level.level}, ${boolToInt(level.dark)}, ${player.id}, ${d}, ${d}, 0, ${type})`)
                        .then(() => {
                            if (currentQueue.length >= maxRSsize[getDark(level.dark)] - 1) {
                                sendMessage(rschannels[level.level][getDark(level.dark)], `${getD(level.dark)}RS${level.level + 3} (${maxRSsize[getDark(level.dark)]}/${maxRSsize[getDark(level.dark)]}) ${name} joined!`)
                                StartQueue(level, d)
                            }
                            else {
                                if (lastRSrolemention[level.level][getDark(level.dark)] < (d - 300000)) {
                                    sendMessage(rschannels[level.level][getDark(level.dark)], `<@&${rsroles[level.level][getDark(level.dark)]}> (${currentQueue.length + 1}/${maxRSsize[getDark(level.dark)]}) ${name} joined!`)
                                    lastRSrolemention[level.level][getDark(level.dark)] = d
                                }
                                else {
                                    sendMessage(rschannels[level.level][getDark(level.dark)], `${getD(level.dark)}RS${level.level + 3} (${currentQueue.length + 1}/${maxRSsize[getDark(level.dark)]}) ${name} joined!`)
                                }
                                sendRSEmbed(level, false)
                            }
                            resolve(true)
                        })
                        .catch(err => {
                            reject(err)
                        })
                }
                else {
                    sendMessage(rschannels[level.level][getDark(level.dark)], `A queue is currently starting, ${name} couldn't be added!`)
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function removeFromQueue(level: { level: number, dark: boolean }, player: GuildMember, guest: boolean, reason: { level: number, dark: boolean }) {
    return new Promise<boolean>(async (resolve) => {
        let type = " AND type = 0"
        let name = player.displayName
        if (guest) {
            type = " AND type = 1"
            name = `${player.displayName}'s guest(s)`
        }
        queryDB(`DELETE FROM rsqueueuser WHERE playerID = ${player.id} AND level = ${level.level}${type} AND dark = ${boolToInt(level.dark)}`)
            .then(() => {
                getCurrentQueue(level).then(async currentQueue => {
                    let content = ""
                    if (reason.level === 0) {
                        content = `${getD(level.dark)}RS${level.level + 3} (${currentQueue.length}/${maxRSsize[getDark(level.dark)]}) ${name} left`
                    }
                    else {
                        content = `${getD(level.dark)}RS${level.level + 3} (${currentQueue.length}/${maxRSsize[getDark(level.dark)]}) ${name} left because they were in a starting ${getD(reason.dark)}RS${reason.level + 3} queue`
                    }
                    sendMessage(rschannels[level.level][getDark(level.dark)], content)
                    sendRSEmbed(level, false)
                        .then(() => {
                            resolve(true)
                        })
                })
            })
            .catch(err => { })
    })
}

async function sendRSEmbed(level: { level: number, dark: boolean }, starting: boolean) {
    return new Promise<boolean>(async (resolve, reject) => {
        const currentQueue = await getCurrentQueue(level)
        const rsqueuemessage = await getRSQueueMessage(level)
        await queryDB(`UPDATE rsqueuemessage SET messageID=NULL WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`).catch(err => { })
        if (rsqueuemessage != null && rsqueuemessage !== undefined) {
            rsqueuemessage.delete()
        }
        if (currentQueue.length === 0) {
            let RSembed = new EmbedBuilder
            const color = (await fetchRole(rsroles[level.level][getDark(level.dark)])).color
            RSembed.setColor(color)
            RSembed.setTitle(`Empty ${getD(level.dark)}RS${level.level + 3} (0/${maxRSsize[getDark(level.dark)]})`)
            RSembed.setDescription(`To join the queue type \`${prefix}in\``)
            sendEmbed(rschannels[level.level][getDark(level.dark)], "", RSembed)
                .then(sent => {
                    queryDB(`UPDATE rsqueuemessage SET messageID=${sent.id} WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`).catch(err => { })
                    resolve(true)
                })
                .catch(err => {
                    reject(err)
                })
            resolve(false)
        }
        else {
            let RSembed = new EmbedBuilder
            const color = (await fetchRole(rsroles[level.level][getDark(level.dark)])).color
            RSembed.setColor(color)
            let header = "Users in"
            if (starting) {
                header = "Starting"
                RSembed.setFooter({ text: `ID: ${((await getLastStartedQueue(level)).queue.shortID)}` })
            }
            RSembed.setTitle(`${header} ${getD(level.dark)}RS${level.level + 3} (${currentQueue.length}/${maxRSsize[getDark(level.dark)]})`)
            let k = 0
            let content = `To join the queue type \`${prefix}in\`\n\n`
            currentQueue.forEach(async playerInQueue => {
                const playerID = playerInQueue.playerID

                let suffix: string
                let player: GuildMember
                try {
                    suffix = await getPlayerRSSufffix(playerID, level, starting)
                }
                catch (err) {
                    suffix = ""
                }
                player = await fetchMember(playerID)
                if (playerInQueue.type === 1) {
                    content += `${player.displayName}'s guest joined <t:${Math.floor(playerInQueue.joinedTimestamp / 1000)}:R>\n`
                }
                else {
                    content += `${player.displayName} ${suffix} joined <t:${Math.floor(playerInQueue.joinedTimestamp / 1000)}:R>\n`
                }
                k++
                if (k === currentQueue.length) {
                    RSembed.setDescription(content)
                    sendEmbed(rschannels[level.level][getDark(level.dark)], "", RSembed)
                        .then(sent => {
                            if (starting) {
                                queryDB(`UPDATE rsqueuemessage SET messageID=NULL WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`).catch(err => { })
                            }
                            else {
                                queryDB(`UPDATE rsqueuemessage SET messageID=${sent.id} WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`).catch(err => { })
                            }
                            resolve(true)
                        })
                        .catch(err => {
                            reject(err)
                        })
                }
            })
        }
    })
}

async function getPlayerRSSufffix(playerID: string, level: { level: number, dark: boolean }, starting: boolean) {
    //returns the suffix of the player (mods, runs)
    return new Promise<string>((resolve, reject) => {
        let suffix = ""
        //Check for RS mods
        getPlayerModuleSuffix(playerID, level.dark)
            .then(modulesuffix => {
                suffix += modulesuffix
                //Check for Runcount
                queryDB(`SELECT COUNT(playerID) AS runs FROM playerinrun, runlog WHERE playerinrun.playerID = ${playerID} AND playerinrun.isGuest = 0 AND runlog.level = ${level.level} AND runlog.dark = ${boolToInt(level.dark)} AND playerinrun.runID = runlog.runID`)
                    .then(async runcount => {
                        suffix += ` [${runcount[0].runs} runs]`
                        //Check for other queues
                        if (!starting) {
                            let queues = await isPlayerInQueues(playerID)
                            if (queues.length > 1) {
                                suffix += ` (also in`
                                for (let index = 0; index < queues.length; index++) {
                                    if (queues[index].level !== level.level || queues[index].dark !== level.dark) {
                                        suffix += ` ${getD(queues[index].dark)}RS ${queues[index].level + 3},`
                                    }
                                }
                                suffix = suffix.slice(0, suffix.length - 1) + ")"
                            }
                        }
                        resolve(suffix)
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

function getPlayerModuleSuffix(playerID: string, dark: boolean) {
    return new Promise<string>((resolve, reject) => {
        getPlayerRSModules(playerID)
            .then(rsmods => {
                resolve(`${emojis.genesis}${rsmods.genesis} ${emojis.enrich}${rsmods.enrich} ${emojis.rse}${rsmods.rse}`)
            })
            .catch(err => {
                reject(err)
            })
    })
}

function getPlayerRSModules(playerID: string) {
    return new Promise<{ genesis: number, enrich: number, rse: number }>((resolve, reject) => {
        getPlayerModuleData(playerID)
            .then(modlevels => {
                if (modlevels === null) {
                    queryDB(`SELECT module, level FROM rsmod WHERE playerID = ${playerID}`)
                        .then(modules => {
                            if (modules.length === 0) resolve({ genesis: 0, enrich: 0, rse: 0 })
                            else {
                                resolve({ genesis: (modules.find(thismod => thismod.module === "genesis") ?? { level: 0 }).level, enrich: (modules.find(thismod => thismod.module === "enrich") ?? { level: 0 }).level, rse: (modules.find(thismod => thismod.module === "rse") ?? { level: 0 }).level })
                            }
                        })
                }
                else resolve({ genesis: (modlevels.genesis ?? { level: 0 }).level, enrich: (modlevels.enrich ?? { level: 0 }).level, rse: (modlevels.rsextender ?? { level: 0 }).level })
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function StartQueue(level: { level: number, dark: boolean }, d: number) {
    CheckPlayerInStartingQueue(level).then(() => {
        getCurrentQueue(level).then(async currentQueue => {
            logrun(d, level, currentQueue.map(val => { return { playerID: val.playerID, type: val.type } }), (await queryDB("SELECT event FROM config"))[0].event).then(() => {
                sendRSEmbed(level, true).then(() => {
                    sendQueueStartMessage(level).then(() => {
                        queryDB(`DELETE FROM rsqueueuser WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`).then(() => {
                            sendRSEmbed(level, false).catch(err => { })
                        }).catch(err => { })
                    }).catch(err => { })
                }).catch(err => { })
            }).catch(err => { })
        }).catch(err => { })
    }).catch(err => { })
}

async function logrun(d: number, level: { level: number; dark: boolean }, currentQueue: { playerID: string, type: number }[], event: number) {
    return new Promise<{ ID: number, shortID: number }>(async (resolve, reject) => {
        //@ts-ignore
        const ID: number = (await queryDB(`INSERT INTO runlog(runID, level, dark, event) VALUES (${d}, ${level.level}, ${boolToInt(level.dark)}, ${event})`)).insertId
        const runID: { ID: number; shortID: number } = (await queryDB(`SELECT runID as ID, shortID FROM runlog WHERE shortID = ${ID}`)).map(a => { return { ID: a.ID, shortID: a.shortID } })[0]
        let content = `Started at: <t:${Math.floor(d / 1000)}:f>\n`
        let k = 0
        currentQueue.forEach(async (playerInQueue) => {
            const playerID = playerInQueue.playerID
            let member = await fetchMember(playerID)
            queryDB(`INSERT INTO playerinrun(runID, playerID, isGuest) VALUES (${runID.ID}, ${playerID}, ${playerInQueue.type})`).catch(err => { })
            let guest = ""
            if (playerInQueue.type === 1) guest = "'s guest"
            content += `\n${member.displayName}${guest}`
            k++
            if (k === currentQueue.length) {
                let logembed = new EmbedBuilder
                const color = (await fetchRole(rsroles[level.level][getDark(level.dark)])).color
                logembed.setTitle(`${getD(level.dark)}RS${level.level + 3} (${currentQueue.length}/${maxRSsize[getDark(level.dark)]})`)
                    .setDescription(content)
                    .setFooter({ text: `Run ID: ${runID.shortID}` }).setTimestamp()
                    .setColor(color)
                sendEmbed(runlogchannel, "", logembed)
                resolve(runID)
            }
        })
    })
}

async function sendQueueStartMessage(level: { level: number, dark: boolean }) {
    return new Promise<boolean>((resolve, reject) => {
        getCurrentQueue(level)
            .then(CurrentQueue => {
                let k = 0
                let content = `${getD(level.dark)}RS${level.level + 3} queue ready to run! (${CurrentQueue.length}/${maxRSsize[getDark(level.dark)]})\n`
                let usersToDM: string[] = []
                try {
                    CurrentQueue.forEach(async playerInQueue => {
                        const playerID = playerInQueue.playerID.toString()
                        let notificationpreference = await getPlayerRSNotificationPreference(playerID)
                        let player = await fetchMember(playerID)
                        let guest = ""
                        if (playerInQueue.type === 1) guest = "'s guest"
                        if (notificationpreference === 1 || notificationpreference === 2) {
                            usersToDM.push(playerID)
                        }
                        if (notificationpreference === 0 || notificationpreference === 2) {
                            content += `<@${player.id}>${guest}, `
                        }
                        else {
                            content += `${player.displayName}${guest}, `
                        }
                        k++
                        if (k === CurrentQueue.length) {
                            content = `${content.slice(0, content.length - 2)}\n\nSpacefleet or Ender usually have the best bonus percentage for your arts. They can be found at #3 and #6 on the RS event Leaderboard. Please leave the corp after your run!`
                            sendMessage(rschannels[level.level][getDark(level.dark)], content).catch(err => { })
                            usersToDM.forEach(userID => {
                                sendDM(userID, content).catch(err => { })
                            })
                            resolve(true)
                        }
                    })
                }
                catch { reject() }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function CheckPlayerInStartingQueue(level: { level: number, dark: boolean }) {
    return new Promise<boolean>((resolve, reject) => {
        getCurrentQueue(level)
            .then(async currentQueue => {
                let k = 0
                for (let index = 0; index < currentQueue.length; index++) {
                    if (currentQueue[index].type === 0) {
                        let queues = await isPlayerInQueues(currentQueue[index].playerID)
                        for (let i = 0; i < queues.length; i++) {
                            if (queues[i].level !== level.level || queues[i].dark !== level.dark) {
                                const playerID = currentQueue[index].playerID.toString()
                                await removeFromQueue(queues[i], await fetchMember(playerID), false, level)
                            }
                        }
                    }
                    k++
                    if (k === currentQueue.length) {
                        resolve(true)
                    }
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function getRSQueueMessage(level: { level: number, dark: boolean }) {
    return new Promise<Message>((resolve, reject) => {
        queryDB(`SELECT messageID FROM rsqueuemessage WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`)
            .then(queuemessageID => {
                if (queuemessageID[0] === undefined || queuemessageID[0].messageID === null) {
                    resolve(null)
                }
                else {
                    fetchMessage(queuemessageID[0].messageID, rschannels[level.level][getDark(level.dark)])
                        .then(queuemessage => {
                            resolve(queuemessage)
                        })
                        .catch(err => {
                            reject(err)
                        })
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function isPlayerInQueues(playerID: string) {
    //returns the levels of all queues the player is in
    return new Promise<{ level: number, dark: boolean }[]>((resolve, reject) => {
        queryDB(`SELECT level, dark FROM rsqueueuser WHERE playerID = ${playerID} AND type = 0`)
            .then(queues => {
                resolve(queues.map(a => ({ level: a.level, dark: a.dark === 1 })))
            })
            .catch(err => {
                reject(err)
            })
    })

}

async function getCurrentQueue(level: { level: number, dark: boolean }) {
    //gets the content of the currently active RS queue for a specified level
    return new Promise<{ "level": number, "playerID": string, "lastseenTimestamp": number, "joinedTimestamp": number, "type": number, "AFKwarned": boolean, }[]>((resolve, reject) => {
        queryDB(`SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned FROM rsqueueuser WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)}`)
            .then(currentQueue => {
                resolve(currentQueue.map(a => ({ "level": a.level, "playerID": a.playerID, "lastseenTimestamp": a.lastseenTimestamp, "joinedTimestamp": a.joinedTimestamp, "type": a.type, AFKwarned: (a.AFKwarned > 0) })))
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function getLastStartedQueue(level: { level: number, dark: boolean }) {
    /** 
    gets the last started RS queue for a specified level
    */
    return new Promise<{ "queue": { "shortID": number, "ID": number }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }>((resolve, reject) => {
        queryDB(`SELECT shortID, runID FROM runlog WHERE level = ${level.level} AND dark = ${boolToInt(level.dark)} ORDER BY shortID DESC LIMIT 1`)
            .then(lastQueue => {
                queryDB(`SELECT playerID, isGuest FROM playerinrun WHERE runID = ${lastQueue[0].runID}`)
                    .then(lastQueueUsers => {
                        resolve({ "queue": { "shortID": lastQueue[0].shortID, "ID": lastQueue[0].runID }, "queueUsers": lastQueueUsers.map(a => ({ "playerID": a.playerID, "isGuest": a.isGuest })) })
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

async function getQueueByID(id: number) {
    //gets the queue with the specified ID.
    return new Promise<{ "queue": { "shortID": number, "ID": number, "level": number, "dark": boolean, "event": number, "logged": boolean, "verified": boolean, "points": number }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }>((resolve, reject) => {
        queryDB(`SELECT shortID, runID, level, dark, event, logged, verified, points FROM runlog WHERE shortID = ${id} OR runID = ${id}`)
            .then(queue => {
                if (queue.length === 1) {
                    queryDB(`SELECT playerID, isGuest FROM playerinrun WHERE runID = ${queue[0].runID}`)
                        .then(queueUsers => {
                            resolve({ "queue": { "shortID": queue[0].shortID, "ID": parseInt(queue[0].runID), "level": parseInt(queue[0].level), "dark": queue[0].dark === 1, "event": queue[0].event, "logged": queue[0].logged === 1, "verified": queue[0].verified === 1, "points": queue[0].points }, "queueUsers": queueUsers.map(a => ({ "playerID": a.playerID, "isGuest": a.isGuest })) })
                        })
                        .catch(err => {
                            reject(err)
                        })
                }
                else {
                    resolve(null)
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function initAFKTimeoutCheckLoop() {
    //warn players if they exceed 30 mins in the queue, kick them if they didn't reset their status 5 mins later. The Timeout can be changed in config.ts
    setInterval(() => {
        const d = Date.now()
        queryDB(`SELECT playerID, level, dark FROM rsqueueuser WHERE lastseenTimestamp < ${d - AFKTimeout} AND lastseenTimestamp >= ${d - AFKTimeout - 300000} AND AFKwarned = 0`)
            .then(timedoutPlayers => {
                for (let j = 0; j < timedoutPlayers.length; j++) {
                    queryDB(`UPDATE rsqueueuser SET AFKwarned=1 WHERE playerID = ${timedoutPlayers[j].playerID} AND level = ${timedoutPlayers[j].level} AND dark = ${timedoutPlayers[j].dark}`)
                        .then(() => {
                            sendMessage(rschannels[timedoutPlayers[j].level][getDark(timedoutPlayers[j].dark)], `<@${timedoutPlayers[j].playerID}>, are you still in for ${getD(timedoutPlayers[j].dark)}RS${timedoutPlayers[j].level + 3}? Type \`${prefix}in\` to reset your queue status or you will be removed from the queue in 5 minutes.`)
                        })
                        .catch(err => { })
                }
            })
            .catch(err => { })
        queryDB(`SELECT playerID, level, dark FROM rsqueueuser WHERE lastseenTimestamp < ${d - AFKTimeout - 300000}`)
            .then(playersToKick => {
                let levelsToUpdate: { level: number, dark: boolean }[] = []
                for (let j = 0; j < playersToKick.length; j++) {
                    queryDB(`DELETE FROM rsqueueuser WHERE playerID = ${playersToKick[j].playerID} AND level = ${playersToKick[j].level} AND dark = ${playersToKick[j].dark}`)
                        .then(() => {
                            getCurrentQueue({ level: playersToKick[j].level, dark: playersToKick[j].dark }) //this is to get the length of the queue
                                .then(currentQueue => {
                                    sendMessage(rschannels[playersToKick[j].level][getDark(playersToKick[j].dark)], `${getD(playersToKick[j].dark)}RS${playersToKick[j].level + 3} (${currentQueue.length}/${maxRSsize[getDark(playersToKick[j].dark)]}) <@${playersToKick[j].playerID}> left the queue because they were AFK for too long!`)
                                    if (!levelsToUpdate.some(level => level.level === playersToKick[j].level && level.dark === playersToKick[j].dark)) {
                                        levelsToUpdate.push({ level: playersToKick[j].level, dark: playersToKick[j].dark === 1 })
                                    }
                                    if (j === playersToKick.length - 1) {
                                        for (let i = 0; i < levelsToUpdate.length; i++) {
                                            sendRSEmbed(levelsToUpdate[i], false)
                                        }
                                    }
                                })
                                .catch(err => { })
                        })
                        .catch(err => { })
                }
            })
            .catch(err => { })
    }, 10000);
}

export {
    initAFKTimeoutCheckLoop,
    initRS,
    logrun,
    getQueueByID
}
