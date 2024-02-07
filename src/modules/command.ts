import { GuildMember, Message } from "discord.js";
import { Corpnames, prefix, rslevels, wsTypes } from "../../config/config.js";
import { sendMessage } from "../bot.js";

abstract class commandArgument {
    //Superclass of all command arguments.
    readonly name: string
    //Type: 0 = regular argument, 1 = optional argument, 2 = multiple arguments, 3 = multiple arguments or none
    readonly argType: number
    constructor(name: string, argType: number) {
        this.name = name
        this.argType = argType
    }
    validateArgument: (rawInput: string) => boolean
}
class numberArgument extends commandArgument {
    protected min: number
    protected max: number
    constructor(name: string, type: number, min: number, max: number) {
        super(name, type)
        this.min = min
        this.max = max
        this.validateArgument = (rawInput: string) => {
            let value = parseInt(rawInput)
            if (value < this.min || value > this.max || isNaN(value)) {
                return false
            }
            else {
                return true
            }
        }
    }
}
class specificNumberArgument extends commandArgument {
    protected allowed: number[]
    constructor(name: string, type: number, allowed: number[]) {
        super(name, type)
        this.allowed = allowed
        this.validateArgument = (rawInput: string) => {
            let value = parseInt(rawInput)
            if (this.allowed.some(num => num === value)) {
                return true
            }
            else {
                return false
            }
        }
    }
}
class textArgument extends commandArgument {
    constructor(name: string, type: number) {
        super(name, type)
        this.validateArgument = (rawInput: string) => {
            return true
        }
    }
}
class regexpArgument extends commandArgument {
    protected regexp: RegExp
    constructor(name: string, type: number, regexp: RegExp) {
        super(name, type)
        this.regexp = regexp
        this.validateArgument = (rawInput: string) => {
            if (regexp.exec(rawInput) !== null) return true
            else return false
        }
    }
}
class partofStringArgument extends commandArgument {
    protected partof: string[][]
    constructor(name: string, type: number, partof: string[][]) {
        super(name, type)
        this.partof = partof
        this.validateArgument = (rawInput: string) => {
            if (this.partof.some(thisarray => thisarray.some(thisvalue => thisvalue.toLowerCase() === rawInput))) {
                return true
            }
            else {
                return false
            }
        }
    }
}
class csvArgument extends numberArgument {
    constructor(name: string, type: number, min: number, max: number) {
        super(name, type, min, max)
        this.validateArgument = (rawInput: string) => {
            const values = rawInput.split(",").map(str => parseInt(str))
            if (values.some(value => isNaN(value) || value < this.min || value > this.max)) {
                return false
            }
            else {
                return true
            }
        }
    }
}
class commandGroup {
    readonly name: string
    readonly aliases: (string)[]
    private subcommandgroups: commandGroup[]
    private subcommands: command[]
    readonly helpText: string
    readonly hideHelp: boolean
    readonly allaliases: string = ""
    constructor(name: string, aliases: (string)[], subcommandgroups: commandGroup[], subcommands: command[], helpText: string, hideHelp: boolean) {
        this.name = name
        this.aliases = aliases
        this.subcommandgroups = subcommandgroups
        this.subcommands = subcommands
        this.helpText = helpText
        this.hideHelp = hideHelp
        if (this.aliases.length !== 0) {
            this.allaliases = ` [${this.aliases.reduce((prev, current) => `${prev}, ${current}`)}]`
        }
    }
    public addsubcommand(newsubcommand: command) {
        this.subcommands.push(newsubcommand)
    }
    public addsubcommandgroup(newsubcommandgroup: commandGroup) {
        this.subcommandgroups.push(newsubcommandgroup)
    }
    public gethelp() {
        let content = ""
        this.subcommandgroups.forEach(subcommandgroup => {
            if (!subcommandgroup.hideHelp) content += `\n\n${subcommandgroup.name}${subcommandgroup.allaliases}:\n\t${subcommandgroup.helpText}`
        })
        this.subcommands.forEach(subcommand => {
            if (!subcommand.hideHelp) content += `\n\n${subcommand.name}${subcommand.allaliases}:\n\t${subcommand.helpText}`
        })
        return content
    }
    public getsubcommand(name: string) {
        let j = this.subcommands.findIndex(thiscommand => thiscommand.name === name || thiscommand.aliases.some(alias => alias === name))
        if (j != -1) {
            return this.subcommands[j]
        }
        return null
    }
    public getsubcommandgroup(name: string) {
        let i = this.subcommandgroups.findIndex(thisgroup => thisgroup.name === name || thisgroup.aliases.some(alias => alias === name))
        if (i != -1) {
            return this.subcommandgroups[i]
        }
        return null
    }
    public call(commandName: string, args: { lowercase: string, original: string }[], message: Message, d: number, origin: string, initial: boolean) {
        let space = " "
        if (initial) space = ""
        let validCommand = false
        this.subcommands.forEach(subcommand => {
            if (subcommand.name === commandName || subcommand.aliases.some(alias => alias === commandName)) {
                subcommand.call(args, message, d, `${origin}${this.name}${space}`)
                validCommand = true
            }
        })
        this.subcommandgroups.forEach(subcommandgroup => {
            if (subcommandgroup.name === commandName || subcommandgroup.aliases.some(alias => alias == commandName)) {
                subcommandgroup.call(args[0].lowercase, args.slice(1), message, d, `${origin}${this.name}${space}`, false)
                validCommand = true
            }
        })
        if (!validCommand && !initial) {
            if (commandName === undefined) {
                sendMessage(message.channel.id, `Usage: \`${prefix}${origin}${this.name}\`\n\n${this.helpText}`)
            }
            else {
                sendMessage(message.channel.id, `Command group \`${origin}${this.name}\` does not have a subcommand \`${commandName}\``)
            }
        }
    }
}
class command {
    private minargs = 0
    private maxargs = 0
    readonly name: string
    readonly aliases: (string)[]
    private args: commandArgument[]
    readonly helpText: string
    readonly usage: string
    readonly allaliases: string = ""
    private permissionLimit: (member: GuildMember) => boolean
    private execute: (args: { lowercase: string, original: string }[], message: Message, d: number) => void
    private channellimit: string[][]
    private deleteCommandMessage: boolean
    readonly hideHelp: boolean
    constructor(name: string, aliases: (string)[], args: commandArgument[], helpText: string, onExecute: (args: { lowercase: string, original: string }[], message: Message, d: number) => void, channellimit: string[][], permissionLimit: (member: GuildMember) => boolean, deleteCommandMessage: boolean, hideHelp: boolean) {
        this.name = name
        this.aliases = aliases
        this.args = args
        this.helpText = helpText
        this.usage = name
        this.hideHelp = hideHelp
        for (let k = 0; k < args.length; k++) {
            if (args[k].argType === 0) {
                this.minargs++
                this.maxargs++
                this.usage += ` <${args[k].name}>`
            }
            else if (args[k].argType === 1) {
                this.maxargs++
                this.usage += ` <${args[k].name}?>`
            }
            else if (args[k].argType === 2) {
                this.minargs++
                this.maxargs = Infinity
                this.usage += ` [${args[k].name}]`
            }
            else if (args[k].argType === 3) {
                this.maxargs = Infinity
                this.usage += ` [${args[k].name}?]`
            }
            if (args[k].argType !== 0 && k !== args.length - 1) {
                throw new Error(`Error on initialising command ${name}, optional and multi-argument arguments can only be the last argument of a command.`)
            }
        }
        if (this.aliases.length !== 0) {
            this.allaliases = ` [${this.aliases.reduce((prev, current) => `${prev}, ${current}`)}]`
        }
        this.execute = onExecute
        this.permissionLimit = permissionLimit
        this.channellimit = channellimit
        this.deleteCommandMessage = deleteCommandMessage
    }
    public call(args: { lowercase: string, original: string }[], message: Message, d: number, origin: string) {
        if (this.permissionLimit(message.member)) {
            if (this.channellimit.some(thischannelIDs => thischannelIDs.some(thischannelID => thischannelID === message.channel.id)) || this.channellimit.length === 0) {
                if (args.length === 0 && this.minargs !== 0) {
                    sendMessage(message.channel.id, `Usage: \`${prefix}${origin}${this.usage}\`\n\n${this.helpText}`)
                }
                else if (args.length >= this.minargs && args.length <= this.maxargs) {
                    let verified = true
                    let k = 0
                    while (verified && k < args.length) {
                        if (k < this.args.length - 1) {
                            verified = this.args[k].validateArgument(args[k].lowercase)
                        }
                        else {
                            verified = this.args[this.args.length - 1].validateArgument(args[k].lowercase)
                        }
                        k++
                    }
                    if (verified) {
                        this.execute(args, message, d)
                        if (this.deleteCommandMessage) {
                            setTimeout(() => {
                                message.delete().catch(err => { })
                            }, 15000);
                        }
                    }
                    else {
                        let argument: string
                        if (k < this.args.length) {
                            argument = this.args[k - 1].name
                        }
                        else {
                            argument = this.args[args.length - 1].name
                        }
                        sendMessage(message.channel.id, `Validation error on argument ${k}. Value \`${args[k - 1]}\` is not accepted for argument \`<${argument}>\`. For help on this command, use \`${prefix}help ${origin}${this.name}\``)
                    }
                }
                else {
                    sendMessage(message.channel.id, `Invalid usage! Correct usage: \`${prefix}${origin}${this.usage}\``).then(sent => {
                        setTimeout(() => {
                            sent.delete().catch(err => { })
                        }, 60000);
                    })
                    message.react("❓")
                }
            }
            else {
                sendMessage(message.channel.id, `Wrong channel! Use the correct channel for this command!`).then(sent => {
                    setTimeout(() => {
                        sent.delete().catch(err => { })
                    }, 60000);
                })
                message.react("🤫")
                setTimeout(() => {
                    message.delete().catch(err => { })
                }, 30000);
            }
        }
        else {
            sendMessage(message.channel.id, `You do not have permission to use this command!`).then(sent => {
                setTimeout(() => {
                    sent.delete().catch(err => { })
                }, 60000);
            })
            message.react("🔒")
        }
    }
}

//Append new arguments to thsi array. DO NOT declare arguments locally. The argument classes are not exported for a reason.
const allArguments = {
    "corpnameArgument": new partofStringArgument("corpname", 0, [Corpnames.map(thiscorp => thiscorp.name), Corpnames.map(thiscorp => thiscorp.shortname)]),
    "wstypeArgument": new partofStringArgument("wstype", 0, [wsTypes.map(thistype => thistype.name), wsTypes.map(thistype => thistype.shortname)]),
    "wssizeArgument": new specificNumberArgument("size", 0, [5, 10, 15]),
    "membersArgument": new textArgument("members", 2),
    "shipcountArgument": new numberArgument("shipcount", 0, 1, Infinity),
    "destinylevelsArgument": new csvArgument("destinyLevels", 0, 1, 12),
    "blastlevelsArgument": new csvArgument("blastLevels", 0, 0, 12),
    "arealevelsArgument": new csvArgument("areaLevels", 0, 0, 12),
    "relicsArgument": new numberArgument("reliccount", 0, 1, Infinity),
    "dispatchlevelArgument": new numberArgument("dispatchLevel", 0, 1, 10),
    "twlevelArgument": new numberArgument("twLevel", 0, 0, 12),
    "memberArgument": new textArgument("member", 0),
    "plaintextArgument": new textArgument("text", 2),
    "runidArgument": new numberArgument("runID", 0, 0, Infinity),
    "roleArgument": new textArgument("role", 0),
    "rolesArgument": new textArgument("roles", 2),
    "optmemberArgument": new textArgument("member", 1),
    "rslevelArgument": new specificNumberArgument("rslevel", 0, rslevels),
    "pastdaysArgument": new numberArgument("pastDays", 0, 0, Infinity),
    "commandArgument": new textArgument("command(s)", 3),
    "rsmodArgument": new textArgument("module", 0),
    "memberidArgument": new textArgument("memberID", 0),
    "rslevelor0Argument": new specificNumberArgument("rslevel", 0, rslevels.concat(0)),
    "searchstringArgument": new textArgument("searchstring", 0),
    "corpArgument": new textArgument("corp", 2),
    "nicknameArgument": new textArgument("nickname", 2),
    "emojiArgument": new regexpArgument("emoji", 0, /<a?:.+:(\d+)>/),
    "messagecountArgument": new numberArgument("messagecount", 0, 1, 100)
}

export {
    allArguments,
    commandGroup,
    command
}