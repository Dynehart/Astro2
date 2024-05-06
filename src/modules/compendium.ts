import { HSCAPIkey, logchannel } from "../../config/config.js"
import https from 'node:https'
import { sendMessage } from "../bot.js";
global.ReadableStream = require('web-streams-polyfill').ReadableStream;

async function getPlayerModuleData(playerID: string) {
    return new Promise<any>((resolve, reject) => {
        https.get(`https://bot.hs-compendium.com/compendium/api/tech?token=${HSCAPIkey}&userid=${playerID}`, res => {
            let data = [];
            res.on('data', chunk => {
                data.push(chunk);
            });
            res.on('end', () => {
                const response = JSON.parse(Buffer.concat(data).toString());
                if (res.statusCode === 200) {
                    resolve(response.map)
                }
                else {
                    if (response.type === 2 || response.type === 3) {
                        resolve(null)
                    }
                    else {
                        sendMessage(logchannel, "HSC API connection failure! Check the logs.")
                        console.error(response)
                        reject()
                    }
                }
            });
        }).on('error', err => {
            sendMessage(logchannel, "HSC API connection failure! Check the logs.")
            console.error(err)
            reject()
        });
    })
}

export {
    getPlayerModuleData
}

//getPlayerModuleData(message.member.id)