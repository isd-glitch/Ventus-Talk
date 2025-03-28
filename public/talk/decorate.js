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
  setupLoader(); // ローディングアニメーションのセットアップ

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

// デバイスタイプの検出
function detectDeviceType() {
  return window.innerWidth <= 768 || ('ontouchstart' in window) ? 'mobile' : 'desktop';
}

function addMessageActions(item) {
  const deviceType = detectDeviceType();
  
  // スマホ向けのスワイプ機能
  if (deviceType === 'mobile') {
    addSwipeListener(item);
  }
  
  // 全デバイス向けのメニューボタン
  addMenuButton(item);
}

function addMenuButton(item) {
  const messageBubble = item.querySelector(".message-bubble");
  if (!messageBubble || item.querySelector(".message-menu-btn")) return;
  
  // メニューボタン作成
  const menuBtn = document.createElement("button");
  menuBtn.className = "message-menu-btn";
  menuBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"></path></svg>';
  
  // メニュー作成
  const menu = document.createElement("div");
  menu.className = "message-action-menu hidden";
  
  // リプライボタン
  const replyBtn = document.createElement("button");
  replyBtn.className = "message-action-btn reply-btn";
  replyBtn.textContent = "返信する";
  replyBtn.addEventListener("click", () => {
    const messageId = messageBubble.getAttribute("messageId");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = messageBubble.innerHTML;
    const replyContentDiv = tempDiv.querySelector(".message-reply-content");
    if (replyContentDiv) {
      replyContentDiv.remove();
    }
    const replyContent = tempDiv.textContent || tempDiv.innerText;
    
    const replyTarget = document.getElementById("reply-target");
    const replyContentElement = document.getElementById("reply-content");
    replyContentElement.innerText = replyContent;
    replyContentElement.setAttribute("messageId", messageId);
    replyTarget.style.display = "block";
    
    menu.classList.add("hidden");
  });
  
  // コピーボタン
  const copyBtn = document.createElement("button");
  copyBtn.className = "message-action-btn copy-btn";
  copyBtn.textContent = "メッセージをコピー";
  copyBtn.addEventListener("click", () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = messageBubble.innerHTML;
    const replyContentDiv = tempDiv.querySelector(".message-reply-content");
    if (replyContentDiv) {
      replyContentDiv.remove();
    }
    const textContent = tempDiv.textContent || tempDiv.innerText;
    copyToClipboard(textContent.trim());
    
    // コピー完了を示すフィードバック表示
    const feedback = document.createElement("div");
    feedback.className = "copy-feedback";
    feedback.textContent = "コピーしました";
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.classList.add("fade-out");
      setTimeout(() => {
        document.body.removeChild(feedback);
      }, 300);
    }, 1500);
    
    menu.classList.add("hidden");
  });
  
  menu.appendChild(replyBtn);
  menu.appendChild(copyBtn);
  
  // メニューボタンクリック時の動作
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // 他のすべてのメニューを閉じる
    document.querySelectorAll(".message-action-menu").forEach(m => {
      if (m !== menu) m.classList.add("hidden");
    });
    // このメニューの表示/非表示を切り替え
    menu.classList.toggle("hidden");
  });
  
  // ページクリックでメニューを閉じる
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });
  
  // 要素をメッセージに追加
  item.appendChild(menuBtn);
  item.appendChild(menu);
}

function addSwipeListener(item) {
  let isDragging = false;
  let startX = 0;
  let offsetX = 0;
  const dragThreshold = 80; // 感度を下げるために閾値を小さく設定
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

  // スワイプ開始時のY座標も記録
  let startY = 0;
  let isHorizontalDrag = false;
  const directionThreshold = 10; // 縦スクロール判定の閾値

  item.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
    isHorizontalDrag = false; // 方向判定リセット
  });

  item.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;
    
    // まだ方向が決定していない場合は、方向を判定
    if (!isHorizontalDrag && Math.abs(diffX) < directionThreshold && Math.abs(diffY) > directionThreshold) {
      // 縦方向のドラッグと判定
      isDragging = false;
      item.style.transform = "";
      return;
    }
    
    if (Math.abs(diffX) > directionThreshold) {
      // 横方向のドラッグと判定
      isHorizontalDrag = true;
    }
    
    if (isHorizontalDrag) {
      offsetX = diffX;
      // 左方向のスワイプのみ処理
      if (offsetX < 0) {
        let adjustedOffsetX = offsetX;
        if (offsetX <= -dragThreshold) {
          const excess = offsetX + dragThreshold; // 閾値を超えた分
          adjustedOffsetX = -dragThreshold + excess * resistanceFactor;
        }
        item.style.transform = `translateX(${adjustedOffsetX}px)`;
        arrow.style.opacity = Math.min(Math.abs(offsetX) / dragThreshold, 1);
        item.classList.add("dragging");
      }
    }
  });

  item.addEventListener("touchend", () => {
    if (isDragging && isHorizontalDrag) {
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
    }
    
    // 状態をリセット
    item.style.transform = "";
    arrow.style.opacity = "0";
    item.classList.remove("dragging");
    isDragging = false;
    offsetX = 0;
  });

  item.addEventListener("touchcancel", () => {
    item.style.transform = "";
    arrow.style.opacity = "0";
    item.classList.remove("dragging");
    isDragging = false;
    offsetX = 0;
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
      addMessageActions(item); // 新しいメッセージに各種アクションを追加
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
  addMessageActions(item); // 最初に表示されているメッセージにもアクションを追加
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

// ローディングアニメーションの設定
function setupLoader() {
  // 既存のsloaderを探す
  const existingLoader = document.querySelector('.sloader');
  if (existingLoader) {
    // ローディングオーバーレイを作成
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    // sloaderの親要素を取得してオーバーレイを挿入
    const parent = existingLoader.parentNode;
    parent.insertBefore(overlay, existingLoader);
    
    // sloaderをオーバーレイの中に移動
    overlay.appendChild(existingLoader);
    
    // ローダーが非表示になるときにオーバーレイも非表示にする
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (existingLoader.style.display === 'none') {
            overlay.style.display = 'none';
          } else {
            overlay.style.display = 'flex';
          }
        }
      });
    });
    
    observer.observe(existingLoader, { attributes: true });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // メッセージバブル作成後にテーマを適用する関数
  function applyThemeToNewMessages() {
    const currentTheme = localStorage.getItem("theme") || "default";
    if (currentTheme === "default") return;

    // 新しく追加されたメッセージバブルを見つける
    const messageBubbles = document.querySelectorAll(".message-bubble:not(." + currentTheme + ")");
    messageBubbles.forEach(bubble => {
      bubble.classList.add(currentTheme);
    });
  }
  
  // チャットボックスの変更を監視
  const chatBox = document.getElementById('chat-box');
  if (chatBox) {
    // MutationObserver を使用して DOM の変更を検出
    const observer = new MutationObserver(function(mutations) {
      applyThemeToNewMessages();
    });
    
    // DOM の変更を監視する設定
    observer.observe(chatBox, {
      childList: true,  // 子ノードの追加または削除を監視
      subtree: true     // 子孫ノードの変更も監視
    });
  }
  
  // 初回実行
  applyThemeToNewMessages();
});
