const proto = require('./compiled/reviewrecord_pb')

class ChluProtobuf {
    constructor() {
        this.ReviewRecord = {
            encode: encoder(proto.ReviewRecord),
            decode: decoder(proto.ReviewRecord)
        }
        this.PoPR = {
            encode: encoder(proto.PoPR),
            decoder: decoder(proto.PoPR)
        }
    }
}

function encoder(proto) {
    return data => {
        console.log(data)
        const obj = new proto(data)
        const array = obj.serializeBinary() // Uint8Array
        return Buffer.from(array)
    }
}

function decoder(proto) {
    return data => {
        const obj = proto.deserializeBinary(data)
        const res = obj.toObject()
        console.log(res)
    }
}

function uint16ArrayToUint8Array(input) {
    const output = new Uint8Array()
    for (let i = 0; i < input.length; i++) {
        output.push(input[i] & 0xff)
        output.push(input[i] >> 8)
    }
    return output
}

module.exports = ChluProtobuf