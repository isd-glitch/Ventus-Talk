import { 
    appd, app1, app2, appUsers, appInfo, 
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
    chatBox, chatInput, sendButton, username 
} from '../firebase-setup.js';




// Firebase SDKをインポート

//Require文はブラウザじゃ動かないらしい　これに気づくのに時間かかった
// メッセージ送信処理（例としてdbdevを使用）
let selectedChatId = null;

// メッセージ送信
sendButton.addEventListener('click', async () => {
  const message = chatInput.value;
  if (message && selectedChatId) {
    try {
      await addDoc(collection(dbdev, `ChatGroup/${selectedChatId}/messages`), {
        text: message,
        ResourceURL: "",
        sender: username,
        timestamp: serverTimestamp(),
      });
      //alert('Message sent: ' + message);
      chatInput.value = '';
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Error sending message: ' + error.message);
    }
  } else if (!selectedChatId) {
    alert('チャットが選択されていません。');
  }
});

// メッセージ表示
function loadMessages(chatId) {
  if (!chatId) {
    chatBox.innerHTML = '<p>チャットを選択してください。</p>';
    return;
  }
  const q = query(
    collection(dbdev, `ChatGroup/${chatId}/messages`),
    orderBy('timestamp')
  );
  // onSnapshotを設定
  onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = ''; // 初期化
    if (snapshot.empty) {
      chatBox.innerHTML = '<p>メッセージはまだありません。</p>';
      return;
    }
    snapshot.forEach((doc) => {
      const messageData = doc.data();
      const message = document.createElement('div');
      message.textContent = `${messageData.sender}: ${messageData.text}`;
      message.classList.add('message-item');

      // 自分のメッセージかどうかをチェックしてクラスを追加
      if (messageData.sender === username) { // '自分のユーザー名'を適切な値に置き換えてください
        message.classList.add('self');
      } else {
        message.classList.add('other');
      }

      chatBox.appendChild(message);
    });

    // メッセージが追加された後にスムーズに一番下までスクロール
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: 'smooth'
    });
  }, (error) => {
    console.error('Error fetching messages: ', error);
    alert('Error fetching messages: ' + error.message);
  });
}

// チャットアイテムのクリックイベント設定
function addEventListenersToChatItems() {
  const chatItems = document.querySelectorAll(".chat-item");
  chatItems.forEach((chatItem) => {
    chatItem.addEventListener("click", () => {
      const chatId = chatItem.getAttribute("data-chat-id");
      console.log(`トークが選択されました: Chat ID = ${chatId}`);
      selectedChatId = chatId; // 選択したChatIDを設定
      loadMessages(chatId); // メッセージをロード
    });
  });
}

// 初期化処理
document.addEventListener("DOMContentLoaded", () => {
  // 初期のチャットリストにイベントリスナーを設定
  addEventListenersToChatItems();

  // 動的追加に対応するためのMutationObserver
  const chatList = document.getElementById("chat-list");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        addEventListenersToChatItems();
      }
    });
  });

  observer.observe(chatList, { childList: true });
});