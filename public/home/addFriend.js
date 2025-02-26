import {
  appd,
  app1,
  app2,
  appUsers,
  appInfo,
  dbdev,
  dbServer,
  db2,
  dbUsers,
  dbInfo,
  collection,
  addDoc,
  serverTimestamp,
  query,
  reloadPage,
  orderBy,
  username,
  setDoc,
  doc,
  getDoc,
  myuserId
} from "../firebase-setup.js";

import { addLog,setProfileImageFromLocalStorage,hash } from "../helper.js";
const myRowId = localStorage.getItem('userIdShow');

// デバッグログを追加
console.log("My User ID (hashed):", myuserId);
console.log("My Row User ID:", myRowId);

async function addFriendIDfromPage() {
  const addFriendWindow = document.getElementById("add-friend-window");
  addFriendWindow.classList.toggle("visible");
  const userIdElement = document.getElementById("friend");
  const rawUserId = userIdElement.value.trim(); // トリミングして空白を除去
  
  if (!rawUserId) {
    alert("ユーザーIDを入力してください");
    return;
  }
  
  console.log("フレンド追加試行:", rawUserId);
  const inputUserId = await hash(rawUserId);
  addFriend_ID(inputUserId, rawUserId);
}


async function addFriend_ID(userId, rawUserId) {
  addLog("しばし待て。", "info");
  console.log("searching for user:", userId, "raw:", rawUserId);
  
  if (myuserId === userId) {
    alert("自分を友達登録することはできません。あなたはぼっちですか？");
    return;
  }
  
  const userDocRef = doc(dbUsers, "users", userId);
  try {
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log("User found:", userDoc.data());
      
      // Add my ID to friend's friendList and rowFriendList
      let friendList = userDoc.data().friendList || [];
      let rowFriendList = userDoc.data().rowFriendList || [];
      
      console.log("Friend's existing lists:", {
        friendList,
        rowFriendList
      });
      
      // 既に存在するか確認
      if (!friendList.includes(myuserId)) {
        friendList.push(myuserId);
        if (!rowFriendList.includes(myRowId)) {
          rowFriendList.push(myRowId);
        }
        
        console.log("Updating friend's lists to:", {
          friendList, 
          rowFriendList
        });
        
        await setDoc(userDocRef, { 
          friendList: friendList,
          rowFriendList: rowFriendList 
        }, { merge: true });
        
        console.log("Friend added successfully.");
        addLog("Friend added successfully.", "success");
      } else {
        console.log("User is already your friend.");
        addLog("User is already your friend。", "info");
        // 既にフレンドの場合でも、rowFriendListが正しく設定されているか確認
        if (!rowFriendList.includes(myRowId)) {
          rowFriendList.push(myRowId);
          await setDoc(userDocRef, { rowFriendList: rowFriendList }, { merge: true });
          console.log("Updated rowFriendList for existing friend");
        }
      }

      // Generate ChatId and update ChatIdList for both users
      const chatId = generateChatId();
      const chatGroupName = `${rawUserId}と${myRowId}`;
      const serverID = "dev";
      const timestamp = Date.now();
      const newChatItem = { 
        chatId, 
        serverId: serverID, 
        pinned: false,
        timestamp: timestamp 
      };

      // Update friend's chatIdList
      const chatIdList = userDoc.data().chatIdList || [];
      if (!chatIdList.some((item) => item.chatId === chatId)) {
        chatIdList.push(newChatItem);
        await setDoc(userDocRef, { chatIdList }, { merge: true });
      }

      // Update my friendList and rowFriendList
      const myDocRef = doc(dbUsers, "users", myuserId);
      const myDoc = await getDoc(myDocRef);

      let myFriendList = myDoc.data().friendList || [];
      let myRowFriendList = myDoc.data().rowFriendList || [];
      
      console.log("My existing lists:", {
        myFriendList,
        myRowFriendList
      });
      
      if (!myFriendList.includes(userId)) {
        myFriendList.push(userId);
      }
      
      if (!myRowFriendList.includes(rawUserId)) {
        myRowFriendList.push(rawUserId);
      }
      
      console.log("Updating my lists to:", {
        myFriendList,
        myRowFriendList
      });
      
      await setDoc(myDocRef, { 
        friendList: myFriendList,
        rowFriendList: myRowFriendList
      }, { merge: true });

      // Update my chatIdList
      const myChatIdList = myDoc.data().chatIdList || [];
      if (!myChatIdList.some((item) => item.chatId === chatId)) {
        myChatIdList.push(newChatItem);
        await setDoc(myDocRef, { chatIdList: myChatIdList }, { merge: true });
      }
      const mantwo = true;
      
      // Create or update ChatGroup
      const chatGroupRef = doc(dbInfo, "ChatGroup", chatId);
      await setDoc(chatGroupRef, {
        usernames: [myuserId, userId],
        rawusernames: [myRowId, rawUserId],
        chatGroupName,
        serverID,
        mantwo,
      });
      
      // UI更新
      const friendListContainer = document.getElementById("friend-list");
      const existingFriend = document.querySelector(`.friend-item[data-friend-user-id="${userId}"]`);
      if (!existingFriend) {
        const friendItem = document.createElement("div");
        friendItem.className = "friend-item";
        friendItem.setAttribute("data-friend-user-id", userId);
        friendItem.textContent = rawUserId;
        friendListContainer.appendChild(friendItem);
      }
      
      // フレンド追加ウィンドウを閉じてフォームをリセット
      const addFriendWindow = document.getElementById("add-friend-window");
      addFriendWindow.classList.remove("visible");
      document.getElementById("friend").value = "";
      
    } else {
      console.log("User not found。");
      alert("ユーザーが見つかりません");
      addLog("User not found", "error");
    }
  } catch (error) {
    console.error("Error adding friend:", error);
    alert("フレンド追加中にエラーが発生しました: " + error.message);
  }
}

function generateChatId() {
  return Math.random().toString(36).substr(2, 9);
}

document
  .getElementById("register-button")
  .addEventListener("click", addFriendIDfromPage);

document.getElementById("add-friend").addEventListener("click", function () {
  const addFriendWindow = document.getElementById("add-friend-window");
  addFriendWindow.classList.toggle("visible");
  console.log("add friend");
  document.getElementById(
    "user-id-display"
  ).textContent = `ユーザーID: ${myRowId}`;
});

async function updateFriendList() {
  addLog("update friend list", "b");
  const friendListContainer = document.getElementById("friend-list");
  friendListContainer.innerHTML = ""; // コンテナをクリア
  
  const friendListDocRef = doc(dbUsers, `users/${myuserId}`);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
  );
  try {
    const friendListDoc = await Promise.race([
      getDoc(friendListDocRef),
      timeoutPromise,
    ]);
    console.log("back response");

    if (friendListDoc.exists()) {
      const friendListData = friendListDoc.data().friendList || [];
      const rowFriendListData = friendListDoc.data().rowFriendList || [];
      
      console.log("Friend list data:", friendListData);
      console.log("Row friend list data:", rowFriendListData);
      
      if (friendListData.length === 0) {
        addLog("FriendListが空です。", "");
        friendListContainer.innerHTML = "<div class='no-friends'>フレンドがいません</div>";
        return;
      }
      
      // フレンドリストとローフレンドリストのデータが矛盾していないかチェック
      if (friendListData.length !== rowFriendListData.length) {
        console.warn("友達リストの長さが一致しません", {
          friendListData,
          rowFriendListData
        });
      }
      
      for (let i = 0; i < friendListData.length; i++) {
        const friendUserId = friendListData[i];
        // 対応するraw IDを取得（存在する場合）
        const rawFriendId = (i < rowFriendListData.length) ? 
                           rowFriendListData[i] : 
                           "Unknown";
        
        const userDocRef = doc(dbUsers, `users/${friendUserId}`);
        try {
          const userDoc = await Promise.race([
            getDoc(userDocRef),
            timeoutPromise,
          ]);
          
          let displayName = rawFriendId;
          
          if (userDoc.exists()) {
            // ユーザーデータが存在すれば、そのユーザー名を使用
            if (userDoc.data().username) {
              displayName = userDoc.data().username;
            }
          }
          
          const friendItem = document.createElement("div");
          friendItem.className = "friend-item";
          friendItem.setAttribute("data-friend-user-id", friendUserId);
          friendItem.setAttribute("data-raw-id", displayName);
          friendItem.textContent = displayName;
          friendListContainer.appendChild(friendItem);
          
        } catch (error) {
          console.error(`Error fetching friend ${friendUserId}:`, error);
          // エラーが発生しても処理を続行
        }
      }
    } else {
      addLog("User document not found.", "error");
      friendListContainer.innerHTML = "<div class='error'>ユーザーデータが見つかりません</div>";
    }
  } catch (error) {
    console.error("Error updating friend list:", error);
    alert("エラーが発生しました。再試行してください: " + error.message);
    friendListContainer.innerHTML = "<div class='error'>フレンドリストの読み込み中にエラーが発生しました</div>";
  }
  addEventListenersToChatItems();
}

window.onload = function () {
  updateFriendList();
};

function addEventListenersToChatItems() {
  document.querySelectorAll(".friend-item").forEach((chatItem) => {
    chatItem.addEventListener("click", () => {
      const selectedChatId = chatItem.getAttribute("data-friend-user-id");
      const rawId = chatItem.getAttribute("data-raw-id");
      console.log("Selected friend:", selectedChatId, "Raw ID:", rawId);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const friend_query = getQueryParam("friendid");
  if (friend_query && localStorage.getItem("userID")) {
    try {
      const urlDecode = (str) => decodeURIComponent(str);
      const decoded = urlDecode(friend_query);
      console.log("Friend ID from URL:", decoded);
      const hashed = await hash(decoded);
      addFriend_ID(hashed, decoded);
    } catch (error) {
      console.error("Error processing friendid from URL:", error);
      alert("フレンド追加処理中にエラーが発生しました");
    }
  }
  setProfileImageFromLocalStorage();
});

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
