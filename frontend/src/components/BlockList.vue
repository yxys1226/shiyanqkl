<template>
    <div class="blockchain-container">
        <div class="header">
            <h1>Blockchain Visualization</h1>
            <div class="header-right">
                <div class="node-info">
                    <span class="label">当前节点:</span>
                    <span class="current-node">P2P {{ getCurrentNodeP2pPort() }}</span>
                </div>
                <div class="status">
                    <span :class="['status-dot', connected ? 'online' : 'offline']"></span>
                    {{ connected ? '已连接' : '未连接' }}
                </div>
            </div>
        </div>

        <div class="node-selector-bar">
            <div class="selector-left">
                <span class="label">可用节点:</span>
                <button v-for="node in availableNodes" :key="node.apiPort" @click="switchToNode(node)"
                    :class="['node-btn', { active: currentApiPort === node.apiPort }]"
                    :title="`API端口：${node.apiPort}，区块数：${node.blockCount}`">
                    <div class="node-id">节点 {{ node.p2pPort }}</div>
                    <div class="node-blocks">{{ node.blockCount }} 区块</div>
                </button>
                <div v-if="availableNodes.length === 0 && !isDiscovering" class="no-nodes">
                    未发现节点
                </div>
                <div v-if="isDiscovering" class="discovering">
                    扫描中...
                </div>
            </div>
            <button @click="discoverNodes" class="refresh-nodes-btn" :disabled="isDiscovering">
                🔄 刷新节点
            </button>
        </div>

        <div class="controls">
            <button @click="fetchBlocks" class="refresh-btn">
                Refresh Chain
            </button>
            <div class="auto-refresh">
                <label>
                    <input type="checkbox" v-model="autoRefresh"> Auto Refresh (2s)
                </label>
            </div>
        </div>
        <div class="chain-display" v-if="blocks.length > 0">
            <div v-for="(block, index) in blocks" :key="block.index" class="block-wrapper">
                <div class="block-card">
                    <div class="block-header">
                        <span class="block-index">#{{ block.index }}</span>
                        <span class="block-time">{{ formatTime(block.timestamp) }}</span>
                    </div>
                    <div class="block-body">
                        <div class="data-row">
                            <span class="label">Hash:</span>
                            <span class="value hash" :title="block.hash">{{ block.hash }}</span>
                        </div>
                        <div class="data-row">
                            <span class="label">Prev Hash:</span>
                            <span class="value hash" :title="block.previousHash">{{ block.previousHash }}</span>
                        </div>
                        <div class="data-row">
                            <span class="label">Data:</span>
                            <span class="value data-content">{{ block.data }}</span>
                        </div>
                        <div class="data-row">
                            <span class="label">Nonce:</span>
                            <span class="value">{{ block.nonce }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="index < blocks.length - 1" class="chain-link">
                    <div class="arrow"></div>
                </div>
            </div>
        </div>
        <div v-else class="empty-state">
            Waiting for blockchain data...
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';
import dayjs from 'dayjs';

const availableNodes = ref([]); // 可用的节点列表
const currentApiPort = ref(3001); // 当前连接的API端口
const blocks = ref([]);
const connected = ref(false);
const autoRefresh = ref(true);
const isDiscovering = ref(false);
let timer = null;

// 扫描指定端口，检查是否有节点运行
const scanPort = async (port) => {
    try {
        const response = await axios.get(`http://localhost:${port}/nodeinfo`, { timeout: 1000 });
        return {
            apiPort: port,
            p2pPort: response.data.p2pPort,
            blockCount: response.data.blockCount,
            online: true
        };
    } catch (error) {
        return null;
    }
};

// 发现网络中的所有节点
const discoverNodes = async () => {
    isDiscovering.value = true;
    const portRange = [3001, 3002, 3003, 3004, 3005]; // 扫描的端口范围
    const promises = portRange.map(port => scanPort(port));
    // console.log(promises, '============================');
    const results = await Promise.all(promises);

    // 过滤掉null值（不可用的端口）
    availableNodes.value = results.filter(node => node !== null);
    isDiscovering.value = false;
    console.log('发现的节点：', availableNodes.value);
};

// 获取区块链数据
const fetchBlocks = async () => {
    try {
        const response = await axios.get(`http://localhost:${currentApiPort.value}/blocks`);
        blocks.value = response.data;
        connected.value = true;
    } catch (error) {
        console.error('Error fetching blocks:', error);
        connected.value = false;
    }
};// 切换选定节点
const switchToNode = (node) => {
    currentApiPort.value = node.apiPort;
    fetchBlocks();
};

// 获取当前节点的P2P端口（用于显示）
const getCurrentNodeP2pPort = () => {
    const currentNode = availableNodes.value.find(n => n.apiPort === currentApiPort.value);
    return currentNode?.p2pPort || '未知';
};

const formatTime = (timestamp) => {
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
};

const startPolling = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(fetchBlocks, 2000);
};

const stopPolling = () => {
    if (timer) clearInterval(timer);
};

watch(autoRefresh, (newValue) => {
    if (newValue) {
        startPolling();
    } else {
        stopPolling();
    }
});

onMounted(async () => {
    await discoverNodes(); // 先发现可用节点
    fetchBlocks(); // 然后获取区块数据
    if (autoRefresh.value) {
        startPolling();
    }
});

onUnmounted(() => {
    stopPolling();
});
</script>

<style scoped>
.blockchain-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Inter', sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 20px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

h1 {
    margin: 0;
    color: #2c3e50;
    font-size: 24px;
}

.node-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #f8f9fa;
    border-radius: 6px;
}

.node-info .label {
    font-size: 13px;
    color: #666;
}

.current-node {
    font-weight: 600;
    color: #667eea;
    font-family: 'Roboto', sans-serif;
}

.status {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #666;
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
    background-color: #ccc;
}

.status-dot.online {
    background-color: #42b983;
    box-shadow: 0 0 8px rgba(66, 185, 131, 0.5);
}

.statua-dot.offine {
    background-color: #e74c3c;
}

.node-selector-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e8e8e8;
    gap: 15px;
    flex-wrap: wrap;
}

.selector-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    flex-wrap: wrap;
}

.selector-left .label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
}

.node-btn {
    padding: 8px 14px;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.node-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.node-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-color: #667eea;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.node-id {
    font-size: 13px;
    font-weight: 600;
}

.node-blocks {
    font-size: 11px;
    opacity: 0.8;
}

.no-nodes,
.discovering {
    font-size: 13px;
    color: #999;
    font-style: italic;
    padding: 8px 12px;
}

.discovering {
    color: #667eea;
}

.refresh-nodes-btn {
    padding: 8px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.refresh-nodes-btn:hover:not(:disabled) {
    background: #5566d8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.refresh-nodes-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.controls {
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 20px;
}

.refresh-btn {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.refresh-btn:hover {
    background-color: #2980b9;
}

.chain-display {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.block-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.block-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 600px;
    overflow: hidden;
    transition: transform 0.3s;
    border: 1px solid #f0f0f0;
}

.block-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.block-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.block-index {
    font-weight: bold;
    font-size: 18px;
}

.block-time {
    font-size: 12px;
    opacity: 0.9;
}

.block-body {
    padding: 20px;
}

.data-row {
    display: flex;
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.5;
}

.data-row:last-child {
    margin-bottom: 0;
}

.label {
    width: 100px;
    color: #888;
    flex-shrink: 0;
}

.value {
    color: #333;
    word-break: break-all;
}

.data-content {
    font-weight: bold;
    color: #2c3e50;
}

.hash {
    color: #e67e22;
}

.chain-link {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    font-size: 24px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #999;
    font-style: italic;
}
</style>