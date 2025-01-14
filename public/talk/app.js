import { 
  dbdev, collection, addDoc, serverTimestamp, onSnapshot, limit,query, orderBy, username,getDocs,getDoc, myuserId ,doc
} from '../firebase-setup.js';

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
let selectedChatId = null;

sendButton.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message || !selectedChatId) {
    alert(!selectedChatId ? 'チャットが選択されていません。' : 'メッセージが空です。');
    return;
  }
  const formattedMessage = message.replace(/\n/g,'<br>');
  try {
    await addDoc(collection(dbdev, `ChatGroup/${selectedChatId}/messages`), {
      text: formattedMessage,
      ResourceURL: "",
      sender: username,
      timestamp: serverTimestamp(),
    });
    chatInput.value = '';
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('メッセージ送信中にエラーが発生しました: ' + error.message);
  }
});


let unsubscribeMessages = null; // 現在のチャットのスナップショットリスナーを解除するための関数
let otherChatListeners = {}; // その他のチャットのスナップショットリスナーを保持するオブジェクト

function loadMessages(chatId) {
  if (!chatId) {
    chatBox.innerHTML = '<p>チャットを選択してください。</p>';
    return;
  }

  // 前のスナップショットリスナーを解除
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  selectedChatId = chatId;

  const q = query(
    collection(dbdev, `ChatGroup/${chatId}/messages`),
    orderBy('timestamp')
  );

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = snapshot.empty
      ? '<p>メッセージはまだありません。</p>'
      : snapshot.docs.map(doc => {
          const { sender, text } = doc.data();
          return `<div class="message-item ${sender === username ? 'self' : 'other'}">
            ${sender}: ${text}
          </div>`;
        }).join('');
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });

    // 現在のチャットの最終メッセージIDを保存
    if (!snapshot.empty) {
      const lastMessageId = snapshot.docs[snapshot.docs.length - 1].id;
      localStorage.setItem(`lastSeenMessageId_${chatId}`, lastMessageId);
    }
  }, (error) => {
    console.error('Error fetching messages: ', error);
    alert('メッセージ取得中にエラーが発生しました: ' + error.message);
  });

  // 他のチャットに対するリスナーを設定
  updateOtherChatListeners();
}

async function updateOtherChatListeners() {
  const q = collection(dbdev, `users/${myuserId}/chatIdList`);
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert('ChatIdListが空です。');
    return;
  }

  // 現在のチャットを除外したその他のチャットに対してリスナーを設定
  snapshot.forEach((doc) => {
    const chatId = doc.id;
    if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
      const messagesRef = collection(dbdev, `ChatGroup/${chatId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1)); // 最新のメッセージを監視

      otherChatListeners[chatId] = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const newMessage = snapshot.docs[0];
          const lastSeenMessageId = localStorage.getItem(`lastSeenMessageId_${chatId}`);
          if (newMessage.id !== lastSeenMessageId && selectedChatId !== chatId) {
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
      }, (error) => {
        console.error(`Error fetching messages for chat ${chatId}: `, error);
      });
    }
  });
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
  const chatList = document.getElementById('chat-list');
  const q = collection(dbdev, `users/${myuserId}/chatIdList`);
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert('ChatIdListが空です。');
    return;
  }

  const chatItems = [];
  snapshot.forEach((doc) => {
    const { pinned, timestamp } = doc.data();
    const chatId = doc.id;
    chatItems.push({ chatId, pinned, timestamp });
  });

  chatItems.sort((a, b) => {
    if (a.pinned === b.pinned) return b.timestamp - a.timestamp;
    return b.pinned - a.pinned;
  });

  chatList.innerHTML = chatItems.map(({ chatId }) => `
    <div class="chat-item" data-chat-id="${chatId}">
      Chat ID: ${chatId}
    </div>
  `).join('');

  addEventListenersToChatItems();

  // chatGroupNameを取得して名前を更新
  for (const { chatId } of chatItems) {
    const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
    const chatGroupDoc = await getDoc(chatGroupRef);
    if (chatGroupDoc.exists()) {
      const { chatGroupName } = chatGroupDoc.data();
      const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
      if (chatItem && chatGroupName) {
        chatItem.textContent = chatGroupName;
      }
    } else {
      console.error('ChatGroup document does not exist: ', chatId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateChatList();
});
