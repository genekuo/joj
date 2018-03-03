import BlockLogic from './BlockLogic'
import Pair from './util/Pair'
import { curry, concat } from 'ramda'
import Block from '../data/Block'
import Money from '../data/Money'
import Transaction from '../data/Transaction'
import TransactionalBlock from '../data/TransactionalBlock'
import '../common/helpers'

const MINING_DIFFICULTY = 2
const MINING_REWARD_SCORE = Money('₿', 100)

/**
 * Adds a new data block to the chain. It involves:
 * Recalculate new blocks hash and add the block to the chain
 * Point new block's previous to current
 *
 * @param {Blockchain} blockchain Chain to add block to
 * @param {Block}      newBlock   New block to add into the chain
 */
const addBlockTo = curry((blockchain, newBlock) => {
  newBlock.previousHash = blockchain.last().hash
  newBlock.calculateHash()
  blockchain.push(newBlock)
  return newBlock
})

/**
 * Mines a new block into the chain. It involves:
 * Recalculate new blocks hash until the difficulty condition is met (mine)
 * Point new block's previous to current
 *
 * @param {Blockchain} blockchain Chain to add block to
 * @param {Block}      newBlock   New block to add into the chain
 */
const mineBlockTo = curry((blockchain, newBlock) => {
  newBlock.previousHash = blockchain.last().hash
  newBlock = BlockLogic.mineBlock(MINING_DIFFICULTY, newBlock)
  blockchain.push(newBlock)
  return newBlock
})

/**
 * Calculates the balance of the chain looking into all of the pending
 * transactions inside all the blocks in the chain
 *
 * @param {Blockchain} blockchain Chain to calculate balance from
 * @param {Block}      address    Address to send reward to
 */
const calculateBalanceOfAddress = curry((blockchain, address) =>
  blockchain
    // Traverse all blocks
    .blocks()
    // Ignore Genesis block as this won't ever have any pending transactions
    .filter(b => !b.isGenesis())
    // Retrieve all pending transactions
    .map(txBlock => txBlock.pendingTransactions)
    // Group the transactions of each block into an array
    .reduce(concat)
    // Separate the transactions into 2 groups:
    //    1: Matches the fromAddress
    //    2: Matches the toAddress
    .split(tx => tx.fromAddress === address, tx => tx.toAddress === address)
    // Now apply a function to each group to extract the amount to add/subtract as money
    .flatBiMap(
      tx => Money(tx.money.currency, -tx.money.amount),
      tx => Money(tx.money.currency, tx.money.amount)
    )
    // Finally, add across all the values to compute sum
    // Money is monoidal over Money.add and Money.nothing
    .reduce(Money.add, Money.nothing())
)

//-- IMPERATIVE VERSION OF calculateBalanceOfAddress --
//
// const calculateBalanceOfAddress = curry((blockchain, address) => {
//   let balance = Money.nothing()
//   for (const block of blockchain.blocks()) {
//     if (!block.isGenesis()) {
//       for (const trans of block.pendingTransactions) {
//         if (trans.fromAddress === address) {
//           balance = balance.minus(trans.money)
//         }
//         if (trans.toAddress === address) {
//           balance = balance.plus(trans.money)
//         }
//       }
//     }
//   }
//   return balance
// })

const minePendingTransactions = curry((txBlockchain, miningRewardAddress) => {
  // Mine block and pass it all pending transactions in the chain
  // In reality, blocks are not to exceed 1MB, so not all tx are sent to all blocks
  const block = mineBlockTo(
    txBlockchain,
    TransactionalBlock(txBlockchain.pendingTransactions)
  )

  // Reset pending transactions for this blockchain
  // Put reward transaction into the chain for next mining operation
  txBlockchain.pendingTransactions = [
    Transaction(null, miningRewardAddress, MINING_REWARD_SCORE)
  ]
  return block
})

/**
 * Determines if the chain is valid by asserting the properties of a blockchain.
 * Namely:
 * 1. Every hash is unique and hasn't been tampered with
 * 2. Every block properly points to the previous block
 *
 * @param {Blockchain} blockchain Chain to calculate balance from
 * @return {Boolean} Whether the chain is valid
 */
const isChainValid = blockchain =>
  blockchain
    // Get all blocks
    .blocks()
    // Skip the first one (the array will be off-by-one with respect to the blockchain)
    .slice(1)
    // Convert the resulting array into pairs of blocks Pair(current, previous)
    .map((currentBlock, currentIndex) =>
      Pair(Object, Object)(currentBlock, blockchain.blockAt(currentIndex))
    )
    // Validate every pair of blocks is valid
    .every(pair => {
      const current = pair.left
      const previous = pair.right
      return (
        // 1 .Hashed can't be tampered with
        current.hash === Block.calculateHash(current) &&
        // 2. Blocks form a chain
        current.previousHash === previous.hash
      )
    })

/**
 * Exported BlockChainLogic interface
 */
const BlockChainLogic = {
  addBlockTo,
  mineBlockTo,
  isChainValid,
  minePendingTransactions,
  calculateBalanceOfAddress
}

export default BlockChainLogic