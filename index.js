const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./dev/blockchain');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const port = process.argv[2];

const app = express();
const freecoin = new Blockchain();
const nodeAddress = uuid().split('-').join('');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));

app.get('/', (req, res) => {
    
    res.status(200).send(`Hello JS Blockchain Tutorial :)`);
});

app.get('/blockchain', (req, res) => {
    res.status(200).send(freecoin);
});

app.post('/transaction-broadcast', (req, res) => {
   
    const newTransaction = freecoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    freecoin.addNewTransactionToPendingTransactions(newTransaction);
    
    const allTransactionPromise = [];
    freecoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        }
        allTransactionPromise.push(rp(requestOptions));
    });

    Promise.all(allTransactionPromise)
    .then(transaction => {
        res.status(200).json({note: "Add new transaction and broacast is succesfully."})
    });

});

app.post('/transaction', (req, res) => {  
    const newTransaction = req.body;
    const blockIndex = freecoin.addNewTransactionToPendingTransactions(newTransaction);
    res.status(200).json({note: `New Transaction will add to index ${blockIndex}`});
});

app.get('/mine', (req, res) => {

    const lastBlock = freecoin.getLastBlock();
    console.log('Index: =>', freecoin.getLastBlock()['index'] + 1);
    const previousBlockhash = freecoin.getLastBlock()['hash'];
    const currentBlockData = {
        transactions: freecoin.pendingTransactions,
        index: freecoin.getLastBlock()['index'] + 1
    };
    
    const nonce = freecoin.proofOfWork(previousBlockhash, currentBlockData);
    const hash = freecoin.hashBlock(previousBlockhash, currentBlockData, nonce);

    const mineReward = {
        amount: 12.5,
        sender: "00",
        recipient: nodeAddress
    };

    // freecoin.createNewTransaction(12.5, '00', nodeAddress);
    const newBlock = freecoin.createNewBlock(nonce, previousBlockhash, hash);
    //console.log(newBlock);
    // Broadcast new block to all network node
    const requestPromises = [];
    freecoin.networkNodes.forEach( networkNodeUrl =>{
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: newBlock,
            json: true
        };
    requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
    .then(newBlock => {
        const rewardOptions = {
            uri: freecoin.currentNodeUrl + '/transaction-broadcast',
            method: 'POST',
            body: {
                amount: 12.5,
                sender: "00",
                recipient: nodeAddress
            },
            json: true
        }; 
        return rp(rewardOptions) 
    })
    .then(newBlock => {
            res.status(200).json({
            note: "Mine new block is success :)",
            block: newBlock
        });   
    });     
});

// Broadcast and add new block to network node
app.post('/receive-new-block', (req, res) => {
    const newBlock = {
        nonce: req.body.nonce,
        previousBlockhash: previousBlockhash,
        hash: hash 
    }
    // Check new block correct hash with last block or not
    const lastBlock = freecoin.getLastBlock();
    console.log(lastBlock);
    console.log(newBlock);

    // const correctHash = lastBlock['hash'] === newBlock['previousBlockhash'];

    // Check last block index === new block index?
    // const correctIndex = lastBlock['index'] + 1 === newBlock['index']

    // if(correctHash && correctIndex){
        // Add newBlock to chain
        freecoin.chain.push(newBlock);

        // Clear pendingsTransactions to empty
        freecoin.pendingTransactions = []; 
        res.status(200).json({ note: "Add new block successfully." });
    // } else {
        // res.status(401).json({ note: "New block is rejected." });
    // };

    
    
});

//Register and broadcast new node to network
app.post('/register-and-broadcast-node', (req, res) => {

    const newNodeUrl = req.body.newNodeUrl;
    
    if(freecoin.networkNodes.indexOf(newNodeUrl == -1) && freecoin.currentNodeUrl !== newNodeUrl) {
        freecoin.networkNodes.push(newNodeUrl);
    }
    
    const regNodesPromise= [];
    freecoin.networkNodes.forEach(networkNodeUrl => {

        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };            
        regNodesPromise.push(rp(requestOptions));       
    });

    // console.log(regNodesPromise);
    Promise.all(regNodesPromise)
        .then(data => {
            const bulkRegisterOptions = {
                uri: newNodeUrl + '/register-node-bulk',
                method: 'POST',
                body: { allNetworkNodes: [...freecoin.networkNodes, freecoin.currentNodeUrl] },
                json: true
            };

            // console.log(bulkRegisterOptions);
            return rp(bulkRegisterOptions)
        })
        .then(data => {
            res.status(200).json({note:'New node registered successfully.'});
        });
});

//Register node to network
app.post('/register-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;

    if (freecoin.networkNodes.indexOf(newNodeUrl) == -1 && freecoin.currentNodeUrl !== newNodeUrl) {
    freecoin.networkNodes.push(newNodeUrl);
    }

    res.status(200).json({ note: 'New node registered successfully.' });
});

//Register bulk nodes at one
app.post('/register-node-bulk', (req, res) => {
    const allNetworkNodes = req.body.allNetworkNodes;
    
        allNetworkNodes.forEach(networkNodeUrl => {
            const isNotPresentNode = freecoin.networkNodes.indexOf(networkNodeUrl) == -1;
            const isNotCurrentNode = freecoin.currentNodeUrl !== networkNodeUrl;

            if(isNotPresentNode && isNotCurrentNode){
                freecoin.networkNodes.push(networkNodeUrl);
            }           
        });   

        res.status(200).json({ note: 'Bulk Node registered successfully.' });  
});


app.listen(port, () => {
    console.log(`Server start on port ${port}`);
});
