const moment = require('moment')

async function waitMilliseconds(ms) {
    await new Promise(resolve => setTimeout(resolve, ms))
}

function getUnixTimestamp() {
    const time = moment().unix()
    return time
}

module.exports = {
    waitMilliseconds,
    getUnixTimestamp
};