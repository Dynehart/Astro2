import { Message } from "discord.js"
import { sendMessage } from "../bot.js"
import { channel } from "node:diagnostics_channel"

async function autoresponsecheck(message: Message, d: number, args: string[]) {
    if (message.content.toLowerCase().includes("pineapple") && message.content.toLowerCase().includes("pizza")) {
        await sendMessage(message.channel.id, "Someone said pineapple pizza!")
        sendMessage(message.channel.id, "https://cdn.discordapp.com/attachments/606736666157383711/1009129147815178351/IMG_6212.jpg")
    }
    if (message.content.toLowerCase().includes('skillissue')) {
        sendMessage(message.channel.id, "https://media.discordapp.net/attachments/780173035042373663/1083389158367711302/yqkbgcpftpma1.jpg")
    }
    if(message.content.startsWith(".fuckthis")) {
        sendMessage(message.channel.id, "https://tenor.com/view/sml-chef-pee-pee-mallet-smash-smashing-food-gif-26137478")
    }
}

export {
    autoresponsecheck
}