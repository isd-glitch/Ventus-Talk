import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "../../firebase-setup.js";

/**
 * チャット削除機能を管理するクラス
 */
export class ChatDeletionManager {
  /**
   * @param {string} myUserId - ログインユーザーのハッシュ化されたID
   * @param {object} dbInfo - チャットグループ情報のFirestoreインスタンス
   * @param {object} dbUsers - ユーザー情報のFirestoreインスタンス
   * @param {object} dbdev - チャット内容のFirestoreインスタンス
   * @param {function} onChatDeleted - チャット削除後に実行するコールバック
   */
  constructor(myUserId, dbInfo, dbUsers, dbdev, onChatDeleted) {
    this.myUserId = myUserId;
    this.dbInfo = dbInfo;
    this.dbUsers = dbUsers;
    this.dbdev = dbdev;
    this.onChatDeleted = onChatDeleted;
  }

  /**
   * チャットの削除処理を実行
   * @param {string} chatId - 削除するチャットのID
   */
  async deleteChat(chatId) {
    try {
      console.log(`チャット削除を開始: ${chatId}`);
      
      // 確認ダイアログを表示
      if (!confirm("このトークルームを削除してもよろしいですか？\nこの操作は元に戻せません。")) {
        return;
      }

      // ローディング表示
      this._showLoading();

      // 1. ChatGroupからユーザー情報を取得
      const chatUsers = await this._getChatUsers(chatId);
      if (!chatUsers || chatUsers.length === 0) {
        throw new Error("チャットユーザー情報の取得に失敗しました");
      }

      // 2. 各ユーザーのchatIdListからチャットを削除
      await this._removeFromUsersChatList(chatUsers, chatId);

      // 3. dbdevからチャットドキュメントを削除
      await this._deleteChatDocument(chatId);

      // 4. dbInfoからチャットグループ情報を削除
      await this._deleteChatGroup(chatId);

      console.log(`チャット削除が完了しました: ${chatId}`);
      alert("トークルームを削除しました");

      // コールバック関数を実行（チャットリストの更新など）
      if (this.onChatDeleted) {
        this.onChatDeleted();
      }
    } catch (error) {
      console.error("チャット削除中にエラーが発生しました:", error);
      alert(`削除に失敗しました: ${error.message}`);
    } finally {
      this._hideLoading();
    }
  }

  /**
   * ChatGroupからユーザー情報を取得
   * @param {string} chatId - チャットID
   * @returns {Promise<Array>} ユーザーIDの配列
   */
  async _getChatUsers(chatId) {
    try {
      const chatGroupRef = doc(this.dbInfo, "ChatGroup", chatId);
      const chatDoc = await getDoc(chatGroupRef);
      
      if (!chatDoc.exists()) {
        console.warn(`ChatGroup ${chatId} が見つかりません`);
        return [];
      }
      
      const chatData = chatDoc.data();
      return chatData.usernames || [];
    } catch (error) {
      console.error("チャットユーザー情報の取得に失敗:", error);
      throw error;
    }
  }

  /**
   * 各ユーザーのchatIdListからチャットを削除
   * @param {Array} userIds - ユーザーIDの配列
   * @param {string} chatId - 削除するチャットID
   */
  async _removeFromUsersChatList(userIds, chatId) {
    try {
      const updatePromises = userIds.map(async (userId) => {
        const userDocRef = doc(this.dbUsers, "users", userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.warn(`ユーザー ${userId} のドキュメントが見つかりません`);
          return;
        }

        const userData = userDoc.data();
        const chatIdList = userData.chatIdList || [];
        
        // chatIdList内から該当するchatIdを持つオブジェクトを除外
        const updatedChatIdList = chatIdList.filter(chat => chat.chatId !== chatId);
        
        if (chatIdList.length !== updatedChatIdList.length) {
          await updateDoc(userDocRef, { chatIdList: updatedChatIdList });
          console.log(`ユーザー ${userId} のchatIdListから ${chatId} を削除しました`);
        }
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("ユーザーのチャットリスト更新に失敗:", error);
      throw error;
    }
  }

  /**
   * dbdevからチャットドキュメントを削除
   * @param {string} chatId - 削除するチャットID
   */
  async _deleteChatDocument(chatId) {
    try {
      const chatRef = doc(this.dbdev, "chats", chatId);
      await deleteDoc(chatRef);
      console.log(`dbdev内のチャットドキュメント ${chatId} を削除しました`);
    } catch (error) {
      console.error("チャットドキュメントの削除に失敗:", error);
      throw error;
    }
  }

  /**
   * dbInfoからチャットグループ情報を削除
   * @param {string} chatId - 削除するチャットID
   */
  async _deleteChatGroup(chatId) {
    try {
      const chatGroupRef = doc(this.dbInfo, "ChatGroup", chatId);
      await deleteDoc(chatGroupRef);
      console.log(`dbInfo内のChatGroup ${chatId} を削除しました`);
    } catch (error) {
      console.error("ChatGroupの削除に失敗:", error);
      throw error;
    }
  }

  /**
   * ローディング表示を表示
   */
  _showLoading() {
    const loader = document.createElement("div");
    loader.id = "delete-chat-loader";
    loader.className = "sloader";
    loader.style.display = "flex";
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <div class="loader-text">トークルームを削除中...</div>
    `;
    document.body.appendChild(loader);
  }

  /**
   * ローディング表示を非表示
   */
  _hideLoading() {
    const loader = document.getElementById("delete-chat-loader");
    if (loader) {
      loader.remove();
    }
  }
}
