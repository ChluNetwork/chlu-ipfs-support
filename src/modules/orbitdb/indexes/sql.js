const ChluAbstractIndex = require('./abstract');
const path = require('path')
const { get, defaults, isEmpty } = require('lodash')
const Sequelize = require('sequelize')

const version = 1;

class ChluSQLIndex extends ChluAbstractIndex {
    constructor(){
        super(version);
    }

    async start() {
        await super.start()
        this.chluIpfs.logger.debug('ChluDB SQL Index: starting ...')
        const options = defaults(this.options || {}, {
            host: 'localhost',
            port: null, // dialect default
            logging: (...args) => this.chluIpfs.logger.debug(`[SQL] ${args.join(' ')}`),
            database: 'chlu',
            username: 'chlu',
            password: 'chlu',
            storage: path.join(this.chluIpfs.directory, 'db.sqlite'),
            dialect: 'sqlite',
            pool: {
                // TODO: review these settings, choose appropriate defaults.
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
        })
        this.sequelize = new Sequelize(Object.assign({}, options, {
            operatorsAliases: false // important security setting
        }))
        const destination = options.dialect === 'sqlite' ? options.storage : options.host
        this.chluIpfs.logger.debug(`ChluDB SQL Index: connection to ${options.dialect} at ${destination} => ...`)
        await this.sequelize.authenticate() // this tests the connection
        this.chluIpfs.logger.debug(`ChluDB SQL Index: connection to ${options.dialect} at ${destination} => OK`)
        this.chluIpfs.logger.debug('ChluDB SQL Index: Defining Models')
        this.ReviewRecord = this.sequelize.define('reviewrecord', {
            data: Sequelize.JSONB,
            latestVersionData: Sequelize.JSONB,
            bitcoinTransactionHash: Sequelize.STRING,
            chluNetwork: Sequelize.STRING
        })
        this.DID = this.sequelize.define('did', {
            publicDidDocument: Sequelize.JSONB,
            didDocumentMultihash: Sequelize.STRING,
            previousVersions: Sequelize.JSONB,
            chluNetwork: Sequelize.STRING
        })
        this.chluIpfs.logger.debug('ChluDB SQL Index: Syncing => ...')
        await this.sequelize.sync()
        this.chluIpfs.logger.debug('ChluDB SQL Index: Syncing => OK, READY')
    }

    async clear() {
        this.chluIpfs.logger.debug('ChluDB SQL Index: Clearing')
        const rrsDeleted = await this.ReviewRecord.destroy({
            where: {
                chluNetwork: this.chluIpfs.network
            }
        })
        this.chluIpfs.logger.debug(`ChluDB SQL Index: Deleted ${rrsDeleted} RR rows`)
        const didsDeleted = await this.DID.destroy({
            where: {
                chluNetwork: this.chluIpfs.network
            }
        })
        this.chluIpfs.logger.debug(`ChluDB SQL Index: Deleted ${didsDeleted} DID rows`)
        this.chluIpfs.logger.debug('ChluDB SQL Index: Cleared')
    }

    async stop() {
        this.chluIpfs.logger.debug('ChluDB SQL Index: Closing ...')
        if (this.options.deleteOnClose) {
            this.chluIpfs.logger.debug('ChluDB SQL Index: Deleting all data (delete on close: true)')
            await this.clear()
        }
        if (this.sequelize) {
            await this.sequelize.close()
        }
        this.chluIpfs.logger.debug('ChluDB SQL Index: Closed')
    }

    async _addReviewRecord({ multihash, reviewRecord: data, bitcoinTransactionHash }) {
        // TODO: investigate wether this process should be a DB transaction
        if (multihash !== data.multihash) throw new Error('Multihash mismatch')
        const { alreadyExisting } = await this._saveReviewRecord(data, bitcoinTransactionHash)
        if (!alreadyExisting) {
            let previousFixed = false
            // Fix history by setting last review record
            for (const item of data.history) {
                if (get(item, 'multihash', null)) {
                    await this._updateLatestVersion(item.multihash, data)
                    if (item.multihash === data.previous_version_multihash) previousFixed = true
                } else {
                    this.chluIpfs.logger.warn(`OrbitDB SQL Index: Malformed History for ${multihash}`)
                }
            }
            if (!previousFixed && data.previous_version_multihash) {
                await this._updateLatestVersion(data.previous_version_multihash, data)
            }
        }
    }

    async _saveReviewRecord(data, bitcoinTransactionHash) {
        let alreadyExisting = true
        let entity = await this._readReviewRecord(data.multihash)
        if (!entity) {
            alreadyExisting = false
            // TODO: workaround so I can query for RRs with a null previous_version_multihash
            if (isEmpty(data.previous_version_multihash)) data.previous_version_multihash = null
            entity = await this.ReviewRecord.create({
                chluNetwork: this.chluIpfs.network,
                data,
                latestVersionData: null,
                bitcoinTransactionHash,
            })
        }
        return { entity, alreadyExisting }
    }

    async _updateLatestVersion(multihash, latestVersionData) {
        let entity = await this._readReviewRecord(multihash)
        if (!entity) {
            entity = await this.ReviewRecord.create({
                chluNetwork: this.chluIpfs.network,
                data: { multihash },
                latestVersionData,
                bitcoinTransactionHash: null
            })
        } else {
            entity.latestVersionData = latestVersionData
            await entity.save()
        }
    }

    async _readReviewRecord(multihash) {
        return await this.ReviewRecord.findOne({
            where: {
                chluNetwork: this.chluIpfs.network,
                data: {
                    multihash: {
                        [Sequelize.Op.eq]: multihash
                    }
                }
            }
        }) 
    }

    async _getLatestReviewRecordUpdate(multihash) {
        const entity = await this._readReviewRecord(multihash)
        return {
            multihash: get(entity, 'latestVersionData.multihash', multihash),
            reviewRecord: get(entity, 'latestVersionData', get(entity, 'data', null))
        }
    }

    async _getOriginalReviewRecord(multihash) {
        const entity = await this._readReviewRecord(multihash)
        if (get(entity, 'data.history.length', 0) > 0) {
            const item = entity.data.history[entity.data.history.length-1]
            return {
                multihash: get(item, 'multihash', null),
                reviewRecord: get(item, 'data', null)
            }
        }
        return { multihash }
    }

    async _getReviewRecordMetadata(multihash) {
        const entity = await this._readReviewRecord(multihash)
        if (entity) {
            const metadata = Object.assign({
                bitcoinTransactionHash: entity.bitcoinTransactionHash
            }, entity.data.metadata)
            return formatReviewRecords([entity]).map(x => {
                x.metadata = metadata
                return x
            })
        }
        return { metadata: null, multihash } 
    }

    async _getReviewRecordList(offset = 0, limit = 0) {
        const list = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                chluNetwork: this.chluIpfs.network,
                'data.previous_version_multihash': {
                    [Sequelize.Op.eq]: null
                }
            }
        }) 
        return formatReviewRecords(list)
    }

    async _getReviewRecordCount() {
        // TODO: implementation
        return await this.ReviewRecord.count({
            where: {
                chluNetwork: this.chluIpfs.network,
                'data.previous_version_multihash': {
                    [Sequelize.Op.eq]: null
                }
            }
        })
    }

    async _putDID(publicDidDocument, didDocumentMultihash) {
        let entity = await this._readDID(publicDidDocument.id)
        if (!entity) {
            entity = await this.DID.create({
                chluNetwork: this.chluIpfs.network,
                publicDidDocument,
                didDocumentMultihash,
                previousVersions: []
            })
        } else {
            if (entity.previousVersions.indexOf(didDocumentMultihash) >= 0) {
                this.chluIpfs.logger.debug('Not updating DID: existing data is newer')
            } else {
                entity.publicDidDocument = publicDidDocument
                entity.previousVersions = [entity.didDocumentMultihash.slice()].concat(entity.previousVersions.slice())
                entity.didDocumentMultihash = didDocumentMultihash
                await entity.save()
            }
        }
    }

    async _getDID(didId) {
        const entity = await this._readDID(didId)
        if (entity) {
            return {
                publicDidDocument: entity.publicDidDocument,
                multihash: entity.didDocumentMultihash,
                previousVersions: entity.previousVersions
            }
        } else {
            return {
                publicDidDocument: null,
                multihash: null,
                previousVersions: []
            }
        }
    }

    async _readDID(didId) {
        const entity = await this.DID.findOne({
            where: {
                chluNetwork: this.chluIpfs.network,
                'publicDidDocument.id': didId
            }
        })
        return entity
    }

    async _getReviewsAboutDID(didId, offset, limit) {
        const list = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                chluNetwork: this.chluIpfs.network,
                'data.previous_version_multihash': null,
                [Sequelize.Op.or]: [
                    { 'data.popr.vendor_did': didId },
                    { 'data.subject.did': didId },
                ]
            }
        }) 
        return formatReviewRecords(list)
    }

    async _getReviewsWrittenByDID(didId, offset, limit) {
        const list = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                chluNetwork: this.chluIpfs.network,
                'data.previous_version_multihash': null,
                'data.customer_signature.creator': didId
            }
        }) 
        return formatReviewRecords(list)
    }

}

function formatReviewRecords(list) {
    return list.map(v => ({
        multihash: get(v, 'data.multihash', null),
        reviewRecord: get(v, 'latestVersionData', get(v, 'data', null)),
        reviewRecordOriginal: get(v, 'data', null)
    }))
}

module.exports = ChluSQLIndex;
