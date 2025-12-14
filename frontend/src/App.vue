<template> 
    <div class="app-container">
      <BlockList />
    </div>

</template>

<script setup>
import BlockList from './components/BlockList.vue';

</script>

<style scoped>
.app-container {
    min-height: 100vh;
    background-color: #f8f9fa;
    padding: 20px;
}

</style>