const net = require('net');
const messageType = require('./messages-type.js');
const Messages = require('./messages.js');
const {
    REQUEST_LATEST_BLOCK,
    RECEIVE_LATEST_BLOCK,
    REQUEST_BLOCKCHAIN,
    RECEIVE_BLOCKCHAIN
} = messageType;

class PeerToPeer {

    constructor(blockchain) {
        this.peers = [];
        this.blockchain = blockchain;
    }

    startServer(port) {
        const server = net.createServer((socket) => {
            this.initConnection(socket);
        }).listen(port);
        console.log(`Server started on port ${port}`);
    }

    connectToPeer(host,port) {
        const socket =net.connect(port, host, () => {
            console.log(`Connected to peer ${host}:${port}`);
            this.initConnection(socket);
        })

        socket.on('error', (err) => {
           console.log(`Error connecting to peer ${host}:${port}, err.message`);
        })
    }

    closeConnection() {
        this.peers.forEach(peer => {
            try {
                peer.end();
            } catch (err) {
                console.log(`Error closing connection ${err.message}`);
            }
        });
        this.peers = [];
        console.log('All connections closed.');
    }

    broadcastLatest() {
        this.broadcast(Messages.sendLatestBlock(this.blockchain.latestBlock));
    }

    broadcast(message) {
        this.peers.forEach(peer => {
            this.write(peer, message);
        });
    }

    write(peer, message) {
        peer.write(JSON.stringify(message));
    }

    initConnection(connection) {
        const existingPeer = this.peers.find(peer =>{
            peer.remoteAddress === connection.remoteAddress && peer.remotePort === connection.remotePort
        });
        if (!existingPeer) {
            this.peers.push(connection);
            this.initMessageHandler(connection);
            this.initErrorHandler(connection);
            this.write(connection, Messages.getLatestBlock());
            console.log(`New peer connected: ${connection.remoteAddress}:${connection.remotePort}`);
        }
    }
    // 初始化消息处理器
  initMessageHandler(connection) {
    let buffer = ''; // 用于处理TCP粘包的数据缓冲区
    
    connection.on("data", data => {
      buffer += data.toString("utf8"); // 将接收到的数据添加到缓冲区
      
      // 处理可能包含多个JSON消息的缓冲区
      let boundary = buffer.indexOf('}{');
      while (boundary !== -1) {
        // 提取第一个完整的JSON消息
        const messageStr = buffer.substring(0, boundary + 1);
        buffer = buffer.substring(boundary + 1);
        
        try {
          const message = JSON.parse(messageStr);
          this.handleMessage(connection, message); // 处理消息
        } catch (err) {
          console.error('Error parsing message:', err.message);
        }
        
        boundary = buffer.indexOf('}{');
      }
      
      // 处理缓冲区中剩余的单个消息
      if (buffer.length > 0) {
        try {
          const message = JSON.parse(buffer);
          this.handleMessage(connection, message);
          buffer = '';
        } catch (err) {
          // 可能消息还不完整，等待更多数据
        }
      }
    });
  }

  // 初始化错误处理器
  initErrorHandler(connection) {
    connection.on("error", err => {
      throw err;
    });
  }

  // 处理接收到的消息
  handleMessage(peer, message) {
    switch (message.type) {
      case REQUEST_LATEST_BLOCK:
        // 当收到请求最新区块的消息时，发送最新区块
        this.write(peer, Messages.sendLatestBlock(this.blockchain.latestBlock));
        break;
      case REQUEST_BLOCKCHAIN:
        // 当收到请求整个区块链的消息时，发送整个区块链
        this.write(peer, Messages.sendBlockchain(this.blockchain.get()));
        break;
      case RECEIVE_LATEST_BLOCK:
        // 当收到最新区块时，处理该区块
        this.handleReceivedLatestBlock(message, peer);
        break;
      case RECEIVE_BLOCKCHAIN:
        // 当收到整个区块链时，处理该区块链
        this.handleReceivedBlockchain(message);
        break;
      default:
        throw "Received invalid message.";
    }
  }

  // 处理接收到的最新区块
  handleReceivedLatestBlock(message, peer) {
    const receivedBlock = message.data;      // 获取接收到的区块
    const latestBlock = this.blockchain.latestBlock; // 获取本地最新区块

    // 如果接收到的区块可以连接到当前链
    if (latestBlock.hash === receivedBlock.previousHash) {
      try {
        this.blockchain.addBlock(receivedBlock); // 添加新区块
      } catch(err) {
        throw err;
      }
    } else if (receivedBlock.index > latestBlock.index) {
      // 如果接收到的区块索引更大，说明可能有更长的链，请求整个区块链
      this.write(peer, Messages.getBlockchain());
    } else {
      // 其他情况不做处理
    }
  }

  // 处理接收到的整个区块链
  handleReceivedBlockchain(message) {
    const receivedChain = message.data; // 获取接收到的区块链
    
    try {
      this.blockchain.replaceChain(receivedChain); // 替换本地区块链
    } catch(err) {
      throw err;
    }
  }
}

module.exports = PeerToPeer;