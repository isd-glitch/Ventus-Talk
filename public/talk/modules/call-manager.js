import { doc, setDoc, arrayUnion } from "../../firebase-setup.js";
import { copyToClipboard } from "../../helper.js";

export class CallManager {
  constructor(selectedChatId, myuserId, username, dbdev, dbInfo) {
    this.selectedChatId = selectedChatId;
    this.myuserId = myuserId;
    this.username = username;
    this.dbdev = dbdev;
    this.dbInfo = dbInfo;
  }

  updateChatId(chatId) {
    this.selectedChatId = chatId;
  }

  async callSend() {
    const messageId = this.generateRandomId(); // messageIdとroomIdは共通
    localStorage.setItem("caller", "first");
    localStorage.setItem("skyway-roomId", messageId);
    
    var newWindow = window.open(`../call/call.html?callTo=${messageId}`, '_blank');
    if (newWindow) {
      newWindow.focus();
    } else {
      alert('ポップアップがブロックされました');
    }
    
    copyToClipboard(`https://ventus-talk.glitch.me/call/call.html?callTo=${messageId}`);
    
    try {
      await setDoc(
        doc(this.dbdev, `ChatGroup/${this.selectedChatId}`),
        {
          messages: arrayUnion({
            message: "Call",
            messageId: messageId,
            sender: this.myuserId,
            timestamp: new Date().toISOString(),
            call: "first",
          }),
        },
        { merge: true }
      );

      await setDoc(
        doc(this.dbInfo, `ChatGroup/${this.selectedChatId}`),
        {
          //サーバー通知用
          message: `${this.username}から電話`,
          lastMessageId: messageId,
          sender: this.myuserId,
          call: true,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("メッセージ送信中にエラーが発生しました: " + error.message);
    }
  }

  receiveCall(callData) {
    const { callerId, messageId } = callData;
    document.getElementById("callNotification").style.display = "flex";
    document.getElementById("caller").textContent = `${callerId}より電話着信`;
    
    // 応答ボタンのイベントリスナー設定
    document.getElementById("answer-call").addEventListener("click", () => {
      this.answerCall(messageId);
    });
    
    document.getElementById("decline-call").addEventListener("click", () => {
      this.declineCall(messageId);
    });
  }
  
  answerCall(messageId) {
    localStorage.setItem("skyway-roomId", messageId);
    localStorage.setItem("caller", "receiver");
    
    // 通話ページを開く
    window.open(`../call/call.html?callTo=${messageId}`, '_blank');
    
    // 通知を非表示
    document.getElementById("callNotification").style.display = "none";
  }
  
  declineCall(messageId) {
    // 通知を非表示
    document.getElementById("callNotification").style.display = "none";
    
    // 必要に応じて着信拒否のメッセージをデータベースに送信することも可能
  }
  
  generateRandomId() {
    return Math.random().toString(36).substring(2, 18);
  }
}