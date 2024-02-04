import { ChannelType, Colors, Message } from "discord.js";
import { command, allArguments, commandGroup } from "./command.js";
import { hasCoordPerms, hasdefaultPerms } from "./user.js";
import { getmember, playerInputChoice, sendMessage } from "../bot.js";


function initmisc(BaseCommandGroup: commandGroup) {
    const sfa = new command("sfa", [], [], "Displays information about the Spacefleet Alliance", sfaExec, [], hasdefaultPerms, true, true)
    const emoji = new command("emoji", ["emote"], [allArguments.emojiArgument], "Displays a Emoji in full Size", emojiExec, [], hasdefaultPerms, false, false)
    const tidy = new command("tidy", [], [allArguments.messagecountArgument, allArguments.optmemberArgument], "Cleans a channel of up to 100 messages, optionally only removing those from a specified Member.", tidyExec, [], hasCoordPerms, true, true)

    BaseCommandGroup.addsubcommand(sfa)
    BaseCommandGroup.addsubcommand(emoji)
    BaseCommandGroup.addsubcommand(tidy)

    return BaseCommandGroup
}

function sfaExec(args: string[], message: Message, d: number) {
    sendMessage(message.channel.id, "https://cdn.discordapp.com/attachments/588359525376196627/1187103801115685015/SFA_corp_list.png?ex=6595ab91&is=65833691&hm=45670c20032501b7101258d0704d68286d323dd228fbef71e23ff7fb5538022e&")
}
function emojiExec(args: string[], message: Message, d: number) {
    const emoteRegex = /<:.+:(\d+)>/gm
    const animatedEmoteRegex = /<a:.+:(\d+)>/gm
    let emoji = emoteRegex.exec(message.content)
    let animatedemoji = animatedEmoteRegex.exec(message.content)
    if (emoji !== null) {
        const url = "https://cdn.discordapp.com/emojis/" + emoji[1] + ".png?v=1"
        sendMessage(message.channel.id, url)
    }
    else if (animatedemoji !== null) {
        const url = "https://cdn.discordapp.com/emojis/" + animatedemoji[1] + ".gif?v=1"
        sendMessage(message.channel.id, url)
    }
    else {
        sendMessage(message.channel.id, "Couldn't find an emoji!")
    }
}
async function tidyExec(args: string[], message: Message, d: number) {
    if (message.channel.type === ChannelType.GuildText) {
        if (args.length === 2) {
            const member = await getmember(message.channel.id, args[1], message.member.id, false)
            if (member !== null) {
                let messages = await message.channel.messages.fetch({ limit: parseInt(args[0]), before: message.id })
                let filteredmessages: Message[] = []
                messages.forEach(msg => {
                    if (msg.member.id === member.id) filteredmessages.push(msg)
                })
                if (filteredmessages.length !== 0) {
                    playerInputChoice(message.channel.id, message.member.id, ["YES", "NO"], "YES/NO", "Tidy Channel", Colors.Red, `Are you sure you want to delete ${filteredmessages.length} messages by ${member.displayName}?`)
                        .then(choice => {
                            handleChoice(choice, filteredmessages);
                        })
                        .catch(() => { })
                }
                else {
                    sendMessage(message.channel.id, `I searched ${parseInt(args[0])} messages, but I couldn't find any written by ${member.displayName}`)
                }
            }
        }
        else {
            let messages = await message.channel.messages.fetch({ limit: parseInt(args[0]), before: message.id })
            let filteredmessages = messages.map(a => a)
            playerInputChoice(message.channel.id, message.member.id, ["YES", "NO"], "YES/NO", "Tidy Channel", Colors.Red, `Are you sure you want to delete ${filteredmessages.length} messages?`)
                .then(choice => {
                    handleChoice(choice, filteredmessages);
                })
                .catch(() => { })
        }
    }
    function handleChoice(choice: number, filteredmessages: Message<boolean>[]) {
        if (choice === 0) {
            filteredmessages.forEach(msg => msg.delete());
            sendMessage(message.channel.id, `Successfully deleted ${filteredmessages.length} messages!`)
                .then(sent => {
                    setTimeout(() => {
                        sent.delete()
                    }, 5000);
                })
        }
        else {
            sendMessage(message.channel.id, `Aborted deletion of ${filteredmessages.length} messages.`)
                .then(sent => {
                    setTimeout(() => {
                        sent.delete()
                    }, 5000);
                })
        }
    }
}

export {
    initmisc
}