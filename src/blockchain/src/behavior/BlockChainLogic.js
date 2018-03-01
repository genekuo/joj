import BlockLogic from './BlockLogic'
import Pair from './util/Pair'
import { curry, compose, add, concat } from 'ramda'
import Block from '../data/Block'
import Transaction from '../data/Transaction'
import '../common/helpers'

// https://www.youtube.com/watch?v=fRV6cGXVQ4I

const MINING_DIFFICULTY = 2
const MINING_REWARD_SCORE = 100

/**
 * Recalculate new blocks hash
 * Point new block's previous to current
 */
const addBlockTo = curry((blockchain, newBlock) => {
  newBlock.previousHash = blockchain.last().hash
  newBlock.calculateHash()
  blockchain.push(newBlock)
  return newBlock
})

const mineBlockTo = curry((blockchain, newBlock) => {
  newBlock.previousHash = blockchain.last().hash
  newBlock = BlockLogic.mineBlock(MINING_DIFFICULTY, newBlock)
  blockchain.push(newBlock)
  return newBlock
})

const calculateBalanceOfAddress = curry((blockchain, address) =>
  blockchain
    .blocks()
    .filter(b => !b.isGenesis())
    .map(txBlock => txBlock.pendingTransactions)
    .reduce(concat)
    .split(tx => tx.fromAddress === address, tx => tx.toAddress === address)
    .biFlatMap(tx => -tx.amount, tx => tx.amount)
    .reduce(add, 0)
)

/*
IMPERATIVE VERSION OF calculateBalanceOfAddress

const calculateBalanceOfAddress = curry((blockchain, address) => {
  let balance = 0
  for (const block of blockchain.blocks()) {
    if (!block.isGenesis()) {
      for (const trans of block.pendingTransactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount
        }
        if (trans.toAddress === address) {
          balance += trans.amount
        }
      }
    }
  }
  return balance
})
*/

const minePendingTransactions = curry((txBlockchain, miningRewardAddress) => {
  // Mine block and pass it all pending transactions in the chain
  // In reality, blocks are not to exceed 1MB, so not all tx are sent to all blocks
  const block = mineBlockTo(
    txBlockchain,
    BlockLogic.newTxBlock(Date.call(null), txBlockchain.pendingTransactions)
  )

  // Reset pending transactions for this blockchain
  txBlockchain.pendingTransactions = [
    Transaction(null, miningRewardAddress, MINING_REWARD_SCORE)
  ]
  return block
})

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
