import { 
  dbdev, collection, doc,addDoc,arrayUnion,reloadPage,updateDoc, setDoc,serverTimestamp,startAfter,onSnapshot, limit,query, orderBy,getDocs,getDoc
} from '../firebase-setup.js';
const username = localStorage.getItem('username');
const myuserId = localStorage.getItem('userID');

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
let selectedChatId = null;
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
    sender: username
  };

  try {
    const chatRef = doc(dbdev, `ChatGroup/${selectedChatId}`);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const messages = chatDoc.data().messages || [];
      messages.push(newMessage);
      await setDoc(chatRef, { messages }, { merge: true });
    } else {
      await setDoc(chatRef, { messages: [newMessage] });
    }
    chatInput.value = '';
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('メッセージ送信中にエラーが発生しました: ' + error.message);
    reloadPage();
  }
});






async function loadMessages(chatId) {
  let previousTimestamp = null;
    if (!chatId) {
        chatBox.innerHTML = '<p>チャットを選択してください。</p>';
        return;
    }
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
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

            // 最後のメッセージIDをローカルストレージに保存
            if (index === messages.length - 1) {
                localStorage.setItem(`LastMessageId_${chatId}`, messageId);
            }

            // ユーザー名とアイコンの取得
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

            // タイムスタンプをDateオブジェクトに変換
            const messageTimestamp = new Date(timestamp);
            const messageDate = messageTimestamp.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

            // 日付が変わったら日付を中央に挿入
            let dateDivider = '';
            if (messageDate !== lastDate) {
                lastDate = messageDate;
                dateDivider = `<div class="date-divider"><span>${messageDate}</span></div>`;
            }

            // メッセージのHTMLを生成
            // 前のメッセージのタイムスタンプを記録するための変数
            

            const message_html = `
                ${dateDivider}
                <div class="message-item ${sender === myuserId ? 'self' : 'other'}">
                    ${sender === myuserId || (previousTimestamp && (messageTimestamp - previousTimestamp <= 15 * 60 * 1000)) ? '' : `<img class="icon" src="${userIcon}" alt="${userName}のアイコン">`}
                    <div class="message-content" style="${sender === myuserId || (previousTimestamp && (messageTimestamp - previousTimestamp <= 15 * 60 * 1000)) ? 'margin-top: 0;' : ''}">
                        ${sender === myuserId || (previousTimestamp && (messageTimestamp - previousTimestamp <= 15 * 60 * 1000)) ? '' : `<div class="username">${userName}</div>`}
                        <div class="message-bubble">${messageText}</div>
                    </div>
                    <div class="timestamp">${messageTimestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>`;

            // 現在のメッセージのタイムスタンプを前のメッセージのタイムスタンプとして保存
            previousTimestamp = messageTimestamp;
          return message_html;

        }));
        
        chatBox.innerHTML = messageHtmlArray.join('');
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }, (error) => {
        console.error('メッセージ取得中にエラーが発生しました: ', error);
        alert('メッセージ取得中にエラーが発生しました: ' + error.message);
    });
    // 他のチャットに対するリスナーを設定
    updateOtherChatListeners();
}

async function updateOtherChatListeners() {
  console.log('update chat list');
  const userDocRef = doc(dbdev, 'users', myuserId);
  
  try {
    // タイムアウトを設定
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 8000)
    );

    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    console.log('res');  // デバッグ用ログ

    if (!userDoc.exists()) {
      alert('User document not found.');
      return;
    }

    const chatIdList = userDoc.data().chatIdList || [];

    if (chatIdList.length === 0) {
      alert('ChatIdListが空です。');
      return;
    }

    // 現在のチャットを除外したその他のチャットに対してリスナーを設定
    chatIdList.forEach(({ chatId }) => {
      console.log(chatId, 'chatgroup');  // デバッグ用ログ

      if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
        const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
        
        otherChatListeners[chatId] = onSnapshot(chatRef, (doc) => {
          console.log('onSnapshot called for chatId:', chatId);  // デバッグ用ログ

          if (doc.exists()) {
            console.log('Document exists for chatId:', chatId);  // デバッグ用ログ
            const messages = doc.data().messages || [];

            if (messages.length > 0) {
              const newMessage = messages[messages.length - 1]; // 最新のメッセージを取得
              const { messageId, sender, message: messageText } = newMessage;
              const lastSeenMessageId = localStorage.getItem(`LastMessageId_${chatId}`);

              if (messageId !== lastSeenMessageId && selectedChatId !== chatId) {
                console.log(`New message in chat ${chatId}:`, messageText, `from ${sender}`);

                const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
                if (chatItem && !chatItem.classList.contains('new-message')) {
                  chatItem.classList.add('new-message');
                  const newMark = document.createElement('span');
                  newMark.classList.add('new-mark');
                  newMark.textContent = 'New!';
                  chatItem.appendChild(newMark);
                }
              }
            }
          } else {
            console.log('No document exists for chatId:', chatId);  // デバッグ用ログ
          }
        }, (error) => {
          console.error(`Error fetching messages for chat ${chatId}:`, error);
        });
      }
    });
  } catch (error) {
    console.error('Error updating chat list:', error);
    alert('エラーが発生しました。再試行してください: ' + error.message);
    reloadPage();
  }
}



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
      alert('ChatIdListが空です。');
      return;
    }
    // debug: chatIdListの内容を確認
    console.log('chatIdList:', chatIdList);
    const chatItems = chatIdList.map(({ chatId, pinned, serverId }) => ({ chatId, pinned, serverId }));
    // debug: chatItemsの内容を確認
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
    alert('エラーが発生しました。再試行してください: ' + error.message);
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
  await updateChatList();
  const createGroupButton = document.getElementById('create-group-button');
  createGroupButton.addEventListener('click', createGroup);
//  updateOtherChatListeners();
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

  alert('グループが作成されました！');

  // 正常にグループが作成されたら、入力フィールドをクリアし、ウィンドウを閉じる
  groupNameInput.value = '';
  selectedFriendsContainer.innerHTML = '';
  document.getElementById('create-group-window').classList.toggle('visible');
}
