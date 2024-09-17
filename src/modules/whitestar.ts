import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message, PermissionFlagsBits, Role, SlashCommandBuilder } from "discord.js"
import { areaHP, blastHP, Corpnames, destinydamage, dispatchSpeed, prefix, TWSpeed, signupchannel, WSRoles, wsTypes, allWSrole, mustReadChannel, rosterBuddiesRole, rosterbuildingchannel, runlogchannel, corpemojis } from "../../config/config.js"
import { fetchChannel, fetchMember, fetchRole, getmember, sendEmbed, sendMessage } from "../bot.js"
import { hasdefaultPerms, hasMemberPerms, hasRosterBuddiesPerms } from "./user.js"
import { escape } from "mysql2"
import { queryDB } from "./DB.js"
import { getFormattedDeltaTime, removeMarkdownFormatting } from "./utils.js"
import { command, allArguments, commandGroup } from "./command.js"

function initWS(BaseCommandGroup: commandGroup) {
    const rostercreate = new command("create", [], [allArguments.corpnameArgument, allArguments.wstypeArgument, allArguments.wssizeArgument, allArguments.membersArgument], "Creates a new roster in the specified corp with the specified type and Size and adds the specified members to it.", rostercreateExec, [rosterbuildingchannel], hasRosterBuddiesPerms, false, false)
    const rosteradd = new command("add", [], [allArguments.corpnameArgument, allArguments.membersArgument], "Adds members to an existing roster in the specified corp.", rosteraddExec, [rosterbuildingchannel], hasRosterBuddiesPerms, false, false)
    const rosterremove = new command("remove", [], [allArguments.corpnameArgument, allArguments.membersArgument], "Removes members from an existing roster in the specified corp.", rosterremoveExec, [rosterbuildingchannel], hasRosterBuddiesPerms, false, false)
    const rosteredit = new command("edit", ["modify"], [allArguments.corpnameArgument, allArguments.wstypeArgument, allArguments.wssizeArgument], "Changes the type and size of the roster in the specified corp to the new specified values.", rostereditExec, [rosterbuildingchannel], hasRosterBuddiesPerms, false, false)
    const rosterdelete = new command("delete", [], [allArguments.corpnameArgument], "Deletes the current roster for the specified corp.", rosterdeleteExec, [rosterbuildingchannel], hasRosterBuddiesPerms, false, false)
    const roster = new commandGroup("roster", ["rosters"], [], [rostercreate, rosteradd, rosterremove, rosteredit, rosterdelete], "Command group for managing the rosters.", false)

    const wsdestinycalc = new command("destinycalc", ["destcalc"], [allArguments.shipcountArgument, allArguments.destinylevelsArgument, allArguments.blastlevelsArgument, allArguments.arealevelsArgument], "Calculates the damage done by destinies of the specified levels to blastshields and areashields of the specified levels which protect a specified amount of ships. Individual mod levels are seperated by `,` without a whitespace.", wsdestinycalcExec, [], hasdefaultPerms, true, false)
    const wsdispatchcalc = new command("dispatchcalc", [], [allArguments.relicsArgument, allArguments.dispatchlevelArgument, allArguments.twlevelArgument], "Calculates the time a TS with dispatch of specified level will do.", wsdispatchcalcExec, [], hasdefaultPerms, true, false)
    const wspingspam = new command("pingspam", ["pingspaming", "ps"], [allArguments.memberArgument, allArguments.plaintextArgument], "When one ping isn't enough: pings the specified member 5 times with the specified text.", wspingspamExec, [], hasMemberPerms, true, true)
    const wspoll = new command("poll", [], [], "Creates a new poll for WS signup", wspollExec, [signupchannel], hasRosterBuddiesPerms, true, false)
    const wsshow = new command("show", [], [allArguments.wstypeArgument], "Lists the signups from the latest poll", wsshowExec, [rosterbuildingchannel], hasRosterBuddiesPerms, true, false)

    const whitestar = new commandGroup("whitestar", ["ws"], [], [wsdestinycalc, wsdispatchcalc, wspingspam, wspoll, wsshow], "Command group for managing WS-related commands.", false)

    BaseCommandGroup.addsubcommandgroup(whitestar)
    BaseCommandGroup.addsubcommandgroup(roster)
    BaseCommandGroup.addsubcommand(wspingspam)

    return BaseCommandGroup
}

function rostercreateExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const size = parseInt(args[2].lowercase)
    const j = wsTypes.findIndex(thistype => thistype.name.toLowerCase() === args[1].lowercase || thistype.shortname.toLowerCase() === args[1].lowercase)
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[0].lowercase || thiscorp.shortname.toLowerCase() === args[0].lowercase)
    queryDB(`SELECT type FROM wsmatch WHERE corp = ${corpIndex} AND current = 1`)
        .then(async output => {
            if (output.length === 0) {
                let validroster = false
                let matchID: number
                for (let playerIndex = 3; playerIndex < args.length; playerIndex++) {
                    let member = await getmember(message.channel.id, args[playerIndex].lowercase, message.member.id, false)
                    if (member !== null) {
                        if (!validroster) {
                            await queryDB(`INSERT INTO wsmatch(corp, type, size, current) VALUES (${corpIndex}, ${escape(wsTypes[j].name)}, ${size}, 1)`)
                            matchID = (await queryDB(`SELECT MAX(ID) AS id FROM wsmatch`))[0].id
                            validroster = true
                        }
                        await addPlayerToRoster(member, playerIndex - 3, size, message.channel.id, corpIndex, matchID)
                    }
                    if (playerIndex === args.length - 1) {
                        if (!validroster) {
                            sendMessage(message.channel.id, "No valid members were provided, roster creation cancelled.")
                        }
                        else {
                            sendRosterMessage(matchID)
                        }
                    }
                }
            }
            else {
                sendMessage(message.channel.id, `An active roster for ${Corpnames[corpIndex].name} already exists! Please choose another corp.`)
            }
        })
}
function rosteraddExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[0].lowercase || thiscorp.shortname.toLowerCase() === args[0].lowercase)
    queryDB(`SELECT ID, size, type FROM wsmatch WHERE corp = ${corpIndex} AND current = 1`)
        .then(async output => {
            if (output.length !== 0) {
                let validroster = false
                const matchID: number = output[0].ID
                const size: number = output[0].size
                const otherPlayers = (await queryDB(`SELECT playerID FROM wsplayer WHERE matchID =${matchID}`)).length
                for (let playerIndex = 1; playerIndex < args.length; playerIndex++) {
                    let member = await getmember(message.channel.id, args[playerIndex].lowercase, message.member.id, false)
                    if (member !== null) {
                        validroster = true
                        await addPlayerToRoster(member, playerIndex + otherPlayers - 1, size, message.channel.id, corpIndex, matchID)
                    }
                    if (playerIndex === args.length - 1) {
                        if (!validroster) {
                            sendMessage(message.channel.id, "No valid members were provided.")
                        }
                        else {
                            sendRosterMessage(matchID)
                        }
                    }
                }
            }
            else {
                sendMessage(message.channel.id, `An active roster for ${Corpnames[corpIndex].name} does not exist! Create one first using \`${prefix}roster create ${Corpnames[corpIndex].shortname}\`.`)
            }
        })
}
function rosterremoveExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[0].lowercase || thiscorp.shortname.toLowerCase() === args[0].lowercase)
    queryDB(`SELECT ID, size, type FROM wsmatch WHERE corp = ${corpIndex} AND current = 1`)
        .then(async output => {
            if (output.length !== 0) {
                let validroster = false
                const matchID: number = output[0].ID
                let rosterxists = true
                for (let playerIndex = 1; playerIndex < args.length; playerIndex++) {
                    let member = await getmember(message.channel.id, args[playerIndex].lowercase, message.member.id, false)
                    if (member !== null) {
                        validroster = true
                        rosterxists = await removePlayerFromRoster(member, message.channel.id, corpIndex, matchID)
                    }
                    if (playerIndex === args.length - 1) {
                        if (!validroster) {
                            sendMessage(message.channel.id, "No valid members were provided.")
                        }
                        else {
                            if (rosterxists) {
                                sendRosterMessage(matchID)
                            }
                            else {
                                queryDB(`DELETE FROM wsmatch WHERE ID = ${matchID}`)
                                sendMessage(signupchannel, `No members remaining in the ${Corpnames[corpIndex].shortname}-WS roster. The roster has been subsequently deleted.`)
                            }
                        }
                    }
                }
            }
            else {
                sendMessage(message.channel.id, `An active roster for ${Corpnames[corpIndex].name} does not exist! Create one first using \`${prefix}roster create ${Corpnames[corpIndex].shortname}\`.`)
            }
        })
}
function rostereditExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const size = parseInt(args[2].lowercase)
    const j = wsTypes.findIndex(thistype => thistype.name.toLowerCase() === args[1].lowercase || thistype.shortname.toLowerCase() === args[1].lowercase)
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[0].lowercase || thiscorp.shortname.toLowerCase() === args[0].lowercase)
    queryDB(`SELECT ID FROM wsmatch WHERE corp = ${corpIndex} AND current = 1`)
        .then(async output => {
            if (output.length !== 0) {
                const matchID: number = output[0].ID
                const currentPlayers = (await queryDB(`SELECT playerID FROM wsplayer WHERE matchID =${matchID}`)).length
                if (currentPlayers <= size) {
                    queryDB(`UPDATE wsmatch SET size = ${size}, type = ${escape(wsTypes[j].name)}`)
                    sendRosterMessage(matchID)
                }
                else {
                    sendMessage(message.channel.id, `There are more players already assigned to the ${Corpnames[corpIndex].shortname} roster than you are allocating room for. You cannot set ${size} as the new size for the roster.`)
                }
            }
            else {
                sendMessage(message.channel.id, `An active roster for ${Corpnames[corpIndex].name} does not exist! Create one first using \`${prefix}roster create ${Corpnames[corpIndex].shortname}\`.`)
            }
        })
}
function rosterdeleteExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[0].lowercase || thiscorp.shortname.toLowerCase() === args[0].lowercase)
    queryDB(`SELECT ID FROM wsmatch WHERE corp = ${corpIndex} AND current = 1`)
        .then(async output => {
            if (output.length !== 0) {
                queryDB(`DELETE FROM wsmatch WHERE ID = ${output[0].ID}`)
                queryDB(`DELETE FROM wsplayer WHERE matchID = ${output[0].ID}`)
                sendMessage(message.channel.id, `The active roster for ${Corpnames[corpIndex].name} has been destroyed.`)
            }
            else {
                sendMessage(message.channel.id, `An active roster for ${Corpnames[corpIndex].name} does not exist! Create one first using \`${prefix}roster create ${Corpnames[corpIndex].shortname}\`.`)
            }
        })
}
async function wspollExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    await sendMessage(message.channel.id, `__**Weekly <@&${allWSrole}> signup**__: *vote in until Friday - Saturday. Scans are typically on sunday.*\n\nFor Participation in a WS you will be asked to hop to a SFA corp which may differ from your 'home' corp. You can stay there for the duration of the WS. When you see that you are assigned to that corp, please make your way over there as soon as you can. No one wants to wait long.\n\nThe minimumm requirements to sign up for a WS here are posted in **<#${mustReadChannel}>**. This is due for a rework since DN so don't take everything there at face value. Read them carefully and only sign up when you are 100% sure you can meet these requirements for the full 5 days. Teamwork and communication are the most important thing in WS. Be proactive and don't let the commanders do everything alone! Call out problems or plans you see and have.\n\n__:alarm_clock: Your Timezone and your Tech must be up-to-date in the HS-Compendium regardless of what WS type you sign up for! __\n\n**The SFA has some fixed rosters of people who run together (almost) every week. If you want to join one of them, contact:**\n_<@447800172693553153> for the weekly competitive Spacefleet-WS_\n_<@523938533778653194> for the back-to-back Ultra-Casual Deadspace-WS_\n_<@880817767031373877> for the weekly semi-competitive low-mid level WS_\n\nIf you have any questions or concerns, or want to report inappropriate behaviour of a WS participant, ping **<@&${rosterBuddiesRole}>** for help. Thank you for flying with SFA <:salute:522916552593637376>`)
    let pollEmbed = new EmbedBuilder()
        .setColor('#ffd046')
        .setTitle(`Preferred WS type`)
        .setDescription("One vote per HS-Account")
        .addFields({ name: '\u200b', value: `:regional_indicator_a: ${wsTypes[0].name}\n:regional_indicator_b: ${wsTypes[1].name}\n:regional_indicator_c: ${wsTypes[2].name}\n:regional_indicator_d: Backup/Additional Alt` });
    sendEmbed(message.channel.id, "", pollEmbed)
        .then(async sent => {
            let id = sent.id;
            queryDB(`UPDATE config SET wsroster=${escape(id)}`)
            await sent.react('🇦')
            await sent.react('🇧')
            await sent.react('🇨')
            await sent.react('🇩')
        })
    queryDB("UPDATE wsmatch SET current=0")
}
function wsshowExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    queryDB(`SELECT wsroster FROM config`).then(async rosterMessageID => {
        let d = ''
        let i = 0
        let k = 0
        let sent = false
        let parameters = { emoji: "", title: "", title2: "" }
        let validResponse = false
        let rosterembed = new EmbedBuilder()
            .setColor('#ffd046');
        (await fetchChannel(signupchannel)).messages.fetch(rosterMessageID[0].wsroster)
            .then(msg => {
                const index = wsTypes.findIndex(thistype => thistype.name.toLowerCase() === args[0].lowercase || thistype.shortname.toLowerCase() === args[0].lowercase)
                if (index === 0) {
                    parameters.emoji = "🇦"
                    parameters.title = wsTypes[0].name + " "
                    validResponse = true
                }
                else if (index === 1) {
                    parameters.emoji = "🇧"
                    parameters.title = wsTypes[1].name + " "
                    validResponse = true
                }
                else if (index === 2) {
                    parameters.emoji = "🇨"
                    parameters.title = wsTypes[2].name + " "
                    validResponse = true
                }
                else if (args[0].lowercase === "backup") {
                    parameters.emoji = "🇩"
                    parameters.title2 = "as Backup "
                    validResponse = true
                }
                if (validResponse == true) {
                    msg.reactions.resolve(parameters.emoji).users.fetch().then(users => users.forEach(user => {
                        message.guild.members.fetch(user.id)
                            .then(member => {
                                if (!user.bot) {
                                    d += `${i + 1}. ${member.displayName}\n`
                                    i++;
                                }
                                if (k === msg.reactions.resolve(parameters.emoji).count - 1 && !sent) {
                                    rosterembed
                                        .setTitle(`Signups ${parameters.title2}for ${parameters.title}WS`)
                                        .setDescription(`${i} Players have signed up ${parameters.title2}for ${parameters.title}WS`)
                                    if (i === 0) {
                                        rosterembed.addFields({ name: '\u200b', value: `No one has signed up ${parameters.title2}for ${parameters.title}WS` });
                                    }
                                    else {
                                        rosterembed.addFields({ name: '\u200b', value: d })
                                    }
                                    sendEmbed(message.channel.id, "", rosterembed)
                                    sent = true
                                }
                                k++
                            })
                    }))
                }
                else {
                    sendMessage(message.channel.id, "Invalid WS type.")
                }
            })
    })
}
function wsdestinycalcExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const shipcount = parseInt(args[0].lowercase)
    const destinies = args[1].lowercase.split(",").map(str => parseInt(str))
    const blasts = args[2].lowercase.split(",").map(str => parseInt(str))
    const areas = args[3].lowercase.split(",").map(str => parseInt(str))
    const cumulativeDamage = destinies.reduce((a, b) => { return a + destinydamage[b] }, 0)
    const cumulativeHP = blasts.reduce((a, b) => { return a + blastHP[b] }, 0) + areas.reduce((a, b) => { return a + areaHP[b] }, 0)
    let content = `There are ${shipcount} ships, protected by ${cumulativeHP} HP of shields.\n\nThere is a total of ${cumulativeDamage} damage done to each of those ship, resulting in a total of ${cumulativeDamage * shipcount} damage.\n\n`
    if (cumulativeDamage * shipcount > cumulativeHP) {
        content += `The damage will wipe out the shields and deal a total of ${(cumulativeDamage * shipcount) - cumulativeHP} damage to the hulls of the ships, but only Papa knows to which ones.`
    }
    else if (cumulativeDamage * shipcount < cumulativeHP) {
        content += `The damage will not deplete shields and leave a total of ${cumulativeHP - (cumulativeDamage * shipcount)} hp in the shields, but only Papa knows in which ones.`
    }
    else {
        content += "The damage will cleanly wipe out the shields but won't even scratch the hulls of the ships."
    }
    sendMessage(message.channel.id, content)
}
function wsdispatchcalcExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const relics = parseInt(args[0].lowercase)
    const dispatch = parseInt(args[1].lowercase)
    const TW = parseInt(args[2].lowercase)
    sendMessage(message.channel.id, `Under TW lvl.${TW}, with ${relics} relics on the target planet, a transport with dispatch lvl.${dispatch} will take ${getFormattedDeltaTime(0, Math.floor((dispatchSpeed[dispatch] * relics * 60000) / TWSpeed[TW]))}.`)
}
async function wspingspamExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    let victim = await getmember(message.channel.id, args[0].lowercase, message.member.id, false)
    if (victim !== null) {
        let text = args.slice(1).map(a => a.original).join(" ")
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                sendMessage(message.channel.id, `<@${victim.id}>, ${text}`)
            }, i * 1000);
        }
    }
}

function sendRosterMessage(matchID: number) {
    queryDB(`SELECT ID, corp, type, size FROM wsmatch WHERE ID = ${matchID}`)
        .then(output => {
            let roster = output[0]
            queryDB(`SELECT playerID, isAlt FROM wsplayer WHERE matchID = ${matchID}`)
                .then(async allplayers => {
                    let content = ""
                    let starting = false
                    if (allplayers.length >= roster.size) {
                        content += `The ${roster.type} ${Corpnames[roster.corp].shortname}-roster is ready to run. (${roster.size}/${roster.size})\nA commander can start the scan with \`${prefix}ws scan ${Corpnames[roster.corp].shortname}\`\n`
                        starting = true
                    }
                    else {
                        content += `The ${roster.type} ${Corpnames[roster.corp].shortname}-roster is at (${allplayers.length}/${roster.size})\n`
                    }
                    fetchRole(WSRoles[roster.corp])
                        .then(async wsrole => {
                            const rolemembers = wsrole.members.clone().map(thisvalue => thisvalue)
                            if (rolemembers.length === 0) {
                                addroletoqueue(wsrole)
                            }
                            else {
                                let k = 0
                                for (let index = 0; index < rolemembers.length; index++) {
                                    await rolemembers[index].roles.remove(wsrole)
                                    k++
                                    if (k >= rolemembers.length) {
                                        addroletoqueue(wsrole)
                                    }
                                }
                            }
                        })
                    async function addroletoqueue(wsrole: Role) {
                        for (let index = 0; index < allplayers.length; index++) {
                            let alt = ""
                            if (allplayers[index].isAlt === 1) {
                                alt = "'s alt"
                            }
                            const member = await fetchMember(allplayers[index].playerID)
                            if (member !== null) {
                                content += `\n${index + 1}. <@${member.id}>${alt}`
                                await member.roles.add(wsrole)
                            }
                            if (index === allplayers.length - 1) {
                                content += `\n\nPlease make your way to ${Corpnames[roster.corp].name}. A commander will start the scan when everyone has arrived.`
                                sendMessage(signupchannel, content)
                            }
                        }
                    }
                })
        })
}

async function addPlayerToRoster(member: GuildMember, playerIndex: number, size: number, channelID: string, corpIndex: number, matchID: number) {
    return new Promise<boolean>((resolve) => {
        queryDB(`SELECT playerID FROM wsplayer WHERE playerID = ${member.id} AND matchID = ${matchID}`)
            .then(async playerInRoster => {
                let alt: number
                if (playerIndex < size) {
                    if (playerInRoster.length === 0) {
                        alt = 0
                        sendMessage(channelID, `${member.displayName} added to the ${Corpnames[corpIndex].shortname}-roster.`)
                    }
                    else {
                        alt = 1
                        sendMessage(channelID, `${member.displayName}'s alt added to the ${Corpnames[corpIndex].shortname}-roster.`)
                    }
                    await queryDB(`INSERT INTO wsplayer(playerID, matchID, isAlt) VALUES (${member.id}, ${matchID}, ${alt})`)
                }
                else {
                    if (playerInRoster.length === 0) {
                        sendMessage(channelID, `The ${Corpnames[corpIndex].shortname}-roster is full. ${member.displayName} couldn't be added.`)
                    }
                    else {
                        sendMessage(channelID, `The ${Corpnames[corpIndex].shortname}-roster is full. ${member.displayName}'s alt couldn't be added.`)
                    }
                }
                resolve(true)
            })
    })
}

function removePlayerFromRoster(member: GuildMember, channelID: string, corpIndex: number, matchID: number) {
    return new Promise<boolean>((resolve) => {
        queryDB(`SELECT playerID FROM wsplayer WHERE playerID = ${member.id} AND matchID = ${matchID}`)
            .then(playerInRoster => {
                if (playerInRoster.length === 0) {
                    sendMessage(channelID, `${member.displayName} isn't part of the ${Corpnames[corpIndex].shortname}-roster.`)
                    resolve(true)
                }
                else {
                    sendMessage(channelID, `${member.displayName} removed from the ${Corpnames[corpIndex].shortname}-roster.`)
                    queryDB(`DELETE FROM wsplayer WHERE playerID = ${member.id} AND matchID = ${matchID}`)
                    if (playerInRoster.length === 1) {
                        resolve(false)
                    }
                    else {
                        resolve(true)
                    }
                }
            })
    })
}

export {
    initWS,
    //initWSCommands,
    //handleRecap
}
