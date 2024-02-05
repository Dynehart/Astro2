import { EmbedBuilder, GuildMember, Message, Role } from "discord.js";
import { botchannels } from "../../config/config.js";
import { getallMembers, getmember, getrole, getSelfMember, sendEmbed, sendMessage } from "../bot.js";
import { commandGroup, command, allArguments } from "./command.js";
import { hasAdminPerms, hasCoordPerms, hasdefaultPerms } from "./user.js";

function initRole(BaseCommandGroup: commandGroup) {
    const rolegive = new command("give", ["g"], [allArguments.roleArgument, allArguments.membersArgument], "Assigns one Role to any amount of Users", rolegiveExec, [], hasCoordPerms, false, false)
    const roletake = new command("take", ["t"], [allArguments.roleArgument, allArguments.membersArgument], "Removes one Role from any amount of Users", roletakeExec, [], hasCoordPerms, false, false)
    const rolelist = new command("list", ["l"], [allArguments.rolesArgument], "Lists all members of a number of roles in a nice format", rolelistExec, [], hasdefaultPerms, true, false)
    const rolebulklist = new command("bulklist", [], [allArguments.rolesArgument], "Lists all members of a number of roles in a format that can be understood by me (Astronomer). Beware of `\"` in a member's name - they'll mess up the syntax!", rolebulklistExec, [], hasdefaultPerms, true, false)
    const roleclear = new command("clear", ["c"], [allArguments.roleArgument], "Removes all members from a specified role.", roleclearExec, [], hasCoordPerms, true, false)
    const role = new commandGroup("role", ["r"], [], [rolegive, roletake, rolelist, rolebulklist, roleclear], "Command group for managing roles", false)

    BaseCommandGroup.addsubcommandgroup(role)

    return BaseCommandGroup
}

function rolegiveExec( args: { lowercase: string, original: string }[], message: Message, d: number) {
    getrole(message.channel.id, args[0].lowercase, message.member.id, false)
        .then(async role => {
            if (role !== null) {
                if (canManageRole(role, message.member)) {
                    if (role.position < getSelfMember().roles.highest.position) {
                        for (let index = 1; index < args.length; index++) {
                            let member = await getmember(message.channel.id, args[index].lowercase, message.member.id, false)
                            if (member !== null) {
                                if (member.roles.cache.some(thisrole => thisrole.id === role.id)) {
                                    sendMessage(message.channel.id, `${member.displayName} already had ${role.name}`)
                                }
                                else {
                                    member.roles.add(role)
                                    sendMessage(message.channel.id, `${role.name} successfully added to ${member.displayName}`)
                                }
                            }
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
        })
}
function roletakeExec( args: { lowercase: string, original: string }[], message: Message, d: number) {
    getrole(message.channel.id, args[0].lowercase, message.member.id, false)
        .then(async role => {
            if (role !== null) {
                if (canManageRole(role, message.member)) {
                    if (role.position < getSelfMember().roles.highest.position) {
                        for (let index = 1; index < args.length; index++) {
                            let member = await getmember(message.channel.id, args[index].lowercase, message.member.id, false)
                            if (member !== null) {
                                if (member.roles.cache.some(thisrole => thisrole.id === role.id)) {
                                    member.roles.remove(role)
                                    sendMessage(message.channel.id, `${role.name} successfully removed from ${member.displayName}`)
                                }
                                else {
                                    sendMessage(message.channel.id, `${member.displayName} didn't have ${role.name}`)
                                }
                            }
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
        })
}
function roleclearExec( args: { lowercase: string, original: string }[], message: Message, d: number) {
    getrole(message.channel.id, args[0].lowercase, message.member.id, false)
        .then(async role => {
            if (role !== null) {
                if (canManageRole(role, message.member)) {
                    if (role.position < getSelfMember().roles.highest.position) {
                        const rolemembers = role.members.clone().map(thisvalue => thisvalue)
                        if (rolemembers.length === 0) {
                            sendMessage(message.channel.id, `${role.name} was already empty`)
                        }
                        else {
                            for (let index = 0; index < rolemembers.length; index++) {
                                await rolemembers[index].roles.remove(role)
                                sendMessage(message.channel.id, `${role.name} successfully removed from ${rolemembers[index].displayName}`)
                            }
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
        })
}

function rolelistExec( args: { lowercase: string, original: string }[], message: Message, d: number) {
    listmembers(args, message.channel.id, message.member.id, false)
}

function rolebulklistExec( args: { lowercase: string, original: string }[], message: Message, d: number) {
    listmembers(args, message.channel.id, message.member.id, true)
}

function canManageRole(role: Role, member: GuildMember) {
    return (role.position < member.roles.highest.position) || hasAdminPerms(member)
}

async function listmembers( args: { lowercase: string, original: string }[], channelID: string, memberID: string, bulk: boolean) {
    let InputArgs: { "operand": string, "inverse": boolean, "nextOr": boolean, "content": string }[] = []
    for (let i = 0; i < args.length; i++) {
        if (i === 0) {
            if (args[i].lowercase.startsWith("!")) {
                InputArgs.push({ "operand": "and", "inverse": true, "nextOr": false, "content": args[i].lowercase.slice(1) })
            }
            else {
                InputArgs.push({ "operand": "and", "inverse": false, "nextOr": false, "content": args[i].lowercase })
            }
        }
        else if (args[i].lowercase.startsWith("|")) {
            InputArgs[i - 1].nextOr = true
            if (args[i].lowercase.slice(1).startsWith("!")) {
                InputArgs.push({ "operand": "or", "inverse": true, "nextOr": false, "content": args[i].lowercase.slice(2) })
            }
            else {
                InputArgs.push({ "operand": "or", "inverse": false, "nextOr": false, "content": args[i].lowercase.slice(1) })
            }
        }
        else if (args[i].lowercase.startsWith("&")) {
            if (args[i].lowercase.slice(1).startsWith("!")) {
                InputArgs.push({ "operand": "and", "inverse": true, "nextOr": false, "content": args[i].lowercase.slice(2) })
            }
            else {
                InputArgs.push({ "operand": "and", "inverse": false, "nextOr": false, "content": args[i].lowercase.slice(1) })
            }
        }
        else {
            if (args[i].lowercase.startsWith("!")) {
                InputArgs.push({ "operand": "and", "inverse": true, "nextOr": false, "content": args[i].lowercase.slice(1) })
            }
            else {
                InputArgs.push({ "operand": "and", "inverse": false, "nextOr": false, "content": args[i].lowercase })
            }
        }
    }
    let newargs = []
    for (let i = 0; i < InputArgs.length; i++) {
        const role = await getrole(channelID, InputArgs[i].content, memberID, false)
        if (role !== null) {
            newargs.push({ "operand": InputArgs[i].operand, "inverse": InputArgs[i].inverse, "nextOr": InputArgs[i].nextOr, "role": role });
        }
        if (i === InputArgs.length - 1) {
            if (newargs.length > 0) {
                let members: GuildMember[] = [];
                let rolenames: string = ""
                for (let i = 0; i < newargs.length; i++) {
                    let not = ""
                    if (newargs[i].inverse) {
                        not = "not "
                    }
                    if (i === 0) {
                        rolenames += not + newargs[i].role.name
                    }
                    else {
                        if (newargs[i].operand === "and") {
                            rolenames += " and " + not + newargs[i].role.name
                        }
                        else {
                            rolenames += " or " + not + newargs[i].role.name
                        }
                    }
                }
                getallMembers().then(allmembers => {
                    allmembers.forEach(member => {
                        let accepted = true;
                        let orAccepted = true;
                        for (let i = 0; i < newargs.length; i++) {
                            if (member.roles.cache.some(role => role.id === newargs[i].role.id)) {
                                if (newargs[i].inverse) {
                                    if (newargs[i].operand === "and") {
                                        if (newargs[i].nextOr) {
                                            orAccepted = false;
                                        }
                                        else {
                                            accepted = false;
                                        }
                                    }
                                    else {
                                        if (!newargs[i].nextOr) {
                                            if (accepted === true) {
                                                accepted = orAccepted;
                                            }
                                        }
                                    }
                                }
                                else {
                                    if (newargs[i].nextOr) {
                                        orAccepted = true;
                                    }
                                }
                            }
                            else {
                                if (newargs[i].inverse) {
                                    if (newargs[i].nextOr) {
                                        orAccepted = true;
                                    }
                                }
                                else {
                                    if (newargs[i].operand === "and") {
                                        if (newargs[i].nextOr) {
                                            orAccepted = false;
                                        }
                                        else {
                                            accepted = false;
                                        }
                                    }
                                    else {
                                        if (!newargs[i].nextOr) {
                                            if (accepted) {
                                                accepted = orAccepted;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (accepted) {
                            members.push(member);
                        }
                    });
                    if (bulk) {
                        if (members.length !== 0) {
                            let contents: string[] = []
                            let content = `There are ${members.length} Members with ${rolenames}. These are:`
                            members.forEach(member => {
                                if (content === "") {
                                    content += `"${member.displayName}"`
                                }
                                else if ((content + ` ${member.displayName}`).length > 2000) {
                                    contents.push(content)
                                    content = `"${member.displayName}"`
                                }
                                else {
                                    content += ` "${member.displayName}"`
                                }
                            })
                            contents.push(content)
                            for (let i = 0; i < contents.length; i++) {
                                sendMessage(channelID, contents[i])
                            }
                        }
                        else {
                            sendMessage(channelID, `There are no Members with ${rolenames}.`)
                        }
                    }
                    else {
                        if (members.length !== 0) {
                            let contents: string[] = []
                            let content = ""
                            members.forEach(member => {
                                if (content === "") {
                                    content += `${member.displayName}`
                                }
                                else if ((content + `\n${member.displayName}`).length > 4096) {
                                    contents.push(content)
                                    content = `${member.displayName}`
                                }
                                else {
                                    content += `\n${member.displayName}`
                                }
                            })
                            contents.push(content)
                            for (let i = 0; i < contents.length; i++) {
                                let listembed = new EmbedBuilder()
                                if (i === 0) {
                                    listembed.setTitle(`There are ${members.length} Members with ${rolenames}. These are:`)
                                }
                                else {
                                    listembed.setTitle(`Continued:`)
                                }
                                listembed.setDescription(contents[i])
                                listembed.setColor(role.color)
                                sendEmbed(channelID, "", listembed)
                            }
                        }
                        else {
                            let listembed = new EmbedBuilder()
                            listembed.setTitle(`There are no Members with ${rolenames}.`)
                            listembed.setColor(role.color)
                            sendEmbed(channelID, "", listembed)
                        }
                    }
                });
            }
            else {
                sendMessage(channelID, "No valid roles provided, process aborted")
            }
        }
    }
}

export {
    initRole,
    canManageRole
}