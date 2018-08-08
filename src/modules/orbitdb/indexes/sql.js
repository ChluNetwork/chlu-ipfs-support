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
        this.chluIpfs.logger.debug('ChluDB SQL Index: starting ...')
        const options = defaults(this.options || {}, {
            host: 'localhost',
            port: null, // dialect default
            logging: false, // TODO: set up logger to use chluIpfs logger
            database: 'chlu',
            username: 'chlu',
            password: 'chlu',
            storage: path.join(this.chluIpfs.directory, 'db.sqlite'),
            dialect: 'sqlite',
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
        })
        this.sequelize = new Sequelize(Object.assign({}, options, {
            operatorsAliases: false
        }))
        const destination = options.dialect === 'sqlite' ? options.storage : options.host
        this.chluIpfs.logger.debug(`ChluDB SQL Index: connection to ${options.dialect} at ${destination} => ...`)
        await this.sequelize.authenticate()
        this.chluIpfs.logger.debug(`ChluDB SQL Index: connection to ${options.dialect} at ${destination} => OK`)
        this.chluIpfs.logger.debug('ChluDB SQL Index: setting up DB ...')
        // TODO: Chlu network namespace!
        this.ReviewRecord = this.sequelize.define('reviewrecord', {
            data: Sequelize.JSONB,
            latestVersion: Sequelize.STRING,
            bitcoinTransactionHash: Sequelize.STRING
        })
        this.DID = this.sequelize.define('did', {
            publicDidDocument: Sequelize.JSONB,
            didDocumentMultihash: Sequelize.STRING,
            previousVersions: Sequelize.JSONB
        })
        await this.sequelize.sync()
        this.chluIpfs.logger.debug('ChluDB SQL Index: Ready')
    }

    async clear() {
        this.chluIpfs.logger.debug('ChluDB SQL Index: Clearing')
        const rrsDeleted = await this.ReviewRecord.destroy({ truncate: true })
        this.chluIpfs.logger.debug(`ChluDB SQL Index: Deleted ${rrsDeleted} RR rows`)
        const didsDeleted = await this.DID.destroy({ truncate: true })
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
        // TODO: implementation
        if (multihash !== data.multihash) throw new Error('Multihash mismatch')
        const { alreadyExisting } = await this._saveReviewRecord(data, multihash, bitcoinTransactionHash)
        if (!alreadyExisting) {
            let previousFixed = false
            // Fix history by setting last review record
            for (const item of data.history) {
                if (get(item, 'multihash', null)) {
                    await this._updateLatestVersion(item.multihash, multihash)
                    if (item.multihash === data.previous_version_multihash) previousFixed = true
                } else {
                    this.chluIpfs.logger.warn(`OrbitDB SQL Index: Malformed History for ${multihash}`)
                }
            }
            if (!previousFixed && data.previous_version_multihash) {
                await this._updateLatestVersion(data.previous_version_multihash, multihash)
            }
        }
    }

    async _saveReviewRecord(data, latestVersion, bitcoinTransactionHash) {
        let alreadyExisting = true
        let entity = await this._readReviewRecord(data.multihash)
        if (!entity) {
            alreadyExisting = false
            // TODO: workaround so I can query for RRs with a null previous_version_multihash
            if (isEmpty(data.previous_version_multihash)) data.previous_version_multihash = null
            entity = await this.ReviewRecord.create({
                data,
                latestVersion,
                bitcoinTransactionHash,
            })
        } else {
            entity.data = data
            entity.latestVersion = (await this.getLatestReviewRecordUpdate(latestVersion)).multihash
            if (!entity.bitcoinTransactionHash) {
                // Prevent attack by not overwriting it if it was already set
                // the first one has to be the right one
                entity.bitcoinTransactionHash = bitcoinTransactionHash 
            }
            await entity.save()
        }
        return { entity, alreadyExisting }
    }

    async _updateLatestVersion(multihash, latestVersion) {
        let entity = await this._readReviewRecord(multihash)
        if (!entity) {
            entity = await this.ReviewRecord.create({
                data: { multihash },
                latestVersion,
                bitcoinTransactionHash: null
            })
        } else {
            entity.latestVersion = latestVersion
            await entity.save()
        }
    }

    async _readReviewRecord(multihash) {
        return await this.ReviewRecord.findOne({
            where: {
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
        return { multihash: entity ? entity.latestVersion : multihash }
    }

    async _getOriginalReviewRecord(multihash) {
        const entity = await this._readReviewRecord(multihash)
        if (get(entity, 'data.history.length', 0) > 0) {
            return { multihash: entity.data.history[entity.data.history.length-1].multihash }
        }
        return { multihash }
    }

    async _getReviewRecordMetadata(multihash) {
        const entity = await this._readReviewRecord(multihash)
        if (entity) {
            return Object.assign({
                bitcoinTransactionHash: entity.bitcoinTransactionHash
            }, entity.data.metadata)
        }
        return null
    }

    async _getReviewRecordList(offset = 0, limit = 0) {
        const array = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                'data.previous_version_multihash': {
                    [Sequelize.Op.eq]: null
                }
            }
        }) 
        return array.map(v => ({ multihash: v.data.multihash, reviewRecord: v.data }))
    }

    async _getReviewRecordCount() {
        // TODO: implementation
        return await this.ReviewRecord.count({
            where: {
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
                'publicDidDocument.id': {
                    [Sequelize.Op.eq]: didId
                }
            }
        })
        return entity
    }

    async _getReviewsAboutDID(didId, offset, limit) {
        const array = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                [Sequelize.Op.and]: [
                    {
                        'data.previous_version_multihash': {
                            [Sequelize.Op.eq]: null
                        }
                    },
                    { 
                        [Sequelize.Op.or]: [
                            { 'data.popr.vendor_did': { [Sequelize.Op.eq]: didId } },
                            { 'data.subject.did': { [Sequelize.Op.eq]: didId } },
                        ]
                    }
                ]
            }
        }) 
        return array.map(v => ({ multihash: v.data.multihash, reviewRecord: v.data }))
    }

    async _getReviewsWrittenByDID(didId, offset, limit) {
        const array = await this.ReviewRecord.findAll({
            offset: offset > 0 ? offset : undefined,
            limit: limit > 0 ? limit : undefined,
            order: [ ['createdAt', 'DESC'] ],
            where: {
                [Sequelize.Op.and]: [
                    {
                        'data.previous_version_multihash': {
                            [Sequelize.Op.eq]: null
                        }
                    },
                    { 
                        [Sequelize.Op.or]: [
                            { 'data.customer_signature.creator': { [Sequelize.Op.eq]: didId } }
                        ]
                    }
                ]
            }
        }) 
        return array.map(v => ({ multihash: v.data.multihash, reviewRecord: v.data }))
    }

}

module.exports = ChluSQLIndex;
