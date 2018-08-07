const moment = require('moment')

async function waitMilliseconds(ms) {
    await new Promise(resolve => setTimeout(resolve, ms))
}

function getUnixTimestamp() {
    const time = moment().unix()
    return time
}

function getDateTime() {
    return new Date()
}

module.exports = {
    waitMilliseconds,
    getUnixTimestamp,
    getDateTime
};