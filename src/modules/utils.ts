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
        if(relativeDays !== 0) {
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

export {
    getFormattedDeltaTime,
    getTimestampFromFormattedTime
}