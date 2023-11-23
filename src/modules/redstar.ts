import { queryDB } from "./DB.js"
import { RowDataPacket } from "mysql2"
import { rschannels, AFKTimeout, prefix, rsroles, runlogchannel, botchannels, rslevels } from "../../config/config.js"
import { Channel, Colors, EmbedBuilder, GuildMember, Message } from "discord.js"
import { fetchMember, fetchMessage, fetchRole, getmember, playerInputChoice, sendDM, sendEmbed, sendMessage } from "../bot.js"
import { getPlayerRSNotificationPreference, hasCaptainPerms, hasCoordPerms, hasdefaultPerms } from "./user.js"
import { commandGroup, command, allArguments } from "./command.js"

let lastRSrolemention: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]

/*
    IMPORTANT: The RSlevel is stored as an int from 0-8, corresponding to rs3-11. This is so that arrays can easily be indexed by the rslevel directly, starting at 0.
*/
function initRS(BaseCommandGroup: commandGroup) {
    const ping = new command("ping", ["pingrs", "pingqueue", "pq", "p", "mention"], [], "Pings @RSX to ask for players to join.", pingExec, [rschannels], hasdefaultPerms, true, true)
    const sub = new command("sub", [], [], "Pings @RSX to ask for a sub for the last started queue.", subExec, [rschannels], hasdefaultPerms, true, true)

    const modon = new command("on", ["add"], [allArguments.rsmodArgument], `Adds the specified RS module to the ones displayed at the end of your name in in the RS queue.`, modonExec, [botchannels, rschannels], hasdefaultPerms, true, false)
    const modoff = new command("off", ["remove"], [allArguments.rsmodArgument], `Removes the specified RS module from the ones displayed at the end of your name in the RS queue.`, modoffExec, [botchannels, rschannels], hasdefaultPerms, true, false)
    const modview = new command("view", [], [], "Lists the RS mods you have active currently.", modviewExec, [botchannels, rschannels], hasdefaultPerms, true, false)
    const modlist = new command("list", ["listall"], [], "Lists all RS modules.", modlistExec, [botchannels, rschannels], hasdefaultPerms, true, false)
    const mod = new commandGroup("module", ["mod"], [], [modon, modoff, modview, modlist], "Command group for managing RS modules.", false)

    const rsruninfo = new command("runinfo", [], [allArguments.runidArgument], "Displays information about the RS run with the specified ID.", rsruninfoExec, [], hasdefaultPerms, true, false)
    const rsnotify = new command("notify", [], [], "Review and update your RS notification settings.", rsnotifyExec, [botchannels, rschannels], hasdefaultPerms, true, false)
    const rsbanadd = new command("add", [], [allArguments.memberArgument, allArguments.rslevelArgument], "Bans a specified member from participation in RS queues of the specified level and higher.", rsbanaddExec, [], hasCoordPerms, false, true)
    const rsbanremove = new command("remove", ["delete", "alleviate"], [allArguments.memberArgument], "Removes all RS bans from a specified member.", rsbanremoveExec, [], hasCoordPerms, false, true)
    const rsbanlist = new command("list", ["view", "show"], [], "Lists all active RS bans", rsbanlistExec, [], hasCaptainPerms, true, false)
    const rsban = new commandGroup("ban", [], [], [rsbanadd, rsbanremove, rsbanlist], "Command group for managing RS bans.", false)

    const redstar = new commandGroup("redstar", ["rs"], [rsban], [rsruninfo, rsnotify], "Command group for managing RS related commands.", false)

    const in_ = new command("in", ["i", "join"], [], "Join a RS queue.", inExec, [rschannels], hasdefaultPerms, true, true)
    const out = new command("out", ["o", "leave"], [], "Leave a RS queue.", outExec, [rschannels], hasdefaultPerms, true, true)
    const start = new command("start", ["s"], [], "Start a queue you are in.", startExec, [rschannels], hasdefaultPerms, true, true)
    const queue = new command("queue", ["q"], [], "Lists the current RS queue.", queueExec, [rschannels], hasdefaultPerms, true, true)
    const guest = new command("guest", ["addguest", "ag", "g"], [], "Adds a guest to your RS queue.", guestExec, [rschannels], hasdefaultPerms, true, true)
    const removeguest = new command("removeguest", ["rg"], [], "Removes a guest from your RS queue.", removeguestExec, [rschannels], hasdefaultPerms, true, true)

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

async function rsbanaddExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        await queryDB(`DELETE FROM rsbannedplayers WHERE playerID = ${member.id}`)
        await queryDB(`INSERT INTO rsbannedplayers(playerID, level) VALUES (${member.id}, ${args[1]})`)
        sendMessage(message.channel.id, `${member.displayName} has been banned from participation in all red star queues level ${args[1]} and higher.`)
    }
}
async function rsbanremoveExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        await queryDB(`DELETE FROM rsbannedplayers WHERE playerID = ${member.id}`)
        sendMessage(message.channel.id, `The rsban on ${member.displayName}, if there was one, has been alleviated.`)
    }
}
async function rsbanlistExec(args: string[], message: Message, d: number) {
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    let content = "Level - Player"
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
function pingExec(args: string[], message: Message, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel)) {
                pingQueue(rsLevel, d)
            }
            else {
                sendMessage(rschannels[rsLevel], `You are not currently in the RS${rsLevel + 3} queue`)
            }
        })
        .catch(err => { })
}
function subExec(args: string[], message: Message, d: number) {
    const rsLevel = getrslevel(message.channel)
    getLastStartedQueue(rsLevel)
        .then(lastQueue => {
            if (lastQueue.queueUsers.some(user => user.playerID === message.author.id)) {
                sendMessage(rschannels[rsLevel], `<@&${rsroles[rsLevel]}> <@!${message.member.id}> needs a sub!`)
                lastRSrolemention[rsLevel] = d
            }
            else {
                sendMessage(rschannels[rsLevel], `You cannot call a sub for RS${rsLevel + 3} because you weren't in the last queue that started.`)
            }
        })
        .catch(err => { })
}
function rsruninfoExec(args: string[], message: Message, d: number) {
    const ID = parseInt(args[0])
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
function modonExec(args: string[], message: Message, d: number) {
    getRSModules()
        .then(allmods => {
            if (allmods.some(thismod => thismod.name.toLowerCase() === args[0])) {
                getPlayerRSModules(message.member.id)
                    .then(async rsmods => {
                        if (rsmods.some(thismod => thismod.name.toLowerCase() === args[0])) {
                            sendMessage(message.channel.id, "You already have this module installed!")
                        }
                        else {
                            let mod = allmods.find(thismod => thismod.name.toLowerCase() === args[0])
                            queryDB(`INSERT INTO rsmodequip(modID, userID) VALUES (${mod.ID}, ${message.member.id})`)
                            sendMessage(message.channel.id, `${mod.name} enabled for ${message.member.displayName}`)
                        }
                    })
                    .catch(err => { })
            }
            else {
                sendMessage(message.channel.id, "This is not a valid module!")
            }
        })
        .catch(err => { })
}
function modoffExec(args: string[], message: Message, d: number) {
    getRSModules()
        .then(allmods => {
            if (allmods.some(thismod => thismod.name.toLowerCase() === args[0])) {
                getPlayerRSModules(message.member.id)
                    .then(rsmods => {
                        if (rsmods.some(thismod => thismod.name.toLowerCase() === args[0])) {
                            let mod = rsmods.find(thismod => thismod.name.toLowerCase() === args[0])
                            queryDB(`DELETE FROM rsmodequip WHERE userID = ${message.member.id} AND modID = ${mod.ID}`)
                            sendMessage(message.channel.id, `${mod.name} disabled for ${message.member.displayName}`)
                        }
                        else {
                            sendMessage(message.channel.id, "You don't have this module installed!")
                        }
                    })
                    .catch(err => { })
            }
            else {
                sendMessage(message.channel.id, "This is not a valid module!")
            }
        })
        .catch(err => { })
}
function modviewExec(args: string[], message: Message, d: number) {
    getPlayerRSModules(message.member.id)
        .then(rsmods => {
            let list = `${message.member.displayName} - `
            rsmods.forEach(rsmod => {
                if (rsmod.type === 0) {
                    list += `:${rsmod.emojiname}:`
                }
                else {
                    list += `<:${rsmod.emojiname}:${rsmod.emojiID}>`
                }
            })
            sendMessage(message.channel.id, list)
        })
        .catch(err => { })
}
function modlistExec(args: string[], message: Message, d: number) {
    getRSModules()
        .then(rsmods => {
            let list = "`Module name| I |You should have:\n------------------------------"
            rsmods.forEach(rsmod => {
                list += `\n${rsmod.name}${" ".repeat(11 - rsmod.name.length)}|`
                if (rsmod.type === 0) {
                    list += `\`:${rsmod.emojiname}:\`|`
                }
                else {
                    list += `\`<:${rsmod.emojiname}:${rsmod.emojiID}>\`|`
                }
                list += rsmod.description
            })
            list += "`"
            sendMessage(message.channel.id, list)
        })
        .catch(err => { })
}
function rsnotifyExec(args: string[], message: Message, d: number) {
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
async function inExec(args: string[], message: Message, d: number) {
    const rsLevel = getrslevel(message.channel)
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    if (bannedPlayers.some(bannedplayer => bannedplayer.playerID === message.member.id && bannedplayer.level <= rsLevel)) {
        sendMessage(rschannels[rsLevel], `You are banned from joining RS queues of this level. If you are not sure why, speak to a Coordinator`)
    }
    else {
        isPlayerInQueues(message.author.id)
            .then(queues => {
                if (queues.some(queue => queue.level === rsLevel)) {
                    sendMessage(rschannels[rsLevel], `You are in for RS${rsLevel + 3}!`)
                    queryDB(`UPDATE rsqueueuser SET lastseenTimestamp=${d}, AFKwarned=0 WHERE playerID = ${message.member.id} AND level = ${rsLevel}`)
                }
                else {
                    addToQueue(rsLevel, message.member, false, d)
                }
            })
            .catch(err => { })
    }
}
async function guestExec(args: string[], message: Message, d: number) {
    const rsLevel = getrslevel(message.channel)
    const bannedPlayers = await queryDB(`SELECT playerID, level FROM rsbannedplayers`)
    if (bannedPlayers.some(bannedplayer => bannedplayer.playerID === message.member.id && bannedplayer.level <= rsLevel)) {
        sendMessage(rschannels[rsLevel], `You are banned from adding guests to RS queues of this level. If you are not sure why, speak to a Coordinator`)
    }
    else {
        addToQueue(rsLevel, message.member, true, d)
    }
}
function outExec(args: string[], message: Message, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel)) {
                removeFromQueue(rsLevel, message.member, false, 0)
            }
            else {
                sendMessage(rschannels[rsLevel], `You are not currently in the RS${rsLevel + 3} queue`)
            }
        })
        .catch(err => { })
}
function removeguestExec(args: string[], message: Message, d: number) {
    queryDB(`SELECT level, type FROM rsqueueuser WHERE playerID = ${message.member.id} AND type = 1`)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.length !== null) {
                removeFromQueue(rsLevel, message.member, true, 0)
            }
            else {
                sendMessage(rschannels[rsLevel], `Your guest is not currently in the RS${rsLevel + 3} queue`)
            }
        })
        .catch(err => { })
}
function startExec(args: string[], message: Message, d: number) {
    isPlayerInQueues(message.author.id)
        .then(queues => {
            const rsLevel = getrslevel(message.channel)
            if (queues.some(queue => queue.level === rsLevel)) {
                StartQueue(rsLevel, d)
            }
            else {
                sendMessage(rschannels[rsLevel], `You are not currently in the RS${rsLevel + 3} queue`)
            }
        })
        .catch(err => { })
}
async function queueExec(args: string[], message: Message, d: number) {
    const rsLevel = getrslevel(message.channel)
    sendRSEmbed(rsLevel, false)
}

function getrslevel(channel: Channel) {
    return rschannels.findIndex(thisID => channel.id === thisID)
}

function pingQueue(level: number, d: number) {
    getCurrentQueue(level)
        .then(currentQueue => {
            let content = ""
            if (lastRSrolemention[level] < (d - 300000)) {
                content += `<@&${rsroles[level]}>`
                lastRSrolemention[level] = d
            }
            else {
                content += `RS${level + 3}`
            }
            content += ` ${currentQueue.length}/4 anyone?`
            content = content.slice(0, content.length - 1)
            sendMessage(rschannels[level], content)
        })
}

async function displayRSqueue(queue: { "queue": { "shortID": number, "ID": number, "level": number }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }, channelID: string) {
    let content = `Started at: <t:${Math.floor(queue.queue.ID / 1000)}:f>\n`
    let logembed = new EmbedBuilder
    logembed.setTitle(`RS${queue.queue.level + 3} (${queue.queueUsers.length}/4)`)
    const color = (await fetchRole(rsroles[queue.queue.level])).color
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

async function addToQueue(level: number, player: GuildMember, guest: boolean, d: number) {
    return new Promise<boolean>((resolve, reject) => {
        let type = 0
        let name = player.displayName
        if (guest) {
            type = 1
            name = `${player.displayName}'s guest`
        }
        getCurrentQueue(level)
            .then(currentQueue => {
                if (currentQueue.length < 4) {
                    queryDB(`INSERT INTO rsqueueuser(level, playerID, lastseenTimestamp, joinedTimestamp, AFKwarned, type) VALUES (${level}, ${player.id}, ${d}, ${d}, 0, ${type})`)
                        .then(() => {
                            if (currentQueue.length >= 3) {
                                sendMessage(rschannels[level], `RS${level + 3} (4/4) ${name} joined!`)
                                StartQueue(level, d)
                            }
                            else {
                                if (lastRSrolemention[level] < (d - 300000)) {
                                    sendMessage(rschannels[level], `<@&${rsroles[level]}> (${currentQueue.length + 1}/4) ${name} joined!`)
                                    lastRSrolemention[level] = d
                                }
                                else {
                                    sendMessage(rschannels[level], `RS${level + 3} (${currentQueue.length + 1}/4) ${name} joined!`)
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
                    sendMessage(rschannels[level], `A queue is currently starting, ${name} couldn't be added!`)
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function removeFromQueue(level: number, player: GuildMember, guest: boolean, reason: number) {
    return new Promise<boolean>(async (resolve) => {
        let type = " AND type = 0"
        let name = player.displayName
        if (guest) {
            type = " AND type = 1"
            name = `${player.displayName}'s guest(s)`
        }
        queryDB(`DELETE FROM rsqueueuser WHERE playerID = ${player.id} AND level = ${level}${type}`)
            .then(() => {
                getCurrentQueue(level).then(async currentQueue => {
                    let content = ""
                    if (reason === 0) {
                        content = `RS${level + 3} (${currentQueue.length}/4) ${name} left`
                    }
                    else {
                        content = `RS${level + 3} (${currentQueue.length}/4) ${name} left because they were in a starting RS${reason} queue`
                    }
                    sendMessage(rschannels[level], content)
                    sendRSEmbed(level, false)
                        .then(() => {
                            resolve(true)
                        })
                })
            })
            .catch(err => { })
    })
}

async function sendRSEmbed(level: number, starting: boolean) {
    return new Promise<boolean>(async (resolve, reject) => {
        const currentQueue = await getCurrentQueue(level)
        const rsqueuemessage = await getRSQueueMessage(level)
        await queryDB(`UPDATE rsqueuemessage SET messageID=NULL WHERE level = ${level}`).catch(err => { })
        if (rsqueuemessage != null && rsqueuemessage !== undefined) {
            rsqueuemessage.delete()
        }
        if (currentQueue.length === 0) {
            let RSembed = new EmbedBuilder
            const color = (await fetchRole(rsroles[level])).color
            RSembed.setColor(color)
            RSembed.setTitle(`Empty RS${level + 3} (0/4)`)
            RSembed.setDescription(`To join the queue type \`${prefix}in\``)
            sendEmbed(rschannels[level], "", RSembed)
                .then(sent => {
                    queryDB(`UPDATE rsqueuemessage SET messageID=${sent.id} WHERE level = ${level}`).catch(err => { })
                    resolve(true)
                })
                .catch(err => {
                    reject(err)
                })
            resolve(false)
        }
        else {
            let RSembed = new EmbedBuilder
            const color = (await fetchRole(rsroles[level])).color
            RSembed.setColor(color)
            let header = "Users in"
            if (starting) {
                header = "Starting"
            }
            RSembed.setTitle(`${header} RS${level + 3} (${currentQueue.length}/4)`)
            let k = 0
            let content = `To join the queue type \`${prefix}in\`\n\n`
            currentQueue.forEach(async playerInQueue => {
                const playerID = playerInQueue.playerID
                let suffix = await getPlayerRSSufffix(playerID, level, starting)
                let player = await fetchMember(playerID)
                if (playerInQueue.type === 1) {
                    content += `${player.displayName}'s guest joined <t:${Math.floor(playerInQueue.joinedTimestamp / 1000)}:R>\n`
                }
                else {
                    content += `${player.displayName} ${suffix} joined <t:${Math.floor(playerInQueue.joinedTimestamp / 1000)}:R>\n`
                }
                k++
                if (k === currentQueue.length) {
                    RSembed.setDescription(content)
                    sendEmbed(rschannels[level], "", RSembed)
                        .then(sent => {
                            if (starting) {
                                queryDB(`UPDATE rsqueuemessage SET messageID=NULL WHERE level = ${level}`).catch(err => { })
                            }
                            else {
                                queryDB(`UPDATE rsqueuemessage SET messageID=${sent.id} WHERE level = ${level}`).catch(err => { })
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

async function getPlayerRSSufffix(playerID: string, level: number, starting: boolean) {
    //returns the suffix of the player (mods, runs)
    return new Promise<string>((resolve, reject) => {
        let suffix = ""
        //Check for RS mods
        getPlayerRSModules(playerID)
            .then(rsmods => {
                rsmods.forEach(rsmod => {
                    if (rsmod.type === 0) {
                        suffix += `:${rsmod.emojiname}:`
                    }
                    else {
                        suffix += `<:${rsmod.emojiname}:${rsmod.emojiID}>`
                    }
                })
                //Check for Runcount
                queryDB(`SELECT COUNT(playerID) AS runs FROM playerinrun WHERE playerID = ${playerID} AND isGuest = 0 AND level = ${level}`)
                    .then(async runcount => {
                        suffix += ` [${runcount[0].runs} runs]`
                        //Check for other queues
                        if (!starting) {
                            let queues = await isPlayerInQueues(playerID)
                            if (queues.length > 1) {
                                suffix += ` (also in`
                                for (let index = 0; index < queues.length; index++) {
                                    if (queues[index].level !== level) {
                                        suffix += ` RS ${queues[index].level + 3},`
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

function getPlayerRSModules(playerID: string) {
    return new Promise<RowDataPacket[]>((resolve, reject) => {
        queryDB(`SELECT rsmod.ID, rsmod.name, rsmod.emojiname, rsmod.emojiID, rsmod.description, rsmod.type FROM rsmodequip, rsmod WHERE rsmod.ID = rsmodequip.modID AND rsmodequip.userID = ${playerID}`)
            .then(modules => {
                resolve(modules)
            })
            .catch(err => {
                reject(err)
            })
    })
}

function getRSModules() {
    return new Promise<RowDataPacket[]>((resolve, reject) => {
        queryDB("SELECT ID, name, emojiname, emojiID, description, type FROM rsmod")
            .then(list => {
                resolve(list)
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function StartQueue(level: number, d: number) {
    CheckPlayerInStartingQueue(level).then(() => {
        logrun(level, d).then(() => {
            sendRSEmbed(level, true).then(() => {
                sendQueueStartMessage(level).then(() => {
                    queryDB(`DELETE FROM rsqueueuser WHERE level = ${level}`).then(() => {
                        sendRSEmbed(level, false).catch(err => { })
                    }).catch(err => { })
                }).catch(err => { })
            }).catch(err => { })
        }).catch(err => { })
    }).catch(err => { })
}

async function logrun(level: number, d: number) {
    return new Promise<boolean>((resolve, reject) => {
        getCurrentQueue(level)
            .then(async currentQueue => {
                await queryDB(`INSERT INTO runlog(runID, level) VALUES (${d}, ${level})`)
                const runID: RowDataPacket = (await queryDB("SELECT MAX(runID) AS ID, MAX(shortID) AS shortID FROM runlog"))[0]
                let content = `Started at: <t:${Math.floor(d / 1000)}:f>\n`
                let logembed = new EmbedBuilder
                logembed.setTitle(`RS${level + 3} (${currentQueue.length}/4)`)
                let k = 0
                currentQueue.forEach(async playerInQueue => {
                    const playerID = playerInQueue.playerID
                    let member = await fetchMember(playerID)
                    queryDB(`INSERT INTO playerinrun(runID, playerID, level, isGuest) VALUES (${runID.ID}, ${playerID}, ${level}, ${playerInQueue.type})`).catch(err => { })
                    let guest = ""
                    if (playerInQueue.type === 1) guest = "'s guest"
                    content += `\n${member.displayName}${guest}`
                    k++
                    if (k === currentQueue.length) {
                        const color = (await fetchRole(rsroles[level])).color
                        logembed.setDescription(content)
                            .setFooter({ text: `Run ID: ${runID.shortID}` }).setTimestamp()
                            .setColor(color)
                        sendEmbed(runlogchannel, "", logembed)
                        resolve(true)
                    }
                })
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function sendQueueStartMessage(level: number) {
    return new Promise<boolean>((resolve, reject) => {
        getCurrentQueue(level)
            .then(CurrentQueue => {
                let k = 0
                let content = `RS${level + 3} queue ready to run! (${CurrentQueue.length}/4)\n`
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
                            content = `${content.slice(0, content.length - 2)}\n\nSpacefleet usually has the best bonus percentage for your arts. It can be found in the top 10 best corps by influence. Please leave the corp after your run!`
                            sendMessage(rschannels[level], content).catch(err => { })
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

async function CheckPlayerInStartingQueue(level: number) {
    return new Promise<boolean>((resolve, reject) => {
        getCurrentQueue(level)
            .then(async currentQueue => {
                let k = 0
                for (let index = 0; index < currentQueue.length; index++) {
                    if (currentQueue[index].type === 0) {
                        let queues = await queryDB(`SELECT level, type FROM rsqueueuser WHERE playerID = ${currentQueue[index].playerID}`)
                        for (let i = 0; i < queues.length; i++) {
                            if (queues[i].level !== level) {
                                const playerID = currentQueue[index].playerID.toString()
                                await removeFromQueue(queues[i].level, await fetchMember(playerID), queues[i].type, level + 3)
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

async function getRSQueueMessage(level: number) {
    return new Promise<Message>((resolve, reject) => {
        queryDB(`SELECT messageID FROM rsqueuemessage WHERE level = ${level}`)
            .then(queuemessageID => {
                if (queuemessageID[0].messageID === null) {
                    resolve(null)
                }
                else {
                    fetchMessage(queuemessageID[0].messageID, rschannels[level])
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
    return new Promise<{ "level": number }[]>((resolve, reject) => {
        queryDB(`SELECT level, type FROM rsqueueuser WHERE playerID = ${playerID} AND type = 0`)
            .then(queues => {
                resolve(queues.map(a => ({ "level": a.level })))
            })
            .catch(err => {
                reject(err)
            })
    })

}

async function getCurrentQueue(level: number) {
    //gets the content of the currently active RS queue for a specified level
    return new Promise<{ "level": number, "playerID": string, "lastseenTimestamp": number, "joinedTimestamp": number, "type": number, "AFKwarned": boolean, }[]>((resolve, reject) => {
        queryDB(`SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned FROM rsqueueuser WHERE level = ${level}`)
            .then(currentQueue => {
                resolve(currentQueue.map(a => ({ "level": a.level, "playerID": a.playerID, "lastseenTimestamp": a.lastseenTimestamp, "joinedTimestamp": a.joinedTimestamp, "type": a.type, AFKwarned: (a.AFKwarned > 0) })))
            })
            .catch(err => {
                reject(err)
            })
    })
}

async function getLastStartedQueue(level: number) {
    /** 
    gets the last started RS queue for a specified level
    */
    return new Promise<{ "queue": { "shortID": number, "ID": number, "level": number }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }>((resolve, reject) => {
        queryDB(`SELECT shortID, runID, level FROM runlog WHERE level = ${level} ORDER BY shortID DESC LIMIT 1`)
            .then(lastQueue => {
                queryDB(`SELECT playerID, isGuest FROM playerinrun WHERE runID = ${lastQueue[0].runID}`)
                    .then(lastQueueUsers => {
                        resolve({ "queue": { "shortID": lastQueue[0].shortID, "ID": lastQueue[0].runID, "level": lastQueue[0].level }, "queueUsers": lastQueueUsers.map(a => ({ "playerID": a.playerID, "isGuest": a.isGuest })) })
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
    return new Promise<{ "queue": { "shortID": number, "ID": number, "level": number }, "queueUsers": { "playerID": string, "isGuest": boolean }[] }>((resolve, reject) => {
        queryDB(`SELECT shortID, runID, level FROM runlog WHERE shortID = ${id} OR runID = ${id}`)
            .then(queue => {
                if (queue.length === 1) {
                    queryDB(`SELECT playerID, isGuest FROM playerinrun WHERE runID = ${queue[0].runID}`)
                        .then(queueUsers => {
                            resolve({ "queue": { "shortID": queue[0].shortID, "ID": queue[0].runID, "level": queue[0].level }, "queueUsers": queueUsers.map(a => ({ "playerID": a.playerID, "isGuest": a.isGuest })) })
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
        queryDB(`SELECT playerID, level FROM rsqueueuser WHERE lastseenTimestamp < ${d - AFKTimeout} AND lastseenTimestamp >= ${d - AFKTimeout - 300000} AND AFKwarned = 0`)
            .then(timedoutPlayers => {
                for (let j = 0; j < timedoutPlayers.length; j++) {
                    queryDB(`UPDATE rsqueueuser SET AFKwarned=1 WHERE playerID = ${timedoutPlayers[j].playerID} AND level = ${timedoutPlayers[j].level}`)
                        .then(() => {
                            sendMessage(rschannels[timedoutPlayers[j].level], `<@${timedoutPlayers[j].playerID}>, are you still in for RS${timedoutPlayers[j].level + 3}? Type \`${prefix}in\` to reset your queue status or you will be removed from the queue in 5 minutes.`)
                        })
                        .catch(err => { })
                }
            })
            .catch(err => { })
        queryDB(`SELECT playerID, level FROM rsqueueuser WHERE lastseenTimestamp < ${d - AFKTimeout - 300000}`)
            .then(playersToKick => {
                let levelsToUpdate: number[] = []
                for (let j = 0; j < playersToKick.length; j++) {
                    queryDB(`DELETE FROM rsqueueuser WHERE playerID = ${playersToKick[j].playerID} AND level = ${playersToKick[j].level}`)
                        .then(() => {
                            getCurrentQueue(playersToKick[j].level) //this is to get the length of the queue
                                .then(currentQueue => {
                                    sendMessage(rschannels[playersToKick[j].level], `RS${playersToKick[j].level + 3} (${currentQueue.length}/4) <@${playersToKick[j].playerID}> left the queue because they were AFK for too long!`)
                                    if (!levelsToUpdate.some(level => level === playersToKick[j].level)) {
                                        levelsToUpdate.push(playersToKick[j].level)
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
}
