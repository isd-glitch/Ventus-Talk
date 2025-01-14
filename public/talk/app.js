import { 
  dbdev, collection, doc,addDoc, setDoc,serverTimestamp,startAfter,onSnapshot, limit,query, orderBy,getDocs,getDoc
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
  const newMessage = `<!&!timestamp=${timestamp}!&!><!&!sender=${username}!&!><url=><!&!message=${formattedMessage}!&!><!&!messageId=${messageId}!&!>`;

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

    /*
    const last = doc(dbdev, 'users', myuserId, 'chatIdList', selectedChatId);
    await setDoc(last, { lastmessage: message });
    */
    chatInput.value = '';
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('メッセージ送信中にエラーが発生しました: ' + error.message);
  }
});

function loadMessages(chatId) {
  if (!chatId) {
    chatBox.innerHTML = '<p>チャットを選択してください。</p>';
    return;
  }
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
  selectedChatId = chatId;
  const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
  
  unsubscribeMessages = onSnapshot(chatRef, (doc) => {
    if (!doc.exists()) {
      chatBox.innerHTML = '<p>メッセージはまだありません。</p>';
      return;
    }
    const messages = doc.data().messages || [];
    chatBox.innerHTML = messages.length === 0
      ? '<p>メッセージはまだありません。</p>'
      : messages.map((message, index) => {
          const timestampMatch = message.match(/<!&!timestamp=(.*?)!&!>/);
          const senderMatch = message.match(/<!&!sender=(.*?)!&!>/);
          const messageMatch = message.match(/<!&!message=(.*?)!&!>/);
          const messageIdMatch = message.match(/<!&!messageId=(.*?)!&!>/);

          const timestamp = timestampMatch ? timestampMatch[1] : '';
          const sender = senderMatch ? senderMatch[1] : '';
          const messageText = messageMatch ? messageMatch[1] : '';
          const messageId = messageIdMatch ? messageIdMatch[1] : '';

          // 最後のメッセージIDをローカルストレージに保存
          if (index === messages.length - 1) {
            localStorage.setItem(`LastMessageId_${chatId}`, messageId);
          }

          return `<div class="message-item ${sender === username ? 'self' : 'other'}">
            ${sender}: ${messageText}
          </div>`;
        }).join('');
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
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
  snapshot.forEach((chatDoc) => { // 変数名を変更
    const chatId = chatDoc.id;
    if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
      const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
      otherChatListeners[chatId] = onSnapshot(chatRef, (doc) => {
        if (doc.exists()) {
          const messages = doc.data().messages || [];
          if (messages.length > 0) {
            const newMessage = messages[messages.length - 1]; // 最新のメッセージを取得
            const messageIdMatch = newMessage.match(/<!&!messageId=(.*?)!&!>/);
            const messageId = messageIdMatch ? messageIdMatch[1] : '';
            const lastSeenMessageId = localStorage.getItem(`LastMessageId_${chatId}`);
            
            if (messageId !== lastSeenMessageId && selectedChatId !== chatId) {
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
  const Asnapshot = await getDocs(q);

  if (Asnapshot.empty) {
    alert('ChatIdListが空です。');
    return;
  }

  const chatItems = [];
  Asnapshot.forEach((doc) => {
    const { pinned, lastMessage } = doc.data();
    const chatId = doc.id;
    chatItems.push({ chatId, pinned, lastMessage });
  });
/*
  chatItems.sort((a, b) => {
    if (a.pinned === b.pinned) return b.timestamp - a.timestamp;
    return b.pinned - a.pinned;
  });
  
  */
//アイコンは::beforeによって設定されている、後からロードする
  chatList.innerHTML = chatItems.map(({ chatId, lastMessage }) => `
    <div class="chat-item" data-chat-id="${chatId}">
      <div class="chat-details">
        <div class="chat-group-name">Chat ID: ${chatId}</div>
        <div class="chat-last-message">${lastMessage || 'No messages yet'}</div>
      </div>
    </div>
  `).join('');

  addEventListenersToChatItems();

  for (const { chatId } of chatItems) {
    const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
    const chatGroupDoc = await getDoc(chatGroupRef);
    if (chatGroupDoc.exists()) {
      const { chatGroupName } = chatGroupDoc.data();
      const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-group-name`);
      if (chatItem && chatGroupName) {
        chatItem.textContent = chatGroupName;
      }
    } else {
      console.error('ChatGroup document does not exist: ', chatId);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
 await updateChatList();
//  updateOtherChatListeners();
});

document.getElementById('reload_list').addEventListener('click',() => {
  console.log('update');
  updateChatList();
});
/*

window.onload = () => {
  updateChatList();
//  updateOtherChatListeners();
};
*/