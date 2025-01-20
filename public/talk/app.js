import { 
  dbdev, onMessage,collection,messaging,getToken, doc,addDoc,arrayUnion,
  reloadPage,updateDoc, setDoc,serverTimestamp,startAfter,onSnapshot,
  limit,query, orderBy,getDocs,getDoc
} from '../firebase-setup.js';
import {addLog} from '../log.js';
const username = localStorage.getItem('username');
const myuserId = localStorage.getItem('userID');

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
let selectedChatId = null;
/*
console.log('notification auth');
if (Notification.permission === "default") {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      console.log("通知が許可されました");
      saveuserToken();
    } else {
      console.log("通知が拒否されました");
    }
  });
}
*/

onMessage(messaging, (payload) => {
  console.log('フォアグラウンドメッセージ受信:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
  // 特定のページを開いている場合のみ通知を表示しない
  if (!document.location.href.includes('talk.html')) {
    new Notification(notificationTitle, notificationOptions);
  }
});


chatInput.addEventListener('keydown', function(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    sendButton.click();
  }
});

let unsubscribeMessages = null; // 現在のチャットのスナップショットリスナーを解除するための関数
let otherChatListeners = {}; // その他のチャットのスナップショットリスナーを保持するオブジェクト
// ランダムな16文字の英数字の文字列を生成する関数
function generateRandomId() {
  return Math.random().toString(36).substring(2, 18);
}
sendButton.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message || !selectedChatId) {
    alert(!selectedChatId ? 'チャットが選択されていません。' : 'メッセージが空です。');
    return;
  }
  const formattedMessage = message.replace(/\n/g, '<br>');
  const timestamp = new Date().toISOString();
  const messageId = generateRandomId();
  const newMessage = {
    timestamp: timestamp,
    message: formattedMessage,
    messageId: messageId,
    sender: myuserId
  };
  try {
    const chatRef = doc(dbdev, `ChatGroup/${selectedChatId}`);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      let messages = chatDoc.data().messages || [];
      messages.push(newMessage);
      // メッセージの数が100を超えた場合、古いメッセージを削除する
      if (messages.length > 100) {messages = messages.slice(-100);}
      await setDoc(chatRef, { messages }, { merge: true });
    } else {
      await setDoc(chatRef, { messages: [newMessage] });
    }
    chatInput.value = '';
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('メッセージ送信中にエラーが発生しました: ' + error.message);
    addLog('メッセージ送信中にエラーが発生しました: ' + error.message,error);
    reloadPage();
  }
});

async function loadMessages(chatId) {
    if (!chatId) {
        chatBox.innerHTML = '<p>チャットを選択してください。</p>';
        return;
    }
    if (unsubscribeMessages) {unsubscribeMessages();}
    selectedChatId = chatId;
    const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
    unsubscribeMessages = onSnapshot(chatRef, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
            chatBox.innerHTML = '<p>メッセージはまだありません。</p>';
            return;
        }
        const messages = docSnapshot.data().messages || [];
        if (messages.length === 0) {
            chatBox.innerHTML = '<p>メッセージはまだありません。</p>';
            return;
        }
        let lastDate = '';
        const messageHtmlArray = await Promise.all(messages.map(async (message, index) => {
            const { timestamp, sender, message: messageText, messageId } = message;
            if (index === messages.length - 1) {
                localStorage.setItem(`LastMessageId_${chatId}`, messageId);
            }
            let userName = 'Unknown';
            let userIcon = 'default-icon.png';
            if (sender !== myuserId) {
                const userRef = doc(dbdev, 'users', sender);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userName = userData.username || 'Unknown';
                    userIcon = userData.profile_ico || 'default-icon.png';
                }
            }
            const messageTimestamp = new Date(timestamp);
            const messageDate = messageTimestamp.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
            let dateDivider = '';
            if (messageDate !== lastDate) {
                lastDate = messageDate;
                dateDivider = `<div class="date-divider"><span>${messageDate}</span></div>`;
            }
            let previousTimestamp = null;
            let icon_html;
            let username_html;
            let margin_style = '';
            if (sender === myuserId) {
                icon_html = '';
                username_html = '';
                margin_style = 'margin-top: 0;';
            } else if (previousTimestamp && (messageTimestamp - previousTimestamp <= 15 * 60 * 1000)) {
                icon_html = '<img class="icon noicon" alt="" style="border:none">';
                username_html = '';
                margin_style = 'margin-top: 0;';
            } else {
                icon_html = `<img class="icon" src="${userIcon}" alt="${userName}のアイコン">`;
                username_html = `<div class="username">${userName}</div>`;
            }
            const escapedMessageText = escapeHtml(messageText);
            const linkedMessageText = linkify(escapedMessageText);
            const message_html = `
                ${dateDivider}
                <div class="message-item ${sender === myuserId ? 'self' : 'other'}">
                    ${icon_html}
                    <div class="message-content" style="${margin_style}">
                        ${username_html}
                        <div class="message-bubble">${linkedMessageText}</div>
                    </div>
                    <div class="timestamp">${messageTimestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>`;
            
            const youtubeEmbed = extractYoutubeEmbedUrl(linkedMessageText);
            if (youtubeEmbed) {
                return message_html + `<div class="youtube-embed"><iframe width="560" height="315" src="${youtubeEmbed}" frameborder="0" allowfullscreen></iframe></div>`;
            } else {
                return message_html;
            }

            previousTimestamp = messageTimestamp;
        }));
        chatBox.innerHTML = messageHtmlArray.join('');
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }, (error) => {
        console.error('メッセージ取得中にエラーが発生しました: ', error);
        addLog(`メッセージ取得中にエラーが発生しました:${error.message}`,"error");
    });
    updateOtherChatListeners();
}

function escapeHtml(text) {
    return text.replace(/<br\s*\/?>/gi, '__BR__') // <br>タグを一時的に置き換え
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/__BR__/g, '<br>'); // <br>タグを元に戻す
}

function linkify(text) {
    const urlPattern = /((https?|ftp):\/\/[^\s/$.?#].[^\s]*)/g;
    return text.replace(urlPattern, (match) => {
        const decodedUrl = decodeURIComponent(match);
        let modifiedUrl = decodedUrl;
        if (decodedUrl.includes('youtube.com') || decodedUrl.includes('youtu.be')) {
            modifiedUrl = extractYoutubeEmbedUrl(decodedUrl);
        }
        if (!decodedUrl.includes('youtube.com') && !decodedUrl.includes('youtu.be')) {
            return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(modifiedUrl)}</a><br><br><br><a href="https://edu-open-4step.glitch.me." target="_blank">規制回避用url</a><br>`;
        } else {
            return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(modifiedUrl)}</a>`;
        }
    });
}

function splitLongUrl(url, maxLength = 30) {
    const parts = url.match(new RegExp('.{1,' + maxLength + '}', 'g'));
    return parts.join('<wbr>'); // <wbr>タグを使用して適切な位置で改行
}

// YouTubeの埋め込みリンクを抽出する関数
function extractYoutubeEmbedUrl(text) {
    const youtubePattern = /https?:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([^\s&]+)/;
    const match = text.match(youtubePattern);
    if (match) {
        return `https://www.youtube-nocookie.com/embed/${match[4]}`;
    }
    return null;
}

async function updateOtherChatListeners() {
  console.log('update chat list');
  const userDocRef = doc(dbdev, 'users', myuserId);
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 8000)
    );
    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      console.error('User document not found.');
      return;
    }
    const chatIdList = userDoc.data().chatIdList || [];
    if (chatIdList.length === 0) {
      console.log('ChatIdListが空です。');
      return;
    }

    chatIdList.forEach(({ chatId }) => {
      if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
        const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
        otherChatListeners[chatId] = onSnapshot(chatRef, (doc) => {
          if (doc.exists()) {
            const messages = doc.data().messages || [];
            if (messages.length > 0) {
              const newMessage = messages[messages.length - 1];
              const { messageId, sender, message: messageText } = newMessage;
              const lastSeenMessageId = localStorage.getItem(`LastMessageId_${chatId}`);

              if (messageId !== lastSeenMessageId && selectedChatId !== chatId) {
                console.log(`New message in chat ${chatId}:`, messageText, `from ${sender}`);
                localStorage.setItem(`LastMessageId_${chatId}`, messageId);
                
                const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
                if (chatItem && !chatItem.classList.contains('new-message')) {
                  chatItem.classList.add('new-message');
                  const newMark = document.createElement('span');
                  newMark.classList.add('new-mark');
                  newMark.textContent = 'New!';
                  chatItem.appendChild(newMark);
                }
                /*
                // Push通知を表示
                if (Notification.permission === 'granted') {
                  navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(`新規メッセージ - ${sender}`, {
                      body: messageText,
                      icon: '/path/to/icon.png', // 通知アイコン
                      tag: `chat-${chatId}`, // 同一チャットの通知をまとめる
                      data: { chatId },
                    });
                  });
                } else if (Notification.permission !== 'denied') {
                  // ユーザーに通知の許可をリクエスト
                  
                  Notification.requestPermission().then((permission) => {
                    if (permission === 'granted') {
                      navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(`新規メッセージ - ${sender}`, {
                          body: messageText,
                          icon: '/path/to/icon.png',
                          tag: `chat-${chatId}`,
                          data: { chatId },
                        });
                      });
                    }
                  });
                }
                */
              }
            }
          }
        }, (error) => {
          console.error(`Error fetching messages for chat ${chatId}:`, error);
        });
      }
    });
  } catch (error) {
    console.error('Error updating chat list:', error);
    alert('エラーが発生しました。再試行してください: ' + error.message);
  }
}
import {setProfileImageFromLocalStorage} from '../log.js';
document.addEventListener("DOMContentLoaded", function() {
    setProfileImageFromLocalStorage();
    const rightPanel = document.getElementById("right-panel");
    const backButton = document.getElementById("back-button");
    backButton.addEventListener("click", function() {
        rightPanel.classList.remove("open");
    });
    ini_fileUpload();
});


function addEventListenersToChatItems() {
  document.querySelectorAll('.chat-item').forEach((chatItem) => {
    chatItem.addEventListener('click', () => {
      const chatId = chatItem.getAttribute('data-chat-id');
      // チャットを選択した際に「New!」マークを削除
      if (chatItem.classList.contains('new-message')) {
        chatItem.classList.remove('new-message');
        const newMark = chatItem.querySelector('.new-mark');
        if (newMark) {
          chatItem.removeChild(newMark);
        }
      }
      const rightPanel = document.getElementById("right-panel");
      rightPanel.classList.toggle("open");
      loadMessages(chatId);
    });
  });
}

async function updateChatList() {
  console.log('updatechat list');
  const chatList = document.getElementById('chat-list');
  const userDocRef = doc(dbdev, 'users', myuserId);

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 8000)
    );
    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      alert('User document not found。');
      return;
    }
    const chatIdList = userDoc.data().chatIdList || [];
    if (chatIdList.length === 0) {
      addLog('ChatIdListが空です。');
      return;
    }
    // debug: chatIdListの内容を確認
    console.log('chatIdList:', chatIdList);
    console.log('chatIdList:', chatIdList);
    const chatItems = chatIdList.map(({ chatId, pinned, serverId, timestamp }) => ({ chatId, pinned, serverId, timestamp }));

    // ソート: pinnedがtrueなら優先、その後timestampで新しい順に並び替え
    chatItems.sort((a, b) => {
      if (a.pinned && !b.pinned) {
        return -1;
      } else if (!a.pinned && b.pinned) {
        return 1;
      } else {
        return b.timestamp - a.timestamp;
      }
    });

    // debug: 並び替えたchatItemsの内容を確認
    console.log('chatItems:', chatItems);

    // チャットリストの表示更新
    chatList.innerHTML = chatItems.map(({ chatId }) => `
      <div class="chat-item" data-chat-id="${chatId}">
        <div class="chat-details">
          <div class="chat-group-name">Chat ID: ${chatId}</div>
          <div class="chat-last-message">No messages yet</div>
        </div>
      </div>
    `).join('');


    addEventListenersToChatItems();

    for (const { chatId } of chatItems) {
      if (!chatId) {
        console.error('Invalid chatId:', chatId);
        continue;
      }

      const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
      const chatGroupDoc = await getDoc(chatGroupRef);
      if (chatGroupDoc.exists()) {
        const { chatGroupName } = chatGroupDoc.data();
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-group-name`);
        if (chatItem && chatGroupName) {
          chatItem.textContent = chatGroupName;
        }
      } else {
        console.error('ChatGroup document does not exist:', chatId);
      }
    }
  } catch (error) {
    console.error('Error updating chat list:', error);
    addLog('エラーが発生しました。再試行してください: ' + error.message);
    reloadPage();
  }
}
/*
document.addEventListener('DOMContentLoaded', async () => {
 await updateChatList();
 await updateOtherChatListeners();
});
*/





/*
document.getElementById('reload_list').addEventListener('click',() => {
  console.log('update');
  updateChatList();
});

*/
// JavaScript for handling window appearance
const createGroupWindow = document.getElementById('create-group-window');
const statusButton = document.getElementById('status');
const closeButton = document.getElementById('close-window');

statusButton.addEventListener('click', () => {
    createGroupWindow.classList.remove('hidden');
    createGroupWindow.classList.add('show');
    updateFriendList();
});

closeButton.addEventListener('click', () => {
    createGroupWindow.classList.remove('show');
    createGroupWindow.classList.add('hidden');
});

window.onload = async () => {
  await saveuserToken();
  await updateChatList();
  const createGroupButton = document.getElementById('create-group-button');
  createGroupButton.addEventListener('click', createGroup);
  
  const savedFont = localStorage.getItem('font');
    if (savedFont) {
        document.getElementById('chat-box').style.fontFamily = savedFont;
    }
  updateOtherChatListeners();
};


async function updateFriendList() {
    const friendListContainer = document.getElementById('friend-list');
    const selectedFriendsContainer = document.getElementById('selected-friends');
    const selectedFriends = new Set(); // 選択された友達のセット
    const userDocRef = doc(dbdev, `users/${myuserId}`);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists) {
        friendListContainer.innerHTML = '<p>No user data found.</p>';
        return;
    }

    const userData = userDoc.data();
    const friends = userData.friendList || [];

    if (friends.length === 0) {
        friendListContainer.innerHTML = '<p>No friends found.</p>';
        return;
    }

    friendListContainer.innerHTML = '';
    friends.forEach((userId) => {
        const friendItem = document.createElement('div');
        friendItem.classList.add('friend-item');
        friendItem.textContent = userId;

        // イベントリスナーを追加
        friendItem.addEventListener('click', () => {
            if (selectedFriends.has(userId)) {
                // 選択されている場合は削除
                selectedFriends.delete(userId);
                const selectedFriendElement = [...selectedFriendsContainer.children].find(child => child.textContent === userId);
                if (selectedFriendElement) {
                    selectedFriendsContainer.removeChild(selectedFriendElement);
                }
            } else {
                // 選択されていない場合は追加
                selectedFriends.add(userId);
                const selectedFriend = document.createElement('div');
                selectedFriend.textContent = userId;
                selectedFriendsContainer.appendChild(selectedFriend);
            }
        });

        friendListContainer.appendChild(friendItem);
    });
}


async function createGroup() {
  const groupNameInput = document.getElementById('group-name-input');
  const selectedFriendsContainer = document.getElementById('selected-friends');
  const groupName = groupNameInput.value;
  const selectedFriends = [...selectedFriendsContainer.children].map(child => child.textContent);
  if (groupName === '' || selectedFriends.length === 0) {
    alert('グループ名と友達を選択してください。');
    return;
  }
  const chatId = generateRandomId();
  const allMembers = [myuserId, ...selectedFriends]; // 自分を含めたメンバー

  // グループメンバー全員の chatIdList に追加
  for (const userId of allMembers) {
    const userDocRef = doc(dbdev, `users/${userId}`);
    await updateDoc(userDocRef, {
      chatIdList: arrayUnion({
        pinned: false,
        serverId: "dev",
        chatId: chatId
      })
    });
  }
  // ChatGroup ドキュメントを作成
  const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
  await setDoc(chatGroupRef, {
    chatGroupName: groupName,
    messages: [],
    timestamp: new Date().toISOString(),
    usernames: allMembers
  });
  addLog('グループが作成されました！');
  groupNameInput.value = '';
  selectedFriendsContainer.innerHTML = '';
  document.getElementById('create-group-window').classList.toggle('visible');
}




async function saveuserToken() {
  try {
    // 現在の日付を取得
    const currentDate = new Date();
    // ローカルストレージから前回の更新日を取得
    const lastUpdate = localStorage.getItem('TokenLastUpdate');
    // 前回の更新日が存在し、かつ1ヶ月以内なら更新しない
    if (lastUpdate && (currentDate - new Date(lastUpdate)) <= 30 * 24 * 60 * 60 * 1000) {
      console.log('トークンはまだ有効です。更新は不要です。');
      return;
    }

    const token = await getToken(messaging, { vapidKey: 'BKUDfUUeYgn8uWaWW1_d94Xyt03iBIHoLvyu1MNGPPrc72J2m5E3ckzxLqwHrsCQ9uJ5m-VhuHEjxquWqyKzTGE' });
    console.log(token);
    if (token) {
      //await setDoc(doc(dbdev, 'users', myuserId), { token }, { merge: true });
      console.log('通知トークンが保存されました:', token);
      // ローカルストレージに現在の日付を保存
      localStorage.setItem('TokenLastUpdate', currentDate.toISOString());
    } else {
      console.warn('通知トークンを取得できませんでした');
    }
  } catch (error) {
    console.error('通知トークン保存中にエラーが発生しました:', error);
  }
}


async function getAccessToken() {
  const response = await fetch('/get-token');
  const data = await response.json();
  return data.token;
}

async function uploadFile(file) {
  const accessToken = await getAccessToken();
  const metadata = {
    name: file.name,
    parents: ["1QsqLlsAp5MUSHbn7Cibh9WQ8DG-oKdzl"]
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });
  if (!response.ok) {throw new Error(`アップロードに失敗しました: ${response.status}`);}
  const json = await response.json();
  return json;
}

function ini_fileUpload(){
  const fileUploadImage = document.getElementById('file-upload');
  const fileInput = document.getElementById('fileInput');
  const result = document.getElementById("chat-box");
  fileUploadImage.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    console.log('upload start');
    if (fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    try {
      addLog("アップロード中","b");
      const fileData = await uploadFile(file);
      const fileLink = `https://drive.google.com/file/d/${fileData.id}/view`;
      addLog("アップロード成功","info");
    } catch (error) {
      addLog(`エラー: ${error.message}`,"error");
    } finally {
      fileInput.value = "";
    }
  });
};

/*
function goOffline() {
  setTimeout(async () => {
    await setDoc(doc(dbdev, 'users', myuserId), { status: 'offline' }, { merge: true });
    console.log('オフライン状態をFirestoreに書き込みました');
  }, 3000); // 3秒の遅延
}

// オンライン状態の書き込み関数
function goOnline() {
  (async () => {
    await setDoc(doc(dbdev, 'users', myuserId), { status: 'online' }, { merge: true });
    console.log('オンライン状態をFirestoreに書き込みました');
  })();
}

// visibilitychangeイベントのリスナーを設定
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    goOffline();
  } else if (document.visibilityState === 'visible') {
    goOnline();
  }
});

// 初期ロード時にオンライン状態を設定
document.addEventListener('DOMContentLoaded', goOnline);

// ウィンドウが閉じられる前にオフライン状態を設定
window.addEventListener('beforeunload', goOffline);
*/


      /*offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // ページが開かれたことを通知
        registration.active.postMessage({ type: 'PAGE_STATUS', status: 'open' });

        window.addEventListener('beforeunload', () => {
          // ページが閉じられる前に通知
          registration.active.postMessage({ type: 'PAGE_STATUS', status: 'closed' });
        });
      });
    }
    
    */
  /*
      if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('../firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
*/
  
/*
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission(status => {console.log('Notification permission status:', status);});
};*/
