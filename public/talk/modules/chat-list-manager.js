import { doc, getDoc, onSnapshot } from "../../firebase-setup.js";
import { addLog, hash } from "../../helper.js";

export class ChatListManager {
  constructor(myuserId, rawMyUserId, dbUsers, dbServer, dbInfo) {
    this.myuserId = myuserId;
    this.rawMyUserId = rawMyUserId;
    this.dbUsers = dbUsers;
    this.dbServer = dbServer;
    this.dbInfo = dbInfo;
    this.chatIdList = [];
    this.friendList = [];
    this.rowFriendList = [];
    this.chatGroupNameMap = {};
  }

  async updateChatList(selectChatCallback) {
    const chatList = document.getElementById("chat-list");
    const userDocRef = doc(this.dbUsers, "users", this.myuserId);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
      );
      const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
      if (!userDoc.exists()) {
        addLog("あなたのアカウントはクラウドに存在しません", "error");
        await localStorage.clear();
        window.location.href = "/login/login.html";
        return;
      }
      
      this.chatIdList = userDoc.data().chatIdList || [];
      this.friendList = userDoc.data().friendList || [];
      this.rowFriendList = userDoc.data().rowFriendList || [];

      if (this.chatIdList.length === 0) {
        addLog("ChatIdListが空です。");
        return;
      }
      
      console.log("chatIdList:", this.chatIdList);
      const chatItems = this.chatIdList.map(
        ({ chatId, pinned, serverId, timestamp }) => ({
          chatId,
          pinned,
          serverId,
          timestamp,
        })
      );
      
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
      
      chatList.innerHTML = chatItems
        .map(
          ({ chatId, serverId }) => `
          <div class="chat-item" data-chat-id="${chatId}" server="${serverId}">
            <div class="chat-details">
              <div class="chat-group-name">Chat ID: ${chatId}</div>
              <div class="chat-last-message">No messages yet</div>
            </div>
          </div>
        `
        )
        .join("");
      
      this.addEventListenersToChatItems(selectChatCallback);
      await this.updateChatGroupNames(chatItems);
    } catch (error) {
      console.error("Error updating chat list:", error);
      addLog("エラーが発生しました。アプリを開き直してください: " + error.message);
    }
  }

  async updateChatGroupNames(chatItems) {
    const chatGroupPromises = chatItems.map(async ({ chatId }) => {
      if (!chatId) {
        console.error("Invalid chatId:", chatId);
        return;
      }

      const chatGroupRef = doc(this.dbInfo, `ChatGroup/${chatId}`);
      try {
        const chatGroupDoc = await getDoc(chatGroupRef);

        if (chatGroupDoc.exists()) {
          const { chatGroupName, mantwo, Icon, rawusernames } =
            chatGroupDoc.data();
          const chatItem = document.querySelector(
            `.chat-item[data-chat-id="${chatId}"]`
          );
          const chatGroupNameElement =
            chatItem.querySelector(".chat-group-name");

          if (!mantwo) {
            console.log(Icon);
            chatGroupNameElement.textContent = chatGroupName;
            chatItem.classList.add("icon-base64");
            chatItem.style.setProperty("--base64-icon", `url(${Icon})`);
            this.chatGroupNameMap[chatId] = chatGroupName;
          } else {
            const otherUserId = rawusernames?.find((id) => id !== this.rawMyUserId);
            if (otherUserId) {
              console.log(otherUserId);
              chatGroupNameElement.textContent = otherUserId;
              const h = await hash(otherUserId);
              const otherUserProfileIco = await getDoc(
                doc(this.dbServer, `users/${h}`)
              );
              this.chatGroupNameMap[chatId] = otherUserId;
              if (
                otherUserProfileIco.exists() &&
                otherUserProfileIco.data()?.profile_ico
              ) {
                chatItem.classList.add("icon-base64");
                chatItem.style.setProperty(
                  "--base64-icon",
                  `url(${otherUserProfileIco.data().profile_ico})`
                );
              } else {
                console.error("Invalid document structure or data");
              }
            } else {
              console.error("No valid other user ID found");
            }
          }
        } else {
          console.error("ChatGroup document does not exist:", chatId);
        }
      } catch (error) {
        console.error("Error processing chat group:", error);
      }
    });

    await Promise.all(chatGroupPromises);
  }
  
  addEventListenersToChatItems(selectChatCallback) {
    document.querySelectorAll(".chat-item").forEach((chatItem) => {
      chatItem.addEventListener("click", async () => {
        const chatId = chatItem.getAttribute("data-chat-id");
        console.log("Chat selected:", chatId);
        
        try {
          // 選択したチャットの情報をデバッグ出力
          const chatGroupRef = doc(this.dbInfo, `ChatGroup/${chatId}`);
          const chatGroupDoc = await getDoc(chatGroupRef);
          if (chatGroupDoc.exists()) {
            const data = chatGroupDoc.data();
            console.log("Selected chat info:", {
              chatId,
              usernames: data.usernames || [],
              rawusernames: data.rawusernames || [],
              mantwo: data.mantwo
            });
          }
        } catch (error) {
          console.error("Error fetching chat info:", error);
        }
        
        // チャットを選択した際にNew!マーク削除
        document.getElementById("reply-target").style.display = "none";
        document.getElementById("reply-content").innerText = "";
        
        if (chatItem.classList.contains("new-message")) {
          chatItem.classList.remove("new-message");
          const newMark = chatItem.querySelector(".new-mark");
          if (newMark) {
            chatItem.removeChild(newMark);
          }
        }
        
        this.writeChatId(chatId);
        const rightPanel = document.getElementById("right-panel");
        rightPanel.classList.toggle("open");

        // Update the chat group name span tag
        const chatGroupName = this.chatGroupNameMap[chatId] || "Chat Group Name";
        document.getElementById("chat-group-name").textContent = chatGroupName;
        
        if (selectChatCallback) {
          console.log("Calling selectChat callback with:", chatId);
          selectChatCallback(chatId);
        }
      });
    });
  }
  
  writeChatId(chatId) {
    var chatInfoButton = document.getElementById("chat-info");
    chatInfoButton.innerHTML = " (ID: " + chatId + ")";
  }
  
  async updateFriendList() {
    const friendListContainer = document.getElementById("friend-list");
    const selectedFriendsContainer = document.getElementById("selected-friends");
    selectedFriendsContainer.innerHTML = ""; // 初期化
    
    // 最新のrowFriendListを取得
    try {
      const userDocRef = doc(this.dbUsers, "users", this.myuserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        this.rowFriendList = userDoc.data().rowFriendList || [];
      }
    } catch (error) {
      console.error("Failed to fetch updated friend list:", error);
    }
    
    // デバッグログを追加
    console.log("rowFriendList:", this.rowFriendList);
    
    if (!this.rowFriendList || !Array.isArray(this.rowFriendList)) {
      console.error("友達リストが不正な形式です:", this.rowFriendList);
      friendListContainer.innerHTML = "<p>No user data found.</p>";
      return;
    }

    if (this.rowFriendList.length === 0) {
      friendListContainer.innerHTML = "<p>No friends found.</p>";
      return;
    }

    // 選択状態を追跡するオブジェクト
    const selectedFriends = new Set();
    
    // 既存の選択カウント要素を確認して削除
    const existingCountElem = document.getElementById("selection-count");
    if (existingCountElem) {
      existingCountElem.parentNode.removeChild(existingCountElem);
    }
    
    // 友達のカウント表示用の要素を追加
    const selectionCountElem = document.createElement("div");
    selectionCountElem.id = "selection-count";
    selectionCountElem.className = "selection-count";
    selectionCountElem.textContent = "(0人選択中)";
    friendListContainer.parentNode.insertBefore(selectionCountElem, friendListContainer);

    // 自分のIDを排除して友達リストを作成
    friendListContainer.innerHTML = ""; // コンテナを明示的にクリア
    const filteredFriends = this.rowFriendList.filter(userId => {
      // null/undefined/空文字チェック
      if (!userId) return false;
      // 自分のIDを除外
      return userId !== this.rawMyUserId;
    });
    
    console.log("Filtered friends:", filteredFriends);
    console.log("My user ID:", this.rawMyUserId);
    
    if (filteredFriends.length === 0) {
      friendListContainer.innerHTML = "<p>表示できるフレンドがありません</p>";
      return;
    }
    
    // DOM操作を最小限にするためにフラグメントを使用
    const fragment = document.createDocumentFragment();
    
    // 各フレンドごとにDOMエレメントを作成
    filteredFriends.forEach((userId) => {
      if (!userId) return; // null/undefinedチェック
      
      const friendItem = document.createElement("div");
      friendItem.classList.add("friend-item");
      friendItem.textContent = userId;
      friendItem.setAttribute("data-userid", userId);

      // イベントリスナーを追加
      friendItem.addEventListener("click", () => {
        if (selectedFriends.has(userId)) {
          // 選択されている場合は削除
          selectedFriends.delete(userId);
          friendItem.classList.remove("selected");
          const selectedFriendElement = document.querySelector(`.selected-friend-item[data-userid="${userId}"]`);
          if (selectedFriendElement) {
            selectedFriendsContainer.removeChild(selectedFriendElement);
          }
        } else {
          // 選択されていない場合は追加
          selectedFriends.add(userId);
          friendItem.classList.add("selected");
          
          // 選択済みリストに追加
          const selectedFriend = document.createElement("div");
          selectedFriend.classList.add("selected-friend-item");
          selectedFriend.textContent = userId;
          selectedFriend.setAttribute("data-userid", userId);
          
          // 削除ボタンを追加
          const removeBtn = document.createElement("span");
          removeBtn.classList.add("remove-friend");
          removeBtn.textContent = "×";
          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // イベントの伝播を停止
            selectedFriends.delete(userId);
            friendItem.classList.remove("selected");
            selectedFriendsContainer.removeChild(selectedFriend);
            updateSelectionCount();
          });
          
          selectedFriend.appendChild(removeBtn);
          selectedFriendsContainer.appendChild(selectedFriend);
        }
        
        // 選択中の友達数を更新
        updateSelectionCount();
      });
      
      // フラグメントにアイテムを追加
      fragment.appendChild(friendItem);
    });
    
    // 一度にDOM追加
    friendListContainer.appendChild(fragment);
    
    // 検証のためにコンテナ内の要素数をログ出力
    console.log("友達要素の数:", friendListContainer.children.length);
    console.log("友達リストHTML:", friendListContainer.innerHTML);
    
    // 選択中の友達数を更新する関数
    function updateSelectionCount() {
      const countElement = document.getElementById("selection-count");
      if (countElement) {
        countElement.textContent = `(${selectedFriends.size}人選択中)`;
      }
    }
  }
}