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
async function addFriendIDfromPage() {
  const addFriendWindow = document.getElementById("add-friend-window");
  addFriendWindow.classList.toggle("visible");
  const userIdElement = document.getElementById("friend");
  const rawUserId = userIdElement.value;
  const inputUserId = await hash(rawUserId);
  addFriend_ID(inputUserId,rawUserId);
}


async function addFriend_ID(userId,rawUserId) {
  addLog("しばし待て。", "info");
  console.log("searching");
  if (myuserId === userId) {
    alert("自分を友達登録することはできません。あなたはぼっちですか？");
    return;
  }
  const userDocRef = doc(dbUsers, "users", userId);
  try {
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log("User found:", userDoc.data());
      // Add to friend's friendList
      const friendList = userDoc.data().friendList || [];
      const friendsRowFriendList = userDoc.data().rowFriendList || [];
      if (!friendList.includes(myuserId)) {
        friendList.push(myuserId);
        friendsRowFriendList.push(myRowId)
        await setDoc(userDocRef, { friendList,rowFriendList:friendsRowFriendList }, { merge: true });
        console.log("Friend added successfully.");
        addLog("Friend added successfully.", "success");
      } else {
        console.log("User is already your friend.");
        addLog("User is already your friend。", "info");
        return;
      }

      // Generate ChatId and update ChatIdList for both users
      const chatId = generateChatId();
      const chatGroupName = `${rawUserId}と${myRowId}`;
      const serverID = "dev";
      const newChatItem = { chatId, serverID, pinned: false };

      // Update friend's chatIdList
      const chatIdList = userDoc.data().chatIdList || [];
      if (!chatIdList.some((item) => item.chatId === chatId)) {
        chatIdList.push(newChatItem);
        await setDoc(userDocRef, { chatIdList }, { merge: true });
      }

      // Update my friendList
      const myDocRef = doc(dbUsers, "users", myuserId);
      const myDoc = await getDoc(myDocRef);

      const myFriendList = myDoc.data().friendList || [];
      const myRowFriendList = myDoc.data().rowFriendList || [];
      if (!myFriendList.includes(userId)) {
        myFriendList.push(userId);
        myRowFriendList.push(myRowId);
        await setDoc(myDocRef, { friendList: myFriendList ,rowFriendList:myRowFriendList}, { merge: true });
      }

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
        rawusernames:[myRowId,rawUserId],
        chatGroupName,
        serverID,
        mantwo,
      });
      const friendListContainer = document.getElementById("friend-list");
      const friendItem = document.createElement("div");
      friendItem.className = "friend-item";
      friendItem.setAttribute("data-friend-user-id", userId);
      friendItem.textContent = rawUserId;
      friendListContainer.appendChild(friendItem);
    } else {
      console.log("User not found。");
      alert("User not found");
      addLog("User not found", "error");
    }
  } catch (error) {
    console.error("Error adding friend:", error);
    alert("Error adding friend: " + error.message);
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
  ).textContent = `ユーザーID: ${localStorage.getItem('userIdShow')}`;
});

async function updateFriendList() {
  addLog("update friend list", "b");
  const friendListContainer = document.getElementById("friend-list");
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
      if (friendListData.length === 0) {
        addLog("FriendListが空です。", "");
        return;
      }
      for (const friendUserId of friendListData) {
        const userDocRef = doc(dbUsers, `users/${friendUserId}`);
        const userDoc = await Promise.race([
          getDoc(userDocRef),
          timeoutPromise,
        ]);
        if (userDoc.exists()) {
          const username = userDoc.data().username;
          const friendItem = document.createElement("div");
          friendItem.className = "friend-item";
          friendItem.setAttribute("data-friend-user-id", friendUserId);
          friendItem.textContent = username;
          friendListContainer.appendChild(friendItem);
        }
      }
    } else {
      addLog("User document not found.", "error");
    }
  } catch (error) {
    console.error("Error updating friend list:", error);
    alert("エラーが発生しました。再試行してください: " + error.message);
    reloadPage();
  }
  addEventListenersToChatItems();
}

/*
document.addEventListener('DOMContentLoaded', () => {
  updateFriendList();
});
*/
window.onload = function () {
  updateFriendList();
};

function addEventListenersToChatItems() {
  document.querySelectorAll(".friend-item").forEach((chatItem) => {
    chatItem.addEventListener("click", () => {
      const selectedChatId = chatItem.getAttribute("data-friend-user-id");
      console.log(selectedChatId);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const friend_query = getQueryParam("friendid");
  if (friend_query && localStorage.getItem("userID")) {
    const hashed = await hash(friend_query)
    addFriend_ID(hashed,friend_query);
  }
  setProfileImageFromLocalStorage();
  //qrcode_set()
});

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
