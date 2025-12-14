// 引入Block类，用于创建区块对象
const Block = require('./Block.js');
// 引入node.js的crypto模块，用于SHA-256加密哈希计算
const crypto = require('crypto');

// 创建区块链类---管理整个区块链的核心类
class Blockchain {

    // 初始化一个新的区块链
    constructor() {
        this.blockchain = [Block.genesis];  // 初始化区块链中的第一个区块
        this.difficulty = 3;  // 难度值，控制哈希的生成难度
    }

    // 获取区块链中的所有区块数组，[{0}, {1}, {2}, {3},.....]
    get() {
        return this.blockchain;
    }
    
    // 获取区块链中最新的区块（整条链的最末端）
    get latestBlock() {
        return this.blockchain[this.blockchain.length - 1];
    }
    
    // 验证哈希值是否满足难度要求的函数
    isValidHashDifficulty(hash) {
        for (var i = 0; i < hash.length; i++) {
            if (hash[i] !== '0') {
                break;
            }
        }
        return i >= this.difficulty;
    }
    //为一个区块对象计算哈希值
    calculateHashForBlock(block) {
        const {
            index,
            previousHash,
            timestamp,
            data,
            nonce
        } = block;
        return this.calculateHash(index, previousHash, timestamp, data, nonce);
    }
    //通用的计算哈希值函数的方法
    calculateHash(index, previousHash, timestamp, data, nonce) {
        return crypto.createHash('sha256').update(index + previousHash + timestamp + data + nonce).digest('hex');
    }
    //挖矿方法--创建新的区块并添加到区块链中
    mine(data) {
        const newBlock = this.generateNextBlock(data);
        try {
            this.addBlock(newBlock);
        } catch (error) {
            throw error;
        }
    }
    //生成下一个区块的方法---执行工作量证明（挖矿）
    generateNextBlock(data) {
        const nextIndex = this.latestBlock.index + 1;
        const previousHash = this.latestBlock.hash;
        let timestamp = new Date().getTime();
        let nonce = 0;
        let nextHash = this.calculateHash(nextIndex, previousHash, timestamp, data, nonce);

        while (!this.isValidHashDifficulty(nextHash)) {
            nonce = nonce + 1;
            timestamp = new Date().getTime();
            nextHash = this.calculateHash(nextIndex, previousHash, timestamp, data, nonce);
        }

        const nextBlock = new Block(
            nextIndex,
            previousHash,
            timestamp,
            data,
            nextHash,
            nonce
        );

        return nextBlock;

    }
    //添加区块到区块链的方法
    addBlock(newBlock) {
        if (this.isValidNextBlock(newBlock, this.latestBlock)) {
            this.blockchain.push(newBlock);
        } else {
            throw "Error: Invalid Block";
        }
    }
    //验证新区块是否是前一个区块的有效后继
    isValidNextBlock(nextBlock, previousBlock) {
        const nextBlockHash = this.calculateHashForBlock(nextBlock);

        if (previousBlock.index + 1 !== nextBlock.index) {
            return false;
        } else if (previousBlock.hash !== nextBlock.previousHash) {
            return false;
        } else if (nextBlockHash !== nextBlock.hash) {
            return false;
        } else if (!this.isValidHashDifficulty(nextBlockHash)) {
            return false;
        } else {
            return true;
        }
    }
    //验证整条区块链是否合法且有效
    isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis)) {
            return false;
        }

        const tempChain = [chain[0]];

        for (let i = 1; i < chain.length; i++) {
            if (this.isValidNextBlock(chain[i], tempChain[i - 1])) {
                tempChain.push(chain[i]);
            } else {
                return false;
            }
        }
        return true;
    }

    //检查新链是否比当前链更长
    isChainLonger(chain) {
        return chain.length > this.blockchain.length;
    }
    //替换区块链的方法，---用于处理区块链分叉，保留最长的有效链
    replaceChain(newChain) {
        if (this.isValidChain(newChain) && this.isChainLonger(newChain)) {
            this.blockchain = JSON.parse(JSON.stringify(newChain));
        } else {
            throw "Error: Invalid Chain";
        }
    }
}

// 导出Blockchain类，让其他文件可以使用
module.exports = Blockchain;