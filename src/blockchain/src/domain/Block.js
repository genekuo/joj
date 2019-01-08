import '../lang/object'
import { Failure, Success } from '../../../adt/dist/validation'
import {
  checkDifficulty,
  checkLength,
  checkLinkage,
  checkNoTampering,
  checkTimestamps
} from './block/validations'
import HasHash from './shared/HasHash'
import HasValidation from './shared/HasValidation'
import proofOfWork from './block/proof_of_work'

/**
 * Transactional blocks contain the set of all pending transactions in the chain
 * These are used to move/transfer assets around within transactions
 * Bitcoins are a good example of transactional blocks.
 *
 * Hashes constitute the digital fingerprint of a block. They are calcualted using all of the
 * properties of such block. Blocks are immutable with respect to their hash, if the hash of a block
 * changes, it's a different block
 * @param {Number} id                  Block ID
 * @param {String} previousHash        Reference to the previous block in the chain
 * @param {Array}  pendingTransactions Array of pending transactions from the chain
 * @return {Block} Newly created block with its own computed hash
 */
export default (id, previousHash, pendingTransactions) =>
  Object.assign(
    new class Block {
      constructor () {
        this.id = id
        this.previousHash = previousHash
        this.pendingTransactions = pendingTransactions || []
        this.difficulty = 2
        this.nonce = 0
        this.timestamp = Date.now()
        this.hash = undefined // Gets computed later
        this.blockchain = undefined // Gets set after construction
      }
      /**
       * Execute proof of work algorithm to mine block
       * @return {Promise<Block>} Mined block
       */
      async mine () {
        return Promise.resolve(
          proofOfWork(this, ''.padStart(this.difficulty, '0'), this.nonce)
        )
      }

      /**
       * Check whether this block is a genesis block (first block in a any chain)
       * @return {Boolean} Whether this is a genesis block
       */
      isGenesis () {
        return this.previousHash === '0'.repeat(64)
      }

      isValid () {
        if (this.isGenesis()) {
          return Success(true)
        } else {
          // Compare each block with its previous
          const previous = this.blockchain.lookUp(this.previousHash)

          const result = [
            checkLength(64),
            checkNoTampering,
            checkDifficulty(this.difficulty),
            checkLinkage(previous),
            checkTimestamps(previous)
          ].every(f => f(this))
          // .reduce((r, f) => r && f(this))

          return result
            ? Success(true)
            : Failure([`Validation failed for block ${this.hash}`])
        }
      }

      /**
       * Returns the minimal JSON representation of this object
       * @return {Object} JSON object
       */
      toJSON () {
        return {
          previousHash: this.previousHash,
          hash: this.hash,
          nonce: this.nonce,
          timestamp: this.timestamp,
          pendingTransactions: this.pendingTransactions.length
        }
      }

      get [Symbol.for('version')] () {
        return '1.0'
      }

      // TODO: in chapter on symbols, create a symbol for [Symbol.observable] then show validating blockchain using it
      [Symbol.iterator] () {
        return pendingTransactions[Symbol.iterator]()
      }
    }(),
    HasHash(['timestamp', 'previousHash', 'nonce', 'pendingTransactions']),
    HasValidation()
  )
