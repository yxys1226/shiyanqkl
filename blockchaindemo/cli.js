// cli.js
// 引入依赖模块
const P2p = require('./P2p.js'); // 引入p2p网络模块
const Blockchain = require('./Blockchain.js'); // 引入区块链模块
const express = require('express');
const cors = require('cors');

// 创建实例
const blockchain = new Blockchain(); // 创建区块链实例
const p2p = new P2p(blockchain); // 创建p2p实例，传入区块链实例方便网络模块访问区块链数据
//主函数：初始化cli命令页面

function cli(vorpal) {
    vorpal.use(welcome)
         .use(connectCommand)
         .use(discoverCommand)
         .use(blockchainCommand)
         .use(peersCommand)
         .use(mineCommand)
         .use(openCommand)
         .use(apiCommand)  // 添加这一行
         .delimiter('blockchain>>>>>')
         .show();
}
    //welcome:欢迎指令;connect:连接节点指令，discover:发现节点指令，blockchain:查看区块指令链，peers:查看已连接的节点指令，mine:挖矿指令，open:开启端口指令

module.exports = cli;  //导出cli指令，方便其他模块使用

//欢迎指令，显示欢迎消息并自动显示帮助
function welcome(vorpal){
    vorpal.log("welcome to blockchain cli");
    vorpal.exec("help");
}

// 连接节点指令，连接到指定的p2p节点
function connectCommand(vorpal){
    // 定义命令格式和说明，<host>和<port>为必填项
    vorpal.command('connect <host> <port>',"Connect to a new peer.eg: connect localhost 2727")
    // 设置命令别名为c
    .alias('c')
    //定义命令执行逻辑
    .action(function(args, callback){
        // 检查参数是否完整
        if(args.host && args.port){
            try{
                p2p.connectToPeer(args.host, args.port);

            } catch(err){
                this.log(err.message);
            }
        }
        callback();
    })
}

// 节点发现指令，自动发现并连接所有节点
function discoverCommand(vorpal){
    // 定义命令格式和说明
    vorpal.command('discover','Discover new peers from your connected peers.')
    // 设置命令别名
    .alias('d')
    // 定义命令执行逻辑
    .action(function(args, callback){
        try {
            p2p.discoverPeers();
        } catch(err){
            this.log(err.message);
        }
        callback();
    })
}

// 查看区块指令，查看当前区块链中所有区块
function blockchainCommand(vorpal){
    // 定义命令格式和说明
    vorpal.command('blockchain','see the current state of the blockchain.')
    // 设置命令行别名
    .alias('bc')
    .action(function(args,callback){
        // 输出整个区块链的信息
        this.log(blockchain);
        //执行回调函数，结束命令执行
        callback();
    })
}


// 节点查看指令：显示当前已连接的节点信息
// 节点查看者命令：显示已连接的P2P节点列表

function peersCommand(vorpal) {
  vorpal
    // 定义命令格式和说明
    .command('peers', 'Get the list of connected peers.')
    // 设置命令别名
    .alias('p')
    // 定义命令执行逻辑
    .action(function(args, callback) {
      // 遍历所有已连接的节点并输出信息
      if (p2p.peers.length === 0) {
        this.log('没有连接的节点');
      } else {
        this.log(`已连接的节点数量：${p2p.peers.length}`);
        p2p.peers.forEach((peer, index) => {
          const host = peer.peerInfo?.host || peer.remoteAddress || 'unknown';
          const port = peer.peerInfo?.port || peer.remotePort || 'unknown';
          this.log(`[${index + 1}] ${host}:${port}`);
        }, this);
      }
      // 执行回调函数，结束命令执行
      callback();
    });
}

// 挖矿指令，开始挖矿，并自动广播挖矿结果

function mineCommand(vorpal) {
  vorpal.command('mine <data>', 'Mine a new block.eg: mine "Hello World"')
    .alias('m')
    .action(function (args, callback) {
      if (args.data) {
        // 调用区块链模块的挖矿方法，传入数据
        blockchain.mine(args.data);
        // 广播挖矿结果给其他的节点
        p2p.broadcastLatest();
      }
      callback();
    });
}


// 开启端口指令：

function openCommand(vorpal) {
  vorpal.command('open <port>', 'Open a port for peer-to-peer connections.eg: open 2727')
    .alias('o')
    .action(function (args, callback) {
      // 检查参数是否存在
      if (args.port) {
        // 检查端口是否为数字
        if (typeof args.port === 'number') {
          // 调用p2p实例的开启端口方法
          p2p.startServer(args.port);
          // 输出提示信息
          this.log(`Listening on port ${args.port}`);
        } else {
          this.log('Invalid port number');
        }
      }
      callback();
    });
}


// 开启API接口指令：

function apiCommand(vorpal) {
  vorpal.command('api <port>', 'Start API server. eg: api 3001')
    .alias('a')
    .action(function (args, callback) {
      if (args.port) {
        initHttpServer(args.port);
      }
      callback();
    });
}

function initHttpServer(port) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/blocks', (req, res) => {
        res.send(blockchain.blockchain);
    });

    app.post('/mineBlock', (req, res) => {
        const data = req.body.data;
        if (data == null) {
            res.status(400).send('data parameter is missing');
            return;
        }
        blockchain.mine(data);
        const newBlock = blockchain.latestBlock;
        p2p.broadcastLatest();
        res.send(newBlock);
    });

    app.get('/peers', (req, res) => {
        res.send(p2p.peers.map(s => {
            const host = s.peerInfo.host || s.remoteAddress;
            const port = s.peerInfo.port || s.remotePort;
            return `${host}:${port}`;
        }));
    });

    app.get('/nodeinfo', (req, res) => {
        res.send({
            p2pPort: p2p.serverPort,
            apiPort: port,
            blockCount: blockchain.blockchain.length
        });
    });

    app.post('/addPeer', (req, res) => {
        p2p.connectToPeer(req.body.peer);
        res.send();
    });

    app.listen(port, () => {
        console.log('listening http on port: ' + port);
    });
}