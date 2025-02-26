import { doc, updateDoc, arrayUnion, setDoc, serverTimestamp } from "../../firebase-setup.js";
import { addLog, hash } from "../../helper.js";

export class GroupManager {
  constructor(rawMyUserId, friendList, dbUsers, dbInfo) {
    this.rawMyUserId = rawMyUserId;
    this.friendList = friendList;
    this.dbUsers = dbUsers;
    this.dbInfo = dbInfo;
  }

  async createGroup(updateChatListCallback) {
    const groupNameInput = document.getElementById("group-name-input");
    const selectedFriendsContainer = document.getElementById("selected-friends");
    const groupName = groupNameInput.value.trim();
    
    // data-useridの属性から選択された友達のIDを取得
    const selectedFriends = [...selectedFriendsContainer.children]
      .map(child => child.getAttribute("data-userid"))
      .filter(id => id); // nullやundefinedを除外
    
    // バリデーション
    if (groupName === "" || selectedFriends.length === 0) {
      alert("グループ名と友達を選択してください。");
      return;
    }
    
    if (groupName.length >= 30) {
      addLog("30文字以内で入力してください。", "error");
      return;
    }
    
    try {
      const chatId = this.generateRandomId();
      // 自分と選択された友達のリスト
      const allMembers = [this.rawMyUserId, ...selectedFriends];
      const hashedAllMembers = await this.hashAllMembers(allMembers);
      
      // 各メンバーのchatIdListに新しいチャットを追加
      for (const userId of hashedAllMembers) {
        const userDocRef = doc(this.dbUsers, `users/${userId}`);
        await updateDoc(userDocRef, {
          chatIdList: arrayUnion({
            pinned: false,
            serverId: "dev",
            chatId: chatId,
            timestamp: Date.now(),
          }),
        });
      }
      
      // グループ情報をFirestoreに保存
      const base64Image = document.getElementById("group-settings-image").src;
      const chatGroupRef = doc(this.dbInfo, `ChatGroup/${chatId}`);
      await setDoc(chatGroupRef, {
        chatGroupName: groupName,
        usernames: hashedAllMembers,
        rawusernames: allMembers,
        Icon: base64Image,
        createdAt: serverTimestamp(),
      });
      
      // UI更新と後処理
      addLog("グループが作成されました！");
      this.closeGroupCreationWindow(groupNameInput);
      
      // チャットリストを更新
      if (typeof updateChatListCallback === 'function') {
        await updateChatListCallback();
      }
      
    } catch (error) {
      console.error("グループ作成中にエラーが発生しました:", error);
      addLog("グループ作成中にエラーが発生しました: " + error.message, "error");
      alert("グループ作成に失敗しました: " + error.message);
    }
  }

  async hashAllMembers(members) {
    const hashedMembers = await Promise.all(members.map(member => hash(member)));
    return hashedMembers;
  }

  generateRandomId() {
    return Math.random().toString(36).substring(2, 18);
  }

  closeGroupCreationWindow(groupNameInput) {
    const createGroupWindow = document.getElementById("create-group-window");
    const selectedFriendsContainer = document.getElementById("selected-friends");
    
    createGroupWindow.classList.remove("show");
    createGroupWindow.classList.add("hidden");
    groupNameInput.value = "";
    selectedFriendsContainer.innerHTML = "";
    
    const selectionCount = document.getElementById("selection-count");
    if (selectionCount) {
      selectionCount.textContent = "(0人選択中)";
    }
  }
}
