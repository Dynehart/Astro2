import { Message } from "discord.js"
import { prefix } from "../../config/config.js"
import { getAllCommands, sendMessage } from "../bot.js"
import { commandGroup, command, allArguments } from "./command.js"
import { hasdefaultPerms } from "./user.js"

const bottomText = `\nType \`${prefix}help <command>\` for more information about a command or command group`

function initHelp(BaseCommandGroup: commandGroup) {
    const help = new command("help", ["h", "?"], [allArguments.commandArgument], "Displays help information related to commands or command groups", helpExec, [], hasdefaultPerms, true, true)

    BaseCommandGroup.addsubcommand(help)

    return BaseCommandGroup
}

function helpExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    const baseCommandGroup = getAllCommands()
    if (args.length === 0) {
        let content = "This is the List of all Commands:\n\n```"
        content += baseCommandGroup.gethelp()
        content += "```"
        content += bottomText
        sendMessage(message.channel.id, content)
    }
    else {
        gethelp(args, baseCommandGroup, message.channel.id, "", true)
    }
}

function gethelp(args: { lowercase: string, original: string }[], currentGroup: commandGroup, channelID: string, origin: string, initial: boolean) {
    let space = " "
    if (initial) space = ""
    if (args.length === 1) {
        let subcommand = currentGroup.getsubcommand(args[0].lowercase)
        if (subcommand === null) {
            let subcommandgroup = currentGroup.getsubcommandgroup(args[0].lowercase)
            if (subcommandgroup === null) {
                if (!initial) {
                    sendMessage(channelID, `Command group \`${origin}${currentGroup.name}\` does not have a subcommand \`${args[0].lowercase}\`.`)
                }
                else {
                    sendMessage(channelID, `There is no command \`${args[0].lowercase}\`.`)
                }
            }
            else {
                let content = `${subcommandgroup.name}\n\n\`\`\`Commands:`
                content += subcommandgroup.gethelp()
                content += "```"
                content += bottomText
                sendMessage(channelID, content)
            }
        }
        else {
            sendMessage(channelID, `${origin}${currentGroup.name}${space}${subcommand.name}: \`${prefix}${origin}${currentGroup.name}${space}${subcommand.usage}\`\n\n${subcommand.helpText}`)
        }
    }
    else {
        let subcommandgroup = currentGroup.getsubcommandgroup(args[0].lowercase)
        if (subcommandgroup === null) {
            if (!initial) {
                sendMessage(channelID, `Command group \`${origin}${currentGroup.name}\` does not have a subcommandgroup \`${args[0].lowercase}\`.`)
            }
            else {
                sendMessage(channelID, `There is no commandgroup \`${args[0].lowercase}\`.`)
            }
        }
        else {
            gethelp(args.slice(1), subcommandgroup, channelID, `${origin}${currentGroup.name}${space}`, false)
        }
    }
}

export {
    initHelp
}