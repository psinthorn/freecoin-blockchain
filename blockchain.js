const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');

// #Blockchain constructor
function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];
    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    this.createNewBlock(388, '0', '0');
};

// #New Blockchain prototype
Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {

    // New blockchain object
    const newBlock = {
        index: this.chain.length +1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    }
    // Clear newTransactions to empty array for next create new block
    this.pendingTransactions = [];

    // Push newBlock was created to chain[]
    const newBlockChain = this.chain.push(newBlock);
    return newBlockChain;

};

// #Get last blockchain object
Blockchain.prototype.getLastBlock = function() {
    // Return chain array by deduct current index by 1
    //example chain[3]
    return this.chain[this.chain.length - 1];
};

// Create new Transaction
Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        id: uuid().split('-').join('')
    }
    return newTransaction;

};

Blockchain.prototype.addNewTransactionToPendingTransactions = function(transactionObj){
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
};

// #Hash data 
Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
};

// #Proof of Work
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while(hash.substring(0, 4) !== '0000'){
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        //console.log(hash);
    }
    return nonce;
};


// Exports module for us elsewhere
module.exports =Blockchain;
