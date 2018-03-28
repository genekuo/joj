import BlockHeader from './BlockHeader'

// https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch4.md
class TransactionalBlock extends BlockHeader {
  constructor(previousHash, pendingTransactions) {
    super(previousHash)
    this.pendingTransactions = pendingTransactions
  }

  get pendingTransactions() {
    return this.pendingTransactions
  }
}

export default TransactionalBlock
