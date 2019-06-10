import { MAX_NODES, SYNC_TIMER } from '../../common/settings'
import BitcoinService from '../../domain/service/BitcoinService'
import Blockchain from '../../domain/Blockchain'
import EventEmitter from 'events'
import Key from '../../domain/value/Key'
import Node from './Node'
import Wallet from '../../domain/Wallet'
import Transaction from '../../domain/Transaction'

export default class Network {
  #nodes
  #intervalId
  #emitter
  #pendingTransactions
  #networkWallet
  #service
  #chain

  constructor() {
    this.#nodes = []
    this.#pendingTransactions = []
    this.#emitter = new EventEmitter().setMaxListeners(MAX_NODES)
    this.#networkWallet = new Wallet(Key('jsl-public.pem'), Key('jsl-private.pem'))
    this.#chain = new Blockchain()
    this.#service = new BitcoinService(this.#chain)
  }

  get chain() {
    return this.#chain
  }

  async loadFunds(wallet, funds) {
    const first = new Transaction(
      null,
      wallet.address,
      funds,
      'Assigning some initial funds to user'
    )
    first.signature = first.sign(wallet.privateKey)
    this.#chain.addPendingTransaction(first)

    const minedBlock = await this.#service.minePendingTransactions(wallet.address, 2)
    console.log(`Mined ${minedBlock.transactions.length} new transactions into the chain`)
    console.log('Miner starts out with %s', wallet.balance(this.#chain).toString())
  }

  get address() {
    return this.#networkWallet.address
  }

  addMinerNode(displayName, address) {
    if (this.#nodes.length >= MAX_NODES) {
      throw 'Max Nodes Exceeded!'
    }
    const difficulty = Network.calculateRandomDifficulty()
    const minerFn = this.#service.minePendingTransactions.bind(this.#service, address, difficulty)
    const minerNode = new Node(displayName, address, difficulty, this.#emitter, minerFn)
    this.#nodes.push(minerNode)
    return minerNode
  }

  processTransaction(transactionDetails) {
    try {
      this.#service.transferFunds(...transactionDetails)
    } catch (e) {
      // ignoring
    }
  }

  static calculateRandomDifficulty() {
    return getRandomInteger(1, 4)
  }

  start() {
    this.#intervalId = setInterval(() => {
      this.#emitter.emit('MINE_BLOCK')
    }, SYNC_TIMER)
  }

  stop() {
    this.#emitter.removeAllListeners()
    clearInterval(this.#intervalId)
  }
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}