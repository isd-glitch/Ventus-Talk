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

function setProfileImageFromLocalStorage() {
    const base64Image = localStorage.getItem('profileImage');
    if (base64Image) {
        const profileImageElement = document.querySelector('#user-info img');
        profileImageElement.src = base64Image;
        console.log('プロフィール画像がローカルストレージから設定されました');
    } else {
        console.log('ローカルストレージにプロフィール画像が見つかりませんでした');
    }
}

export { addLog, setProfileImageFromLocalStorage};

/*


addLog('??') blue
addLog('??',"error") red
success green
addLog('??',other) black

*/



function applyThemeToAllElements(theme) {
    const elements = document.querySelectorAll('body, #left-panel, #right-panel, #user-info, #chat-box, .message-item .message-bubble, #send-button,#menu-bar');
    elements.forEach(element => {
        const currentClasses = element.className.split(' ');
        const newClasses = currentClasses.filter(className => !className.endsWith('-mode') && !className.startsWith('summer-') && !className.startsWith('gradient-') && !className.startsWith('forest-'));
        if (theme !== 'default') {newClasses.push(theme);}
        element.className = newClasses.join(' ');
    });
}

// 初期テーマを適用
const savedTheme = localStorage.getItem('theme') || 'default';
applyThemeToAllElements(savedTheme);
try{document.getElementById('theme-select').value = savedTheme;}catch(_){}

// テーマ変更時の処理
try{document.getElementById('theme-select').addEventListener('change', (event) => {
    const selectedTheme = event.target.value;
    applyThemeToAllElements(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
});}catch(_){}
