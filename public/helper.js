/*
async function checkIfAwake() {
    try {
        const controller = new AbortController();
        const signal = controller.signal;
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://ventus-talk-a.glitch.me/sleep', { signal }).catch(error => {
            if (error.name === 'AbortError') clearCacheAndReload();
            else console.error('Fetch error:', error);
        });

        clearTimeout(timeout);

        if (response && response.ok) {
            const data = await response.json();
            console.log(data.iam === 'awake' ? 'The response confirms: I am awake.' : 'The response does not confirm: I am awake.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
*/
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function() {
    console.log('Text copied to clipboard successfully!');
  }).catch(function(err) {
    console.error('Could not copy text: ', err);
  });
}
async function clearCacheAndReload() {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log(`Deleting cache: ${cacheName}`);
        addLog('キャッシュを削除しました', "info");
        return caches.delete(cacheName);
      })
    );
  window.location.reload();
}

//-----------------------------------glitch


function addLog(message, type = "info") {
  const logContainer =
    document.getElementById("log-container") || createLogContainer();
  const logItem = document.createElement("div");
  logItem.className = `log-item ${type}`;
  logItem.textContent = message;
  logContainer.prepend(logItem);

  // 4秒後に消える
  setTimeout(() => {
    logItem.style.opacity = "0";
    setTimeout(() => logItem.remove(), 500); // フェードアウト完了後に要素を削除
  }, 4000);
}

function createLogContainer() {
  const logContainer = document.createElement("div");
  logContainer.id = "log-container";
  logContainer.style.position = "fixed";
  logContainer.style.top = "10px";
  logContainer.style.right = "10px";
  logContainer.style.width = "350px"; /* 幅を少し大きく */
  logContainer.style.maxHeight = "400px";
  logContainer.style.overflowY = "auto";
  logContainer.style.zIndex = "10000"; // 最前面に表示
  logContainer.style.pointerEvents = "none"; // 他の要素と干渉しないようにする
  document.body.appendChild(logContainer);
  return logContainer;
}

function setProfileImageFromLocalStorage() {
  const base64Image = localStorage.getItem("profileImage");
  if (base64Image) {
    const profileImageElement = document.querySelector("#user-info img");
    profileImageElement.src = base64Image || null;
    console.log("プロフィール画像がローカルストレージから設定されました");
  } else {
    console.log("ローカルストレージにプロフィール画像が見つかりませんでした");
  }
}


function compressAndEncodeImage(file, width, height, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      // PNG形式に変換し、色数を減らして圧縮
      const base64Image = canvas.toDataURL("image/png", 0.5);
      callback(base64Image);
    };
  };
}


const CACHE_NAME = 'ventus-talk-cache-v1';
const urlsToCache = [
  '/',
  '/loading.html',
  '/home/home.html',
  '/home/home.css',
  '/home/addFriend.js',
  '/talk/index.html',
  '/talk/app.js',
  '/talk/decorate.js',
  '/talk/group_window.css',
  '/settings/settings.html',
  '/style.css',
  '/menu.css',
  '/log.js',
  '/log.css',
  '/isLogined.js',
  '/firebase-setup.js',
  '/manifest.json',
  '/menuNavigation.js',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/IMG_3305.PNG?v=1737195730742',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOHome.png?v=1737195839565',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOTalk.png?v=1737195832005',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOSetting.png?v=1737195842738'
];

async function deleatCache() {
  const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log(`Deleting cache: ${cacheName}`);
        addLog('キャッシュを削除しました', "info");
        return caches.delete(cacheName);
      })
    );
}
async function updateCacheIfNeeded() {
  console.log('Checking if cache update is needed...');
  const getLastUpdated = () => localStorage.getItem('lastUpdated');
  const setLastUpdated = date => localStorage.setItem('lastUpdated', date);
  const isUpdateDue = () => {
    const lastUpdated = getLastUpdated();
    if (!lastUpdated) return true;
    const now = new Date().getTime();
    const threeDays = 2 * 24 * 60 * 60 * 1000;
    return now - lastUpdated >= threeDays;
  };

  if (!isUpdateDue()) {
    console.log('Cache update not needed.');
    return;
  }
  addLog('アプリ更新中',"info")

  try {
    await deleatCache()

    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urlsToCache);
    console.log('Cache updated');
    addLog("最新バージョンをインストールします。","info");
    setLastUpdated(new Date().getTime());
    window.location.reload();
  } catch (error) {
    console.error('Failed to update cache: ', error);
  }
}


async function hash(string) {
    if (!string) {
        alert('パスワードを入力してください');
        return;
    }
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(string);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        // ハッシュ値を16進数に変換して返す
        const hashedPassword = Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        console.log(hashedPassword);
        return hashedPassword;
    } catch (error) {
        console.error('エラー:', error);
      addLog(`${error}`)
        alert('エラーが発生しました');
    }
}

export { copyToClipboard,addLog,deleatCache, setProfileImageFromLocalStorage,compressAndEncodeImage,updateCacheIfNeeded,hash };

/*


addLog('??') blue
addLog('??',"error") red
success green
addLog('??',other) black

*/

function applyThemeToAllElements(theme) {
  const elements = document.querySelectorAll(
    "body, #left-panel, #right-panel, #user-info, #chat-box, .message-item .message-bubble, #send-button,#menu-bar"
  );
  elements.forEach((element) => {
    const currentClasses = element.className.split(" ");
    const newClasses = currentClasses.filter(
      (className) =>
        !className.endsWith("-mode") &&
        !className.startsWith("summer-") &&
        !className.startsWith("gradient-") &&
        !className.startsWith("forest-") &&
        !className.startsWith("sophisticated")
    );
    if (theme !== "default") {
      newClasses.push(theme);
    }
    element.className = newClasses.join(" ");
  });
}

// 初期テーマを適用
const savedTheme = localStorage.getItem("theme") || "default";
applyThemeToAllElements(savedTheme);
try {
  document.getElementById("theme-select").value = savedTheme;
} catch (_) {}

// テーマ変更時の処理
try {
  document
    .getElementById("theme-select")
    .addEventListener("change", (event) => {
      const selectedTheme = event.target.value;
      applyThemeToAllElements(selectedTheme);
      localStorage.setItem("theme", selectedTheme);
    });
} catch (_) {}

document.addEventListener("DOMContentLoaded", function () {
  var currentPage = window.location.pathname;
  if (
    currentPage.endsWith("talk/index.html") ||
    currentPage.endsWith("home/home.html") ||
    currentPage.endsWith("settings/settings.html")
  ) {
    // iPadかつブラウザ使用のチェック
    var isIpad = /iPad/.test(navigator.userAgent) && !window.navigator.standalone;
    
    if (window.matchMedia("(display-mode: standalone)").matches) {
      document.querySelector("#container").style.height = "100vh";
    } else if (isIpad) {
      document.querySelector("#container").style.height = "calc(100vh - 30px)";
    } else {
      document.querySelector("#container").style.height = "100vh";
    }

    // 共通のスタイル設定
    var container = document.querySelector("#container");
    container.style.display = "flex";
    container.style.overflow = "hidden";
  }
});
