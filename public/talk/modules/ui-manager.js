
export class UIManager {
  constructor() {
    // UIに関する設定を初期化
  }

  // フォントやテーマの設定など、UI関連の機能を実装
  setFont(fontFamily) {
    document.getElementById("chat-box").style.fontFamily = fontFamily;
    localStorage.setItem("font", fontFamily);
  }

  // モーダルウィンドウ制御
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("show");
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
    }
  }

  // チャットメッセージのスクロール制御
  scrollToBottom(smooth = true) {
    const chatBox = document.getElementById("chat-box");
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  // レスポンシブデザイン対応
  handleResponsiveLayout() {
    const isMobile = window.innerWidth < 768;
    const leftPanel = document.getElementById("left-panel");
    const rightPanel = document.getElementById("right-panel");
    
    if (isMobile) {
      if (rightPanel.classList.contains("open")) {
        leftPanel.style.display = "none";
      } else {
        leftPanel.style.display = "block";
      }
    } else {
      leftPanel.style.display = "block";
    }
  }

  // 返信表示のUI
  showReplyUI(messageId, content) {
    const replyTarget = document.getElementById("reply-target");
    const replyContent = document.getElementById("reply-content");
    
    replyTarget.style.display = "flex";
    replyContent.textContent = content;
    replyContent.setAttribute("messageId", messageId);
  }

  // メッセージ通知UI
  showNotification(title, body) {
    if (Notification.permission === "granted" && !document.location.href.includes("talk.html")) {
      new Notification(title, { body });
    }
  }
}
