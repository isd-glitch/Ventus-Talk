// log.js
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('log-container') || createLogContainer();
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.textContent = message;
    logContainer.prepend(logItem);

    // 4秒後に消える
    setTimeout(() => {
        logItem.style.opacity = '0';
        setTimeout(() => logItem.remove(), 500); // フェードアウト完了後に要素を削除
    }, 4000);
}

function createLogContainer() {
    const logContainer = document.createElement('div');
    logContainer.id = 'log-container';
    logContainer.style.position = 'fixed';
    logContainer.style.top = '10px';
    logContainer.style.right = '10px';
    logContainer.style.width = '350px'; /* 幅を少し大きく */
    logContainer.style.maxHeight = '400px';
    logContainer.style.overflowY = 'auto';
    logContainer.style.zIndex = '10000'; // 最前面に表示
    logContainer.style.pointerEvents = 'none'; // 他の要素と干渉しないようにする
    document.body.appendChild(logContainer);
    return logContainer;
}

export { addLog };



/*


addLog('??') blue
addLog('??',"error") red
success green
addLog('??',other) black

*/
