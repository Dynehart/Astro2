import { EmbedBuilder, GuildMember, Message } from "discord.js";
import { botchannels } from "../../config/config.js";
import { getmember, sendEmbed, sendMessage } from "../bot.js";
import { command, allArguments, commandGroup } from "./command.js";
import { queryDB } from "./DB.js";
import { hasdefaultPerms } from "./user.js";


function initstats(BaseCommandGroup: commandGroup) {
    const statsrs = new command("redstar", ["rs"], [allArguments.optmemberArgument], "Gets the RS stats of a specified User. If no User is specified, gets your own RS stats.", statsrsExec, [botchannels], hasdefaultPerms, true, false)
    const statstoprs = new command("toprs", [], [allArguments.rslevelor0Argument, allArguments.pastdaysArgument], "Get the top RS runners in a specified RS level and timeframe. Use `0` for all time and all levels.", statstoprsExec, [botchannels], hasdefaultPerms, true, false)
    const stats = new commandGroup("stats", ["stat"], [], [statsrs, statstoprs], "Command group for managing reports", false)

    BaseCommandGroup.addsubcommandgroup(stats)

    return BaseCommandGroup
}

function statsrsExec(args: string[], message: Message, d: number) {
    if (args.length === 0) {
        sendRSstats(d, message.member, message.channel.id);
    }
    else if (args.length === 1) {
        getmember(message.channel.id, args[0], message.member.id, false)
            .then(async member => {
                if (member !== null) {
                    sendRSstats(d, member, message.channel.id);
                }
            })
    }
}
function statstoprsExec(args: string[], message: Message, d: number) {
    let timeframecheck = ""
    let runlevelcheck = ""
    const timeframeDays = parseInt(args[1])
    const rslevel = parseInt(args[0]) - 3
    if (rslevel + 3 !== 0) {
        runlevelcheck = `AND level = ${rslevel} `
    }
    if (timeframeDays !== 0) {
        timeframecheck = `AND runID >= '${d - timeframeDays * 86400000}' `
    }
    queryDB(`SELECT COUNT(playerID) AS runs, playerID FROM playerinrun WHERE isGuest = 0 ${runlevelcheck}${timeframecheck}GROUP BY playerID ORDER BY runs DESC LIMIT 10`)
        .then(toprunners => {           
            if (toprunners.length !== 0) {
                let content = "```Runs   Name\n-----------"
                let k = 0
                toprunners.forEach(async toprunner => {
                    let member = await getmember(message.channel.id, toprunner.playerID, message.author.id, true)
                    if (member !== null) {
                        content += `\n${toprunner.runs}${" ".repeat(7 - toprunner.runs.toString().length)}${member.displayName}`
                    }
                    else {
                        content += `\n${toprunner.runs}${" ".repeat(7 - toprunner.runs.toString().length)}Unknown Player`
                    }
                    k++
                    if (k === toprunners.length) {
                        content += "```"
                        let title = "Top Red Star runs for "
                        if (rslevel === - 3) {
                            title += "All levels - "
                        }
                        else {
                            title += `RS${rslevel + 3} - `
                        }
                        if (timeframeDays === 0) {
                            title += "All time"
                        }
                        else {
                            title += `Last ${timeframeDays} days`
                        }
                        let topRSembed = new EmbedBuilder
                        topRSembed.setTitle(title)
                            .setDescription(content)
                            .setTimestamp()
                        sendEmbed(message.channel.id, "", topRSembed)
                    }
                })
            }
            else {
                sendMessage(message.channel.id, `No RS runs on record in the last ${timeframeDays} days in RS level ${rslevel + 3}`)
            }
        })
}

async function sendRSstats(d: number, member: GuildMember, channelID: string) {
    const allruns = await queryDB(`SELECT COUNT(playerID) AS runs, level FROM playerinrun WHERE playerID = ${member.id} AND isGuest = 0 GROUP BY level ORDER BY level`);
    const lastweekruns = await queryDB(`SELECT COUNT(playerID) AS runs, level FROM playerinrun WHERE playerID = ${member.id} AND isGuest = 0 AND runID >= '${d - 604800000}' GROUP BY level ORDER BY level`);
    let content = `Red Star stats for ${member.displayName}\n\`\`\`Level  Total  7 days\n--------------------`;
    let total = 0;
    let lastWeekTotal = 0;
    for (let i = 0; i < allruns.length; i++) {
        content += `\n${allruns[i].level + 3}${" ".repeat(7 - (allruns[i].level + 3).toString().length)}${allruns[i].runs}`;
        const thisLevelLastWeek = lastweekruns.findIndex(thisrun => thisrun.level === allruns[i].level);
        content += `${" ".repeat(7 - allruns[i].runs.toString().length)}`
        if (thisLevelLastWeek !== -1) {
            content += `${lastweekruns[thisLevelLastWeek].runs}`;
            lastWeekTotal += lastweekruns[thisLevelLastWeek].runs;
        }
        else {
            content += "0"
        }
        total += allruns[i].runs;
    }
    content += `\nTotal  ${total}${" ".repeat(7 - total.toString().length)}${lastWeekTotal}\`\`\``;
    sendMessage(channelID, content);
}

export {
    initstats
}