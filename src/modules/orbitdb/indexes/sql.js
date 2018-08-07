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
        const options = defaults(this.options || {}, {
            host: 'localhost',
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
        this.chluIpfs.logger.debug('ChluDB SQL Index: setting up DB ...')
        this.chluIpfs.logger.warn(`ChluDB SQL Index: using SQLite at ${options.storage}`)
        this.sequelize = new Sequelize(Object.assign({}, options, {
            operatorsAliases: false
        }))
        // TODO: network namespace!
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

    async stop() {
        this.chluIpfs.logger.debug('ChluDB SQL Index: Closing ...')
        await this.sequelize.close()
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
                    if (item.multihash === data.previous_version_multihash) previousFixed = true
                    await this._updateLatestVersion(item.multihash, multihash)
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
            entity.latestVersion = await this.getLatestReviewRecordUpdate(latestVersion)
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
        return entity ? entity.latestVersion : multihash
    }

    async _getOriginalReviewRecord(multihash) {
        const entity = await this._readReviewRecord(multihash)
        if (get(entity, 'data.history.length', 0) > 0) {
            return entity.data.history[entity.data.history.length-1].multihash
        }
        return multihash
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
        return array.map(v => v.data.multihash)
    }

    async _getReviewRecordCount() {
        // TODO: implementation
        return await this.ReviewRecord.count({
            where: {
                data: {
                    history: {
                        [Sequelize.Op.eq]: []
                    }
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
                multihash: entity.didDocumentMultihash
            }
        } else {
            return {
                publicDidDocument: null,
                multihash: null
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
        return array.map(v => v.data.multihash)
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
        return array.map(v => v.data.multihash)
    }

}

module.exports = ChluSQLIndex;
