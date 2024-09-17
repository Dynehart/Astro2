function getFormattedDeltaTime(date1: number, date2: number) {
    const relativeSeconds = Math.floor(Math.abs((date1 - date2) / 1000))
    if (relativeSeconds === 0) {
        return "0s"
    }
    else {
        const relativeMinutes = Math.floor(relativeSeconds / 60)
        const relativeHours = Math.floor(relativeMinutes / 60)
        const relativeDays = Math.floor(relativeHours / 24)
        let timestr = ""
        if (relativeDays !== 0) {
            timestr += `${relativeDays}d`
        }
        if (relativeHours % 24 !== 0) {
            timestr += `${relativeHours % 24}h`
        }
        if (relativeMinutes % 60 !== 0) {
            timestr += `${relativeMinutes % 60}m`
        }
        if (relativeSeconds % 60 !== 0) {
            timestr += `${relativeSeconds % 60}s`
        }
        return timestr
    }
}

function getTimestampFromFormattedTime(formattedTime: string) {
    //the formattedTime string is in the format XXdXXhXXmXXs. The timestamp is in the format of ms.
    let timestamp = 0
    const daysIndex = formattedTime.search("d")
    if (daysIndex !== -1) {
        timestamp += parseInt(formattedTime.slice(0, daysIndex)) * 86400000
        formattedTime = formattedTime.slice(daysIndex + 1)
    }
    const hoursIndex = formattedTime.search("h")
    if (hoursIndex !== -1) {
        timestamp += parseInt(formattedTime.slice(0, hoursIndex)) * 3600000
        formattedTime = formattedTime.slice(hoursIndex + 1)
    }
    const minuteIndex = formattedTime.search("m")
    if (minuteIndex !== -1) {
        timestamp += parseInt(formattedTime.slice(0, minuteIndex)) * 60000
        formattedTime = formattedTime.slice(minuteIndex + 1)
    }
    const secondsIndex = formattedTime.search("s")
    if (secondsIndex !== -1) {
        timestamp += parseInt(formattedTime.slice(0, secondsIndex)) * 1000
    }
    return timestamp
}

function removeMarkdownFormatting(input: String) {
    return input
        // Remove code blocks (e.g., ```code```)
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code (e.g., `code`)
        .replace(/`(.*?)`/g, '$1')
        // Remove links but keep the text (e.g., [text](url))
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images but keep the alt text (e.g., ![alt](url))
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove bold (e.g., **bold** or __bold__)
        .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '$1$2')
        // Remove italic (e.g., *italic* or _italic_)
        .replace(/\*(.*?)\*|_(.*?)_/g, '$1$2')
        // Remove strikethrough (e.g., ~~strike~~)
        .replace(/~~(.*?)~~/g, '$1')
        // Remove blockquotes (e.g., > quote)
        .replace(/^\s*>+\s?/gm, '')
        // Remove unordered lists (e.g., - item, * item)
        .replace(/^\s*[-*+]\s+/gm, '')
        // Remove ordered lists (e.g., 1. item)
        .replace(/^\s*\d+\.\s+/gm, '')
        // Remove headers (e.g., # Header)
        .replace(/^#+\s+/gm, '')
        // Remove horizontal rules (e.g., --- or ***)
        .replace(/^\s*[-*_]{3,}\s*$/gm, '')
        // Remove extra spaces and newlines
        .replace(/\n{2,}/g, '\n').trim()
}

function boolToInt(i: boolean) {
    if (i) return 1
    else return 0
}

function getDark(dark: boolean) {
    if (dark) return "dark"
    else return "regular"
}
function getD(dark: boolean) {
    if (dark) return "D"
    else return ""
}

export {
    getFormattedDeltaTime,
    getTimestampFromFormattedTime,
    boolToInt,
    getD,
    getDark,
    removeMarkdownFormatting
}