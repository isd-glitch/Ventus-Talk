import {
  dbdev,
  dbServer,
  onMessage,
  collection,
  messaging,
  getToken,
  doc,
  addDoc,
  arrayUnion,
  reloadPage,
  updateDoc,
  dbUsers,
  setDoc,
  serverTimestamp,
  startAfter,
  onSnapshot,
  limit,
  query,
  orderBy,
  getDocs,
  getDoc,
  dbInfo,
} from "../firebase-setup.js";

import {copyToClipboard} from '../helper.js';
window.addEventListener('message', (event) => {
    if (event.data === 'closeIframe') {
        document.getElementById('callPipContainer').style.display = 'none';
    }
});


document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("menu-button");
  const chatMenu = document.getElementById("chat-menu");
  const closeMenuButton = document.getElementById("close-menu-button");
  initSlide();

  // メニューアイコンのクリックイベント
  menuButton.addEventListener("click", () => {
    console.log("chat menu open");
    chatMenu.classList.remove("hidden");
    chatMenu.classList.add("open");
  });

  // 閉じるボタンのクリックイベント
  closeMenuButton.addEventListener("click", () => {
    chatMenu.classList.remove("open");
    chatMenu.classList.add("hidden");
  });
});
function addSwipeListener(item) {
  let isDragging = false;
  let startX = 0;
  let offsetX = 0;
  const dragThreshold = 150;
  const resistanceFactor = 0.3; // 抵抗の増加率
  const arrow = document.createElement("div");
  arrow.innerText = "↩︎";
  arrow.style.position = "absolute";
  arrow.style.right = "-35px";
  arrow.style.top = "50%";
  arrow.style.transform = "translateY(-50%)";
  arrow.style.fontSize = "30px";
  arrow.style.transition = "opacity 0.2s";
  arrow.style.opacity = "0";
  item.appendChild(arrow);

  item.addEventListener("touchstart", (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    item.classList.add("dragging");
    arrow.style.opacity = "1";
  });

  item.addEventListener("touchmove", (e) => {
    if (isDragging) {
      offsetX = e.touches[0].clientX - startX;
      // 閾値を超えると抵抗が増加する
      if (offsetX < 0) {
        let adjustedOffsetX = offsetX;
        if (offsetX <= -dragThreshold) {
          const excess = offsetX + dragThreshold; // 閾値を超えた分
          adjustedOffsetX = -dragThreshold + excess * resistanceFactor;
        }
        item.style.transform = `translateX(${adjustedOffsetX}px)`;
      }
    }
  });

  item.addEventListener("touchend", () => {
    if (isDragging) {
      if (offsetX <= -dragThreshold) {
        const showReplyTarget = function (replyContent) {
          const messageId = item
            .querySelector(".message-bubble")
            .getAttribute("messageId");
          const replyTarget = document.getElementById("reply-target");
          const replyContentElement = document.getElementById("reply-content");
          replyContentElement.innerText = replyContent; // Show only message-bubble content
          replyContentElement.setAttribute("messageId", messageId); // Save the messageId
          replyTarget.style.display = "block"; // Show the reply target
        };
        const messageBubble = item.querySelector(".message-bubble");
        let replyContent = "";
        if (messageBubble) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = messageBubble.innerHTML;
          const replyContentDiv = tempDiv.querySelector(
            ".message-reply-content"
          );
          if (replyContentDiv) {
            replyContentDiv.remove();
          }
          replyContent = tempDiv.textContent || tempDiv.innerText;
          showReplyTarget(replyContent);
        }
      }
      item.style.transform = "";
      arrow.style.opacity = "0";
      item.classList.remove("dragging");
      isDragging = false;
      offsetX = 0;
    }
  });

  item.addEventListener("touchcancel", () => {
    if (isDragging) {
      item.style.transform = "";
      arrow.style.opacity = "0";
      item.classList.remove("dragging");
      isDragging = false;
      offsetX = 0;
    }
  });
}

// バツボタンのイベントリスナーを追加
document.getElementById("close-reply").addEventListener("click", () => {
  document.getElementById("reply-target").style.display = "none";
  const replyContentElement = document.getElementById("reply-content");
  replyContentElement.innerText = "";
  replyContentElement.setAttribute("messageId", ""); // Save the messageId
});

// メッセージの追加を監視するMutationObserverの設定
const chatBox = document.getElementById("chat-box");

// MutationObserverを使って新しいメッセージが追加されたときにリスナーを追加
const observer = new MutationObserver(() => {
  convertReplyContent();
  const newMessages = chatBox.querySelectorAll(".message-item");
  newMessages.forEach((item) => {
    // 既にイベントリスナーが設定されていない場合のみ設定
    if (!item.hasAttribute("data-listener-attached")) {
      addSwipeListener(item); // 新しいメッセージにスワイプリスナーを追加
      item.setAttribute("data-listener-attached", "true"); // イベントリスナーが追加されたことをマーク
    }
  });
});

// Observerの設定
observer.observe(chatBox, {
  childList: true, // 子要素の追加を監視
  subtree: true, // サブツリーも監視
});

// 初期のメッセージにもリスナーを設定
document.querySelectorAll(".message-item").forEach((item) => {
  addSwipeListener(item); // 最初に表示されているメッセージにもリスナーを追加
  item.setAttribute("data-listener-attached", "true"); // 初期メッセージにもマークを設定
});

function convertReplyContent() {
  const messages = document.querySelectorAll(".message-item");

  messages.forEach((message) => {
    const replyContent = message.querySelector(".message-reply-content");

    if (replyContent && replyContent.getAttribute("convert") === "false") {
      const replyId = replyContent.textContent.trim();
      const replyElement = document.querySelector(
        `.message-bubble[messageid="${replyId}"]`
      );

      if (replyElement) {
        const replyText = replyElement.innerHTML;

        // Remove div tags from replyText, specifically removing those with class "message-reply-content"
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = replyText;
        const targetDiv = tempDiv.querySelector(".message-reply-content");
        console.log(tempDiv);

        // If there is a targetDiv, remove it
        if (targetDiv) {
          targetDiv.remove();
        }
        const textContent = tempDiv.textContent || tempDiv.innerText || "";
        replyContent.textContent = textContent.trim();
        replyContent.setAttribute("convert", "true");
      }
    }
  });
}

function closeNotification() {
  callDid(localStorage.getItem('selectedChatId'),localStorage.getItem('skyway-roomId'));
  var modal = document.getElementById("callNotification");
  modal.style.display = "none";
}

// スライドノブをタッチで動かす関数
function initSlide() {
  var container = document.querySelector(".slide-container");
  var knob = document.querySelector(".slide-knob");

  knob.addEventListener("click", function () {
    const skywayRoom = localStorage.getItem('skyway-roomId');
    var containerWidth = container.offsetWidth;
    var knobWidth = knob.offsetWidth;
    var newLeft = containerWidth - knobWidth; // Move to the right edge
    /*
    var iframe = document.createElement("iframe");
    iframe.src = `../call/call.html?callTo=${skywayRoom}`;
    iframe.id = "callPipContainer";
    iframe.className = "pip";
    document.body.appendChild(iframe);
    localStorage.setItem('skyroom-Id',skywayRoom)
    */
    copyToClipboard(`https://ventus-talk.glitch.me/call/call.html?callTo=${skywayRoom}`)
    
    var newWindow = window.open(`../call/call.html?callTo=${skywayRoom}`,'_blank');
    if (newWindow) {
      newWindow.focus()
    }else{
      alert('pop up blocked');
    }
    

    knob.style.left = newLeft + "px";
    // Close the notification after the transition is complete (300ms in this case)
    setTimeout(function () {
      localStorage.setItem("caller",false);
      knob.style.left = 0;
      closeNotification();
    }, 300);
  });
}

async function callDid(selectedChatId,messageId) {
  const docRef = doc(dbdev, `ChatGroup/${selectedChatId}`);
  const docSnapshot = await getDoc(docRef);
  if (docSnapshot.exists()) {
    const messages = docSnapshot.data().messages || [];
    const messageIndex = messages.findIndex(message => message.messageId === messageId);
    if (messageIndex !== -1) {
      const updatedMessage = { ...messages[messageIndex], call: 'did' };
      messages[messageIndex] = updatedMessage;
      await updateDoc(docRef, { messages });
    }
  }
}

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
