import { EmbedBuilder, GuildMember, Message } from "discord.js"
import { adminRole, botchannels, captainRole, coordRole, Corpnames, corpRoles, DevRole, GreeterRole, memberrole, representtiverole, retiredrole, rosterBuddiesRole } from "../../config/config.js"
import { getallMembers, getmember, getrole, getSelfMember, sendEmbed, sendMessage } from "../bot.js"
import { command, allArguments, commandGroup } from "./command.js"
import { queryDB } from "./DB.js"
import { canManageRole } from "./role.js"

function initUser(BaseCommandGroup: commandGroup) {
    const usergive = new command("give", ["g"], [allArguments.memberArgument, allArguments.rolesArgument], "Assigns any amount of roles to one User", usergiveExec, [], hasCoordPerms, false, false)
    const usertake = new command("take", ["t"], [allArguments.memberArgument, allArguments.rolesArgument], "Removes any amount of roles from one User", usertakeExec, [], hasCoordPerms, false, false)
    const userinfo = new command("info", ["i"], [allArguments.optmemberArgument], "Displays information about the specified User. If no User is specified, displays information about yourself.", userinfoExec, [], hasdefaultPerms, true, false)
    const usersearch = new command("search", ["s"], [allArguments.searchstringArgument], "Searches the server for Members with a specified string in their name.", usersearchExec, [], hasdefaultPerms, true, false)
    const ban = new command("ban", [], [allArguments.memberArgument], "Bans a specified Member from the server 🔨", banExec, [], hasAdminPerms, false, true)
    const kick = new command("kick", [], [allArguments.memberArgument], "Kicks a specified Member from the server 👢", kickExec, [], hasCoordPerms, false, true)
    const hackban = new command("hackban", [], [allArguments.memberidArgument], "Bans the member with the specified ID from tthe server 🔨", hackbanExec, [], hasAdminPerms, false, true)
    const avatar = new command("avatar", ["a"], [allArguments.memberArgument], "Displays the Avatar of the specified Member", avatarExec, [], hasdefaultPerms, true, false)

    const user = new commandGroup("user", ["u"], [], [usergive, usertake, userinfo, usersearch], "Command group for managing users", false)

    const recruit = new command("recruit", [], [allArguments.memberArgument, allArguments.corpnameArgument], "Recruits a specified Member into the specified Corp.", recruitExec, [], hasGreeterPerms, true, true)
    const retire = new command("retire", [], [allArguments.memberArgument], "Retires a specified Member from SFA.", retireExec, [], hasGreeterPerms, true, true)
    const setcorp = new command("setcorp", [], [allArguments.memberArgument, allArguments.corpArgument], "Updates the corp of a specified Member", setcorpExec, [], hasCaptainPerms, true, true)
    const setnick = new command("setnick", [], [allArguments.memberArgument, allArguments.nicknameArgument], "Updates the nickname of a specified Member", setnickExec, [], hasCaptainPerms, true, true)

    BaseCommandGroup.addsubcommandgroup(user)
    BaseCommandGroup.addsubcommand(ban)
    BaseCommandGroup.addsubcommand(kick)
    BaseCommandGroup.addsubcommand(hackban)
    BaseCommandGroup.addsubcommand(recruit)
    BaseCommandGroup.addsubcommand(retire)
    BaseCommandGroup.addsubcommand(setcorp)
    BaseCommandGroup.addsubcommand(setnick)
    BaseCommandGroup.addsubcommand(avatar)

    return BaseCommandGroup
}

function usergiveExec(args: string[], message: Message, d: number) {
    getmember(message.channel.id, args[0], message.member.id, false)
        .then(async member => {
            if (member !== null) {
                for (let index = 1; index < args.length; index++) {
                    let role = await getrole(message.channel.id, args[index], message.member.id, false)
                    if (role !== null) {
                        if (canManageRole(role, message.member)) {
                            if (role.position < getSelfMember().roles.highest.position) {
                                if (member.roles.cache.some(thisrole => thisrole.id === role.id)) {
                                    sendMessage(message.channel.id, `${member.displayName} already had ${role.name}`)
                                }
                                else {
                                    member.roles.add(role)
                                    sendMessage(message.channel.id, `${role.name} successfully added to ${member.displayName}`)
                                }
                            }
                            else {
                                sendMessage(message.channel.id, `I can't help you, I can't manage ${role.name}`)
                            }
                        }
                        else {
                            sendMessage(message.channel.id, "You don't have the permission to manage this role!")
                        }
                    }
                }
            }
        })
}
function usertakeExec(args: string[], message: Message, d: number) {
    getmember(message.channel.id, args[0], message.member.id, false)
        .then(async member => {
            if (member !== null) {
                for (let index = 1; index < args.length; index++) {
                    let role = await getrole(message.channel.id, args[index], message.member.id, false)
                    if (role !== null) {
                        if (canManageRole(role, message.member)) {
                            if (role.position < getSelfMember().roles.highest.position) {
                                if (member.roles.cache.some(thisrole => thisrole.id === role.id)) {
                                    member.roles.remove(role)
                                    sendMessage(message.channel.id, `${role.name} successfully removed from ${member.displayName}`)
                                }
                                else {
                                    sendMessage(message.channel.id, `${member.displayName} didn't have ${role.name}`)
                                }
                            }
                            else {
                                sendMessage(message.channel.id, `I can't help you, I can't manage ${role.name}`)
                            }
                        }
                        else {
                            sendMessage(message.channel.id, "You don't have the permission to manage this role!")
                        }
                    }
                }
            }
        })
}
function userinfoExec(args: string[], message: Message, d: number) {
    if (args.length === 0) {
        senduserinfo(message.member)
    }
    else if (args.length === 1) {
        getmember(message.channel.id, args[0], message.author.id, false)
            .then(member => {
                if (member !== null) {
                    senduserinfo(member)
                }
            })
            .catch(err => { })
    }
    function senduserinfo(member: GuildMember) {
        let content = `Discord ID: ${member.id}\nUsername: ${member.user.tag}\nNickname: ${member.displayName}\nJoined the server on <t:${Math.floor(member.joinedTimestamp / 1000)}:f>\nThat was <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n\nCurrent Roles (${member.roles.cache.size - 1}):`
        member.roles.cache.sort((roleA, roleB) => roleB.position - roleA.position).forEach(role => {
            if (role.name !== "@everyone") {
                content += `\n<@&${role.id}>`
            }
        })
        let infoembed = new EmbedBuilder()
            .setTitle(`Info about ${member.displayName}`)
            .setDescription(content)
            .setColor(member.displayColor)
        sendEmbed(message.channel.id, "", infoembed)
    }
}
function usersearchExec(args: string[], message: Message, d: number) {
    getallMembers()
        .then(allmembers => {
            let membernames: string[] = []
            allmembers.forEach(thismember => {
                if (thismember.displayName.toLowerCase().includes(args[0]) || thismember.user.username.toLowerCase().includes(args[0])) {
                    membernames.push(`${thismember.displayName} / ${thismember.user.tag}`)
                }
            })
            if (membernames.length === 0) {
                sendMessage(message.channel.id, `There are no members whose name contains \`${args[0]}\``)
            }
            else {
                let contents: string[] = []
                let content = ""
                membernames.forEach(membername => {
                    if (content === "") {
                        content += `${membername}`
                    }
                    else if ((content + `\n${membername}`).length > 4096) {
                        contents.push(content)
                        content = `${membername}`
                    }
                    else {
                        content += `\n${membername}`
                    }
                })
                contents.push(content)
                for (let i = 0; i < contents.length; i++) {
                    let listembed = new EmbedBuilder()
                    if (i === 0) {
                        listembed.setTitle(`There are ${membernames.length} Members whose name contains \`${args[0]}\`. These are:`)
                    }
                    else {
                        listembed.setTitle(`Continued:`)
                    }
                    listembed.setDescription(contents[i])
                    sendEmbed(message.channel.id, "", listembed)
                }
            }
        })
}
async function banExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        member.ban().then(() => {
            sendMessage(message.channel.id, `${member.displayName} (${member.user.tag}) has been successfully banned 🔨`)
        }).catch(() => {
            sendMessage(message.channel.id, "This member couldn't be banned")
        })
    }
}
async function kickExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        member.kick().then(() => {
            sendMessage(message.channel.id, `${member.displayName} (${member.user.tag}) has been successfully kicked 👢`)
        }).catch(() => {
            sendMessage(message.channel.id, "This member couldn't be kicked")
        })
    }
}
function hackbanExec(args: string[], message: Message, d: number) {
    message.guild.bans.create(args[0]).then(bannedUser => {
        //@ts-ignore
        if (bannedUser.user !== undefined && bannedUser.user !== null) {
            //@ts-ignore
            sendMessage(message.channel.id, `${bannedUser.user.tag} has been successfully banned 🔨`)
        }
        //@ts-ignore
        else if (bannedUser.tag !== undefined && bannedUser.tag !== null) {
            //@ts-ignore
            sendMessage(message.channel.id, `${bannedUser.tag} has been successfully banned 🔨`)
        }
        else {
            sendMessage(message.channel.id, `The user with ID ${bannedUser} has been successfully banned 🔨`)
        }
    }).catch(err => {
        sendMessage(message.channel.id, "This user couldn't be banned")
    })
}
async function avatarExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        sendMessage(message.channel.id, member.displayAvatarURL({ size: 4096 }))
    }
}
//let text = 
async function recruitExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    let corpIndex = Corpnames.findIndex(thiscorp => thiscorp.name.toLowerCase() === args[1] || thiscorp.shortname.toLowerCase() === args[1])
    if (member !== null) {
        const name = member.displayName.replace(/\[(.*?)\]/, "").trim()
        await member.roles.remove(representtiverole)
        await member.roles.remove(retiredrole)
        await member.roles.add(memberrole)
        await member.roles.add(corpRoles[corpIndex])
        await member.setNickname(name)

        sendMessage(message.channel.id, `<@${member.id}> has been successfully recruited into the ${Corpnames[corpIndex].name} Corporation. Request to join the Corp ingame. <@&${corpRoles[corpIndex]}> give them a warm welcome over there!`);
    }
}
async function retireExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        if (member.roles.cache.some(thisrole => thisrole.id === memberrole) && member.roles.highest.position < getSelfMember().roles.highest.position) {
            await member.roles.add(retiredrole)
            await member.setNickname(`[Retired] ${member.displayName}`)
            sendMessage(message.channel.id, `<@${member.id}> has been successfully retired from Activity in the Spacefleet alliance. We hope you come back one day!`)
            member.roles.cache.forEach(role => {
                if (!(role.id === retiredrole || role.name === '@everyone')) {
                    member.roles.remove(role);
                }
            })
        }
        else {
            sendMessage(message.channel.id, "This User could not be retired.");
        }
    }
}
async function setcorpExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        const split = /\[(.*?)\]/
        const newcorp = args.slice(1).join(" ")
        let corp = split.exec(member.displayName)
        let oldcorp: string
        if (corp === null) oldcorp = "None"
        else oldcorp = corp[0]
        const name = `[${newcorp}] ${member.displayName.replace(split, "").trim()}`
        await member.setNickname(name)
        sendMessage(message.channel.id, `<@${member.id}>'s Corp was successfully changed from ${oldcorp} to ${newcorp}`)
    }
}
async function setnickExec(args: string[], message: Message, d: number) {
    const member = await getmember(message.channel.id, args[0], message.member.id, false)
    if (member !== null) {
        const split = /\[(.*?)\]/
        const newname = args.slice(1).join(" ")
        const oldname = member.displayName.replace(split, "").trim()
        const corp = split.exec(member.displayName)
        let name: string
        if (corp === null) name = newname
        else name = `${corp[0]} ${newname}`
        await member.setNickname(name)
        sendMessage(message.channel.id, `<@${member.id}>'s Nickname was successfully changed from ${oldname} to ${newname}`)
    }
}

async function getPlayerRSNotificationPreference(playerID: string) {
    return new Promise<number>((resolve, reject) => {
        queryDB(`SELECT notificationPreference FROM notificationOptions WHERE userID = ${playerID}`)
            .then(optionValue => {
                if (optionValue.length === 0) {
                    resolve(0)
                }
                else {
                    resolve(parseInt(optionValue[0].notificationPreference))
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

function hasdefaultPerms(member: GuildMember) {
    return true
}

function hasMemberPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === memberrole) || hasCaptainPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasCaptainPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === captainRole) || hasCoordPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasGreeterPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === GreeterRole) || hasCoordPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasRosterBuddiesPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === rosterBuddiesRole) || hasCoordPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasCoordPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === coordRole) || hasAdminPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasAdminPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === adminRole) || hasDevPerms(member)) {
        return true
    }
    else {
        return false
    }
}

function hasDevPerms(member: GuildMember) {
    if (member.roles.cache.some(thisrole => thisrole.id === DevRole) || member.id === "397435995429011467") {
        return true
    }
    else {
        return false
    }
}

export {
    getPlayerRSNotificationPreference,
    hasAdminPerms,
    hasCoordPerms,
    hasDevPerms,
    hasGreeterPerms,
    hasCaptainPerms,
    hasRosterBuddiesPerms,
    hasMemberPerms,
    hasdefaultPerms,
    initUser
}