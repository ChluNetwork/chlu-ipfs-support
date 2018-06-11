const log = require('./log')
const CID = require('cids')
const { dagGetResultToObject, isCID } = require('./ipfs')
const ChluDID = require('chlu-did/src')

class ChluIPFSDID {
    constructor(ipfs, db) {
        this.ipfs = ipfs
        this.db = db
        this.chluDID = new ChluDID()
    }

    async getDDOFromDID(didId) {
        const cid = await this.getDIDAddress(didId)
        const reputationMultihash = await this.db.get(cid);
        if (!reputationMultihash) {
            throw new Error('DDO Not found. If it was just created, try again in a while')
        }
        log('Retrieving DDO at', reputationMultihash, ' from IPFS...')
        const reputationDag = await this.ipfs.dag.get(reputationMultihash)
        const data = await this.resolveDDOLinks(dagGetResultToObject(reputationDag))
        log('Retrieved DDO for DID at', cid, 'resolved to DDO address', reputationMultihash, 'resolved to data', data)
        return data
    }

    async resolveDDOLinks(rep) {
        if (rep.did && rep.did['/']) {
            rep.did = await this.getDIDFromAddress(rep.did['/'])
        }
        if (Array.isArray(rep.reviews)) {
            rep.reviews = rep.reviews.map(r => {
                if (r.did && r.did['/']) {
                    r.did['/'] = (new CID(r.did['/'])).toBaseEncodedString()
                }
                return r
            })
        }
        return rep
    }

    async getDIDAddress(didId) {
        let didAddress = null
        if (didId && didId.indexOf('did:chlu:') === 0) {
            log('DID ID is a DID UUID', didId)
            didAddress = await this.db.get(didId)
            log('DID UUID', didId, 'resolved to Address', didAddress)
        } else if (isCID(didId)) {
            log('DID ID is a DID IPFS Address', didId)
            didAddress = didId
        } else {
            throw new Error('Invalid DID ID ' + didId)
        }
        return didAddress
    }

    async getDID(didId){
        log('Getting DID using ID', didId)
        const didAddress = await this.getDIDAddress(didId)
        if (isCID(didAddress)) {
            return await this.getDIDFromAddress(didAddress)
        } else {
            throw new Error('Could not find DID Address for ' + didId)
        }
    }

    async getDIDList() {
        return Object.keys(this.db._index._index)
            .filter(x => x.indexOf('did:') === 0)
    }

    async getDIDFromAddress(cid) {
        log('Getting DID at', cid)
        const result = await this.ipfs.dag.get(cid)
        return dagGetResultToObject(result)
    }

    async verifyUsingDID(didId, nonce, signature) {
        const did = await this.getDID(didId)
        if (did) {
            return this.chluDID.verify(did, nonce, signature)
        } else {
            throw new Error('Could not find Public Key in DID ' + didId)
        }
    }

    async storeReputation(didDocument, reputation) {

    }
}

module.exports = ChluIPFSDID