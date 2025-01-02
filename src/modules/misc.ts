import { ChannelType, Colors, Message } from "discord.js";
import { command, allArguments, commandGroup } from "./command.js";
import { hasCoordPerms, hasdefaultPerms, hasDevPerms } from "./user.js";
import { fetchMember, getmember, playerInputChoice, sendMessage } from "../bot.js";
import { queryDB } from "./DB.js";


function initmisc(BaseCommandGroup: commandGroup) {
    const sfa = new command("sfa", [], [], "Displays information about the Spacefleet Alliance", sfaExec, [], hasdefaultPerms, true, true)
    const emoji = new command("emoji", ["emote"], [allArguments.emojiArgument], "Displays a Emoji in full Size", emojiExec, [], hasdefaultPerms, false, false)
    const tidy = new command("tidy", [], [allArguments.messagecountArgument, allArguments.optmemberArgument], "Cleans a channel of up to 100 messages, optionally only removing those from a specified Member.", tidyExec, [], hasCoordPerms, true, true)
    const purgeDB = new command("purgeDB", [], [], "None of your business", purgeDBExec, [], hasDevPerms, false, true)

    BaseCommandGroup.addsubcommand(sfa)
    BaseCommandGroup.addsubcommand(emoji)
    BaseCommandGroup.addsubcommand(tidy)
    BaseCommandGroup.addsubcommand(purgeDB)

    return BaseCommandGroup
}

function sfaExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    sendMessage(message.channel.id, "https://cdn.discordapp.com/attachments/588359525376196627/1187103801115685015/SFA_corp_list.png?ex=6595ab91&is=65833691&hm=45670c20032501b7101258d0704d68286d323dd228fbef71e23ff7fb5538022e&")
}
function emojiExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
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
async function tidyExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    if (message.channel.type === ChannelType.GuildText) {
        if (args.length === 2) {
            const member = await getmember(message.channel.id, args[1].lowercase, message.member.id, false)
            if (member !== null) {
                let messages = await message.channel.messages.fetch({ limit: parseInt(args[0].lowercase), before: message.id })
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
                    sendMessage(message.channel.id, `I searched ${parseInt(args[0].lowercase)} messages, but I couldn't find any written by ${member.displayName}`)
                }
            }
        }
        else {
            let messages = await message.channel.messages.fetch({ limit: parseInt(args[0].lowercase), before: message.id })
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
function purgeDBExec(args: { lowercase: string, original: string }[], message: Message, d: number) {
    queryDB("SELECT playerID FROM playerinrun GROUP BY playerID")
        .then(IDs => {
            let k = 0
            let invalids: string[] = []
            IDs.forEach(async playerID => {
                await fetchMember(playerID.playerID)
                    .catch(err => {
                        invalids.push(playerID.playerID)
                    })
                k++
                if (k === IDs.length) {
                    playerInputChoice(message.channel.id, message.author.id, ["Yes", "No"], "Purge Database?", `Database Purge`, Colors.DarkRed, `${invalids.length}/${k} invalid player IDs detected. Continue with the purge?`)
                        .then(result => {
                            if (result === 0) {
                                invalids.forEach(invalidID => {
                                    queryDB(`DELETE FROM playerinrun WHERE playerID = ${invalidID}`)
                                })
                            }
                            else {
                                sendMessage(message.channel.id, "Database Purge cancelled.")
                            }
                        })
                }
            })
        })
        .catch(() => { })
}

export {
    initmisc
}