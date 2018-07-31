const protons = require('protons')
const sources = require('./sources')

class ChluProtobuf {
    constructor() {
        this.proto = protons(sources)
        this.ReviewRecord = this.proto.ReviewRecord
        this.PoPR = this.proto.PoPR
    }
}

module.exports = ChluProtobuf