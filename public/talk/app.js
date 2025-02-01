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
import {
  addLog,
  setProfileImageFromLocalStorage,
  updateCacheIfNeeded,
  checkIfAwake,
  hash,
} from "../helper.js";
const username = localStorage.getItem("username");
const myuserId = localStorage.getItem("userID");
const rawMyUserId = localStorage.getItem("userIdShow");

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
let selectedChatId = null;

onMessage(messaging, (payload) => {
  console.log("フォアグラウンドメッセージ受信:", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
  if (!document.location.href.includes("talk.html")) {
    new Notification(notificationTitle, notificationOptions);
  }
});

chatInput.addEventListener("keydown", function (event) {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key === "Enter" &&
    chatInput.value
  ) {
    sendButton.click();
    //event.preventDefault();  // デフォルトのアクションを防止
  }
});

let unsubscribeMessages = null; // 現在のチャットのスナップショットリスナーを解除するための関数
let otherChatListeners = {}; // その他のチャットのスナップショットリスナーを保持するオブジェクト
// ランダムな16文字の英数字の文字列を生成する関数
function generateRandomId() {
  return Math.random().toString(36).substring(2, 18);
}
const messageQueue = [];
const MESSAGE_INTERVAL = 5000; // 5 seconds
const MAX_MESSAGES = 5;

sendButton.addEventListener("click", async () => {
  const message = chatInput.value.trim();
  if (!message || !selectedChatId) {
    if (!selectedChatId) {
      addLog("チャットが選択されていません。", "b");
    }
    return;
  }

  chatInput.value = "";
  const sendChatId = selectedChatId;
  const formattedMessage = message.replace(/\n/g, "<br>");
  const MAX_SIZE = 80000; // 80KB
  const messageSize = new Blob([formattedMessage]).size;
  if (messageSize > MAX_SIZE) {
    console.error("エラーログ: メッセージのデータサイズが80KBを超えています。");
    alert(
      "警告: メッセージのデータサイズが80KBを超えています。BANするぞ、テメェ。"
    );
    return;
  }

  const timestamp = new Date().toISOString();
  const messageId = generateRandomId();
  const replyTarget = document
    .getElementById("reply-content")
    .getAttribute("messageId");
  console.log(replyTarget);

  const newMessage = {
    timestamp: timestamp,
    message: formattedMessage,
    messageId: messageId,
    sender: myuserId,
    replyId: replyTarget,
  };

  messageQueue.push(newMessage);

  const messagesInLastInterval = messageQueue.filter(
    (msg) => new Date() - new Date(msg.timestamp) <= MESSAGE_INTERVAL
  );

  if (messagesInLastInterval.length > MAX_MESSAGES) {
    addLog("メッセージを連投しないで", "info");
    //setTimeout(() => sendToFirestore(newMessage), 3000);
    chatInput.value = message;
  } else {
    sendToFirestore(newMessage);
  }
});

async function sendToFirestore(newMessage) {
  try {
    const sendChatId = selectedChatId;
    document.getElementById("chat-input").focus();
    clearReplyShow();
    checkIfAwake();
    const chatRef = doc(dbdev, `ChatGroup/${sendChatId}`);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      let messages = chatDoc.data().messages || [];
      messages.push(newMessage);
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      let totalSize = new TextEncoder().encode(JSON.stringify(messages)).length;
      const maxSize = 1048576; // 1MB
      while (totalSize > maxSize) {
        messages.shift();
        totalSize = new TextEncoder().encode(JSON.stringify(messages)).length;
      }
      await setDoc(chatRef, { messages }, { merge: true });
    } else {
      await setDoc(chatRef, { messages: [newMessage] });
    }

    await setDoc(
      doc(dbInfo, `ChatGroup/${sendChatId}`),
      {
        message: newMessage.message.substring(0, 20),
        lastMessageId: newMessage.messageId,
        sender: newMessage.sender,
        senderUsername: username,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("メッセージ送信中にエラーが発生しました: " + error.message);
    addLog("メッセージ送信中にエラーが発生しました: " + error.message, error);
    chatInput.value = newMessage.message;
  }
}

let senderCache = {};
async function loadMessages(chatId) {
  chatBox.innerHTML = "";
  if (!chatId) {
    chatBox.innerHTML = "<p>チャットを選択してください。</p>";
    return;
  }
  if (unsubscribeMessages) {
    console.log(unsubscribeMessages);
    unsubscribeMessages();
  }
  selectedChatId = chatId;
  let added_message_id = [];
  const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
  let lastDate = "";
  let isinit = true;
  unsubscribeMessages = onSnapshot(
    chatRef,
    async (docSnapshot) => {
      if (!docSnapshot.exists()) {
        chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
        return;
      }
      const messages = docSnapshot.data().messages || [];
      if (messages.length === 0) {
        chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
        return;
      }

      const messageHtmlArray = [];
      for (const message of messages) {
        const {
          timestamp,
          sender,
          message: messageText,
          messageId,
          filename,
          replyId,
          resourceFileId,
          extension,
          call,
        } = message;
        if (added_message_id.includes(messageId)) {
          continue;
        } else {
          added_message_id.push(messageId);
        }
        if (!senderCache[sender]) {
          if (sender !== myuserId && sender) {
            console.log("Fetching user data from database");
            const server_userRef = doc(dbServer, "users", sender);
            const userDoc = await getDoc(server_userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              senderCache[sender] = {
                userName: userData.username || "Unknown",
                userIcon: userData.profile_ico || "default-icon.png",
              };
              console.log(senderCache[sender]);
            }
          } else {
            console.log("Sender is the current user");
            senderCache[sender] = {
              userName: username,
              userIcon: "null",
            };
          }
        }
        if (senderCache[sender]) {
          const { userName, userIcon } = senderCache[sender];
          const messageTimestamp = new Date(timestamp);
          const messageDate = messageTimestamp.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          let dateDivider = "";
          if (messageDate !== lastDate) {
            lastDate = messageDate;
            dateDivider = `<div class="date-divider"><span>${messageDate}</span></div>`;
          }
          let previousTimestamp = null;
          let icon_html;
          let username_html;
          let margin_style = "";
          if (sender === myuserId) {
            icon_html = "";
            username_html = "";
            margin_style = "margin-top: 0;";
          } else if (
            previousTimestamp &&
            messageTimestamp - previousTimestamp <= 15 * 60 * 1000
          ) {
            icon_html = '<img class="icon noicon" alt="" style="border:none">';
            username_html = "";
            margin_style = "margin-top: 0;";
          } else {
            icon_html = `<img class="icon" src="${userIcon}" alt="${userName}のアイコン">`;
            username_html = `<div class="username">${userName}</div>`;
          }
          let message_html = `
                    ${dateDivider}
                    <div class="message-item ${
                      sender === myuserId ? "self" : "other"
                    } draggable="true" >
                        ${icon_html}
                        <div class="message-content" style="${margin_style}">
                            ${username_html}`;
          const replyTargetDOM = replyId
            ? `<div class="message-reply-content" id="message-reply-content" convert="false">${replyId}</div>`
            : "";
          if (resourceFileId) {
            const fileType = getFileType(extension);
            if (fileType === "image") {
              message_html += `<a href="https://drive.google.com/uc?id=${resourceFileId}"><img src="https://drive.google.com/thumbnail?id=${resourceFileId}" alt="画像" class="message-image"></a>`;
            } else if (fileType === "video") {
              message_html += `
                        <iframe src="https://drive.google.com/file/d/${resourceFileId}/preview?controls=0" class="message-bubble" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                        <div class="message-bubble" messageId="${messageId}">${replyTargetDOM}
                          <a href="https://drive.google.com/file/d/${resourceFileId}/view?usp=drivesdk" target="_blank">ビデオを見る 動画は再生できるまでに時間がかかることがあります。</a>
                        </div>
                      `;
            } else {
              message_html += `<a href="https://drive.google.com/file/d/${resourceFileId}" class="message-bubble">${replyTargetDOM}${filename}ファイルを開く</a>`;
            }
          } else if (call) {
            console.log('t');
            if (
              sender !== myuserId &&
              1 * 60 * 1000 > new Date() - messageTimestamp &&
              call === 'first'
            ) {
              console.log(sender);
              document.getElementById(
                "caller"
              ).textContent = `${userName}より電話着信`;
              localStorage.setItem("skyway-roomId", messageId);
              document.getElementById("callNotification").style.display =
                "flex";
            }
            message_html += `<div class="message-bubble" messageId="${messageId}"><img class="call_bubble" id="call_bubble" src="https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/call.png?v=1738408814280"></div>`;
          } else {
            const escapedMessageText = escapeHtml(messageText);
            const formattedMessageText =
              insertWbrEvery100Chars(escapedMessageText);
            const linkedMessageText = linkify(formattedMessageText);
            message_html += `<div class="message-bubble" messageId="${messageId}">${replyTargetDOM}${linkedMessageText}</div>`;
          }
          message_html += `</div><div class="timestamp">${messageTimestamp.toLocaleTimeString(
            "ja-JP",
            { hour: "2-digit", minute: "2-digit" }
          )}</div></div>`;
          const youtubeEmbed = extractYoutubeEmbedUrl(linkify(messageText));
          if (youtubeEmbed) {
            message_html += `<div class="youtube-embed"><iframe width="560" height="315" src="${youtubeEmbed}" frameborder="0" allowfullscreen></iframe></div>`;
          }
          previousTimestamp = messageTimestamp;
          messageHtmlArray.push(message_html);
        }
      }

      messageHtmlArray.forEach(function (messageHtml) {
        chatBox.insertAdjacentHTML("beforeend", messageHtml);
      });
      chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
    },
    (error) => {
      console.error("メッセージ取得中にエラーが発生しました: ", error);
      addLog(
        `メッセージ取得中にエラーが発生しました:${error.message}`,
        "error"
      );
    }
  );
  updateOtherChatListeners();
}

function getFileType(extension) {
  const imageExtensions = ["jpg", "jpeg", "png", "gif"];
  const videoExtensions = ["mp4", "webm"];
  if (imageExtensions.includes(extension)) {
    return "image";
  } else if (videoExtensions.includes(extension)) {
    return "video";
  } else {
    return "file";
  }
}

function escapeHtml(text) {
  if (text) {
    return text
      .replace(/<br\s*\/?>/gi, "__BR__")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/__BR__/g, "<br>");
  } else {
    return text;
  }
}

function linkify(text) {
  const urlPattern = /((https?|ftp):\/\/[^\s/$.?#].[^\s]*)/g;
  return text.replace(urlPattern, (match) => {
    const decodedUrl = decodeURIComponent(match);
    let modifiedUrl = decodedUrl;
    if (decodedUrl.includes("youtube.com") || decodedUrl.includes("youtu.be")) {
      modifiedUrl = extractYoutubeEmbedUrl(decodedUrl);
    }
    if (
      !decodedUrl.includes("youtube.com") &&
      !decodedUrl.includes("youtu.be")
    ) {
      return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(
        modifiedUrl
      )}</a><br><a href="https://edu-open-4step.glitch.me." target="_blank">規制回避用url</a><br><br><br>`;
    } else {
      return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(
        modifiedUrl
      )}</a>`;
    }
  });
}

function splitLongUrl(url, maxLength = 30) {
  const parts = url.match(new RegExp(".{1," + maxLength + "}", "g"));
  return parts.join("<wbr>"); // <wbr>タグを使用して適切な位置で改行
}

// YouTubeの埋め込みリンクを抽出する関数
function extractYoutubeEmbedUrl(text) {
  const youtubePattern =
    /https?:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([^\s&]+)/;
  const match = text.match(youtubePattern);
  if (match) {
    return `https://www.youtube-nocookie.com/embed/${match[4]}`;
  }
  return null;
}

// 開業位置を調整する関数
function insertWbrEvery100Chars(text) {
  return text.replace(/(.{90})/g, "$1<wbr>");
}

function clearReplyShow() {
  document.getElementById("reply-target").style.display = "none";
  const replyContentElement = document.getElementById("reply-content");
  replyContentElement.innerText = "";
  replyContentElement.setAttribute("messageId", ""); // Save the messageId
}

async function updateOtherChatListeners() {
  console.log("update other chat list");
  //const userDocRef = doc(dbUser s, "users", myuserId);
  try {
    /*
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
    );
    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      console.error("User document not found.");
      return;
    }
    const chatIdList = userDoc.data().chatIdList || [];
    */
    if (chatIdList.length === 0) {
      console.log("ChatIdListが空です。");
      document.querySelector(".chat-group-name").textContent =
        "友達を追加してください";
      document.querySelector(".chat-last-message").textContent =
        "ホームからできます";
      return;
    }
    chatIdList.forEach(({ chatId }) => {
      if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
        const chatRef = doc(dbInfo, `ChatGroup/${chatId}`);
        otherChatListeners[chatId] = onSnapshot(
          chatRef,
          (doc) => {
            if (doc.exists()) {
              const { lastMessageId, sender, message } = doc.data();
              const lastSeenMessageId = localStorage.getItem(
                `LastMessageId_${chatId}`
              );
              if (
                lastMessageId !== lastSeenMessageId &&
                selectedChatId !== chatId
              ) {
                //console.log(`New message in chat ${chatId}:`, message, `from ${sender}`);
                localStorage.setItem(`LastMessageId_${chatId}`, lastMessageId);
                const chatItem = document.querySelector(
                  `.chat-item[data-chat-id="${chatId}"]`
                );
                if (chatItem && !chatItem.classList.contains("new-message")) {
                  chatItem.classList.add("new-message");
                  const newMark = document.createElement("span");
                  newMark.classList.add("new-mark");
                  newMark.textContent = "New!";
                  document.getElementById("reply-target").style.display =
                    "none";
                  document.getElementById("reply-content").innerText = "";
                  chatItem.appendChild(newMark);
                }
              }
            }
          },
          (error) => {
            console.error(`Error fetching messages for chat ${chatId}:`, error);
          }
        );
      }
    });
  } catch (error) {
    console.error("Error updating chat list:", error);
    alert("エラーが発生しました。再試行してください: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  ini_fileUpload();
  //init_profile_ico();
  const rightPanel = document.getElementById("right-panel");
  const backButton = document.getElementById("back-button");
  backButton.addEventListener("click", function () {
    rightPanel.classList.remove("open");
    selectedChatId = "";
    updateOtherChatListeners();
  });
});
// Object to store chat IDs and their corresponding group names
//-------------------------------------------------------select------------------------
const chatGroupNameMap = {};
function addEventListenersToChatItems() {
  document.querySelectorAll(".chat-item").forEach((chatItem) => {
    chatItem.addEventListener("click", () => {
      const chatId = chatItem.getAttribute("data-chat-id");
      // チャットを選択した際にNew!マーク削除
      clearReplyShow();
      if (chatItem.classList.contains("new-message")) {
        chatItem.classList.remove("new-message");
        const newMark = chatItem.querySelector(".new-mark");
        if (newMark) {
          chatItem.removeChild(newMark);
        }
      }
      writeChatId(chatId);
      const rightPanel = document.getElementById("right-panel");
      rightPanel.classList.toggle("open");

      // Update the chat group name span tag
      const chatGroupName = chatGroupNameMap[chatId] || "Chat Group Name";
      document.getElementById("chat-group-name").textContent = chatGroupName;
      if (selectedChatId == chatId) {
        return;
      } else {
        localStorage.setItem("selectedChatId", chatId);
        loadMessages(chatId);
      }
    });
  });
}
function writeChatId(chatId) {
  var chatInfoButton = document.getElementById("chat-info");
  chatInfoButton.innerHTML = " (ID: " + chatId + ")";
}

async function profileIcon() {
  const userInfoDocRef = doc(dbServer, "users", myuserId);
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
    );
    const userDoc = await Promise.race([
      getDoc(userInfoDocRef),
      timeoutPromise,
    ]);
    if (!userDoc.exists()) {
      addLog("not foundICON", "b");
      return;
    }
    localStorage.setItem("profileImage", userDoc.data().profile_ico);
    const username = userDoc.data().username;
    localStorage.setItem("username", username);
    setProfileImageFromLocalStorage();
    document.getElementById("username").textContent = username;
  } catch (error) {
    addLog(error, "error");
  }
}

let chatIdList = [];
let friendList = [];
let rowFriendList = [];

async function updateChatList() {
  const chatList = document.getElementById("chat-list");
  const userDocRef = doc(dbUsers, "users", myuserId);
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
    chatIdList = userDoc.data().chatIdList || [];
    friendList = userDoc.data().friendList || [];
    rowFriendList = userDoc.data().rowFriendList || [];

    if (chatIdList.length === 0) {
      addLog("ChatIdListが空です。");
      return;
    }
    console.log("chatIdList:", chatIdList);
    const chatItems = chatIdList.map(
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
    addEventListenersToChatItems();
    const chatGroupPromises = chatItems.map(async ({ chatId }) => {
      if (!chatId) {
        console.error("Invalid chatId:", chatId);
        return;
      }

      const chatGroupRef = doc(dbInfo, `ChatGroup/${chatId}`);
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
            chatGroupNameMap[chatId] = chatGroupName;
          } else {
            const otherUserId = rawusernames?.find((id) => id !== rawMyUserId);
            if (otherUserId) {
              console.log(otherUserId);
              chatGroupNameElement.textContent = otherUserId;
              const h = await hash(otherUserId);
              const otherUserProfileIco = await getDoc(
                doc(dbServer, `users/${h}`)
              );
              chatGroupNameMap[chatId] = otherUserId;
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
  } catch (error) {
    console.error("Error updating chat list:", error);
    addLog(
      "エラーが発生しました。アプリを開き直してください: " + error.message
    );
    //reloadPage();
  }
}

const createGroupWindow = document.getElementById("create-group-window");
const statusButton = document.getElementById("status");
const closeButton = document.getElementById("close-window");

statusButton.addEventListener("click", () => {
  createGroupWindow.classList.remove("hidden");
  createGroupWindow.classList.add("show");
  updateFriendList();
});

closeButton.addEventListener("click", () => {
  createGroupWindow.classList.remove("show");
  createGroupWindow.classList.add("hidden");
});

window.onload = async () => {
  updateCacheIfNeeded();
  await saveuserToken();
  await updateChatList();
  const createGroupButton = document.getElementById("create-group-button");
  createGroupButton.addEventListener("click", createGroup);
  const savedFont = localStorage.getItem("font");
  if (savedFont) {
    document.getElementById("chat-box").style.fontFamily = savedFont;
  }
  profileIcon();
  updateOtherChatListeners();
};

async function updateFriendList() {
  const friendListContainer = document.getElementById("friend-list");
  const selectedFriendsContainer = document.getElementById("selected-friends");
  const selectedFriends = new Set(); // 選択された友達のセット
  //const userDocRef = doc(dbUser s, `users/${myuserId}`);
  //const userDoc = await getDoc(userDocRef);
  if (!rowFriendList) {
    friendListContainer.innerHTML = "<p>No user data found.</p>";
    return;
  }
  //const userData = userDoc.data();
  //const friends = userData.friendList || [];
  if (rowFriendList.length === 0) {
    friendListContainer.innerHTML = "<p>No friends found.</p>";
    return;
  }

  friendListContainer.innerHTML = "";
  rowFriendList.forEach((userId) => {
    const friendItem = document.createElement("div");
    friendItem.classList.add("friend-item");
    friendItem.textContent = userId;

    // イベントリスナーを追加
    friendItem.addEventListener("click", () => {
      if (selectedFriends.has(userId)) {
        // 選択されている場合は削除
        selectedFriends.delete(userId);
        const selectedFriendElement = [
          ...selectedFriendsContainer.children,
        ].find((child) => child.textContent === userId);
        if (selectedFriendElement) {
          selectedFriendsContainer.removeChild(selectedFriendElement);
        }
      } else {
        // 選択されていない場合は追加
        selectedFriends.add(userId);
        const selectedFriend = document.createElement("div");
        selectedFriend.textContent = userId;
        selectedFriendsContainer.appendChild(selectedFriend);
      }
    });
    friendListContainer.appendChild(friendItem);
  });
}



async function hashAllMembers(members) {
    const hashedMembers = await Promise.all(members.map(member => hash(member)));
    return hashedMembers;
}

async function createGroup() {
  const groupNameInput = document.getElementById("group-name-input");
  const selectedFriendsContainer = document.getElementById("selected-friends");
  const groupName = groupNameInput.value;
  const selectedFriends = [...selectedFriendsContainer.children].map(
    (child) => child.textContent
  );
  if (groupName.trim() === "" || selectedFriends.length === 0) {
    alert("グループ名と友達を選択してください。");
    return;
  }
  if (groupName.length >= 30) {
    addLog("30文字以内で入力してください。", "error");
    return;
  }
  const chatId = generateRandomId();
  const allMembers = [myuserId, ...selectedFriends];
  const hashedAllMembers = await hashAllMembers(allMembers);
  for (const userId of allMembers) {
    const userDocRef = doc(dbUsers, `users/${userId}`);
    await updateDoc(userDocRef, {
      chatIdList: arrayUnion({
        pinned: false,
        serverId: "dev",
        chatId: chatId,
      }),
    });
  }
  const base64Image = document.getElementById("group-settings-image").src;
  const chatGroupRef = doc(dbInfo, `ChatGroup/${chatId}`);
  await setDoc(chatGroupRef, {
    chatGroupName: groupName,
    usernames: hashedAllMembers,
    Icon: base64Image,
  });
  document.getElementById("group-settings-image").src = null;
  addLog("グループが作成されました！");
  groupNameInput.value = "";
  selectedFriendsContainer.innerHTML = "";
  document.getElementById("create-group-window").classList.toggle("visible");
  const chatList = document.getElementById("chat-list");
  const serverId = "dev";
  chatList.innerHTML += `
      <div class="chat-item" data-chat-id="${chatId}" server="${serverId}">
        <div class="chat-details">
          <div class="chat-group-name">Chat ID: ${chatId}</div>
          <div class="chat-last-message">No messages yet</div>
        </div>
      </div>
    `;
  chatItem.querySelector(".chat-group-name").textContent = groupName;
  const chatItem = document.querySelector(
    `.chat-item[data-chat-id="${chatId}"]`
  );
  chatItem.classList.add("icon-base64");
  chatItem.style.setProperty("--base64-icon", `url(${base64Image})`);
}

async function saveuserToken() {
  try {
    const currentDate = new Date();
    const lastUpdate = localStorage.getItem("TokenLastUpdate");
    if (
      lastUpdate &&
      currentDate - new Date(lastUpdate) <= 30 * 24 * 60 * 60 * 1000
    ) {
      console.log("トークンはまだ有効です。更新は不要です。");
      return;
    }
    const token = await getToken(messaging, {
      vapidKey:
        "BKUDfUUeYgn8uWaWW1_d94Xyt03iBIHoLvyu1MNGPPrc72J2m5E3ckzxLqwHrsCQ9uJ5m-VhuHEjxquWqyKzTGE",
    });
    console.log(token);
    if (token) {
      await setDoc(
        doc(dbServer, "users", myuserId),
        { token },
        { merge: true }
      );
      console.log("通知トークンが保存されました:", token);
      localStorage.setItem("TokenLastUpdate", currentDate.toISOString());
    } else {
      console.warn("通知トークンを取得できませんでした");
    }
  } catch (error) {
    console.error("通知トークン保存中にエラーが発生しました:", error);
  }
}

async function getAccessToken() {
  const response = await fetch("/get-token");
  const data = await response.json();
  return data.token;
}

async function createFolderIfNotExists(folderName, parentId) {
  const accessToken = await getAccessToken();
  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const json = await response.json();
  if (json.files.length > 0) {
    return json.files[0].id;
  }

  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentId],
  };
  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!createResponse.ok) {
    throw new Error(`フォルダの作成に失敗しました: ${createResponse.status}`);
  }

  const createJson = await createResponse.json();
  return createJson.id;
}

function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = percentage + "%";
  console.log(percentage, "progress bar check");
  progressBar.textContent = Math.round(percentage) + "%";
}

function showProgressBar() {
  document.getElementById("progress-container").style.display = "block";
}

function hideProgressBar() {
  document.getElementById("progress-container").style.display = "none";
}

async function uploadFile(file) {
  const accessToken = await getAccessToken();
  const parentFolderId = "1QsqLlsAp5MUSHbn7Cibh9WQ8DG-oKdzl";
  const folderId = await createFolderIfNotExists(
    selectedChatId,
    parentFolderId
  );
  let fileData;

  if (file.size > 5 * 1024 * 1024) {
    // 5MB以上の場合
    fileData = await resumableUpload(file, accessToken, folderId);
  } else {
    // 5MB未満の場合
    fileData = await simpleUpload(file, accessToken, folderId);
  }

  console.log(fileData); // ここでfileDataの内容を確認
  return fileData;
}

async function simpleUpload(file, accessToken, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open(
    "POST",
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    true
  );
  xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      updateProgressBar(percentComplete);
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      console.log("アップロードに成功しました");
      updateProgressBar(100); // 完了時にプログレスバーを100%にする
    } else {
      console.error("アップロードに失敗しました: " + xhr.status);
    }
  };

  xhr.onerror = function () {
    console.error("ネットワークエラーが発生しました: " + xhr.status);
  };

  xhr.send(form);
  const response = await new Promise((resolve, reject) => {
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
  });

  return JSON.parse(response);
}

async function resumableUpload(file, accessToken, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };
  const init = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!init.ok) {
    throw new Error(`アップロードの初期化に失敗しました: ${init.status}`);
  }

  const uploadUrl = init.headers.get("Location");
  const CHUNK_SIZE = 256 * 1024; // 256KB
  let start = 0;
  const fileSize = file.size;
  let response;

  while (start < fileSize) {
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader(
      "Content-Range",
      `bytes ${start}-${end - 1}/${fileSize}`
    );
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = ((start + event.loaded) / fileSize) * 100;
        updateProgressBar(percentComplete);
      }
    };
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 308) {
        start = end;
      } else {
        console.error("アップロードに失敗しました: " + xhr.status);
      }
    };
    xhr.send(chunk);
    response = await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
    });
  }
  const finalResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Range": `bytes */${fileSize}`,
    },
  });

  if (!finalResponse.ok) {
    throw new Error(`アップロードに失敗しました: ${finalResponse.status}`);
  }

  const json = await finalResponse.json();
  updateProgressBar(100); // 完了時にプログレスバーを100%にする
  return json;
}

function ini_fileUpload() {
  const fileUploadImage = document.getElementById("file-upload");
  const fileInput = document.getElementById("fileInput");
  const result = document.getElementById("chat-box");
  fileUploadImage.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    console.log("upload start");
    if (fileInput.files.length === 0) return;
    showProgressBar();
    const files = Array.from(fileInput.files); // 複数ファイル対応
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split(".").pop();
        addLog(`アップロード中: ${file.name}`, "b");
        const fileData = await uploadFile(file);
        console.log(fileData); // ここでfileDataの内容を確認
        const timestamp = new Date().toISOString();
        const messageId = generateRandomId();
        const newMessage = {
          timestamp: timestamp,
          message: `${myuserId}から新規ファイル`,
          extension: fileExtension,
          filename: file.name,
          resourceFileId: fileData.id,
          messageId: messageId,
          sender: myuserId,
        };
        const docRef = doc(dbdev, "ChatGroup", selectedChatId);
        await updateDoc(docRef, {
          messages: arrayUnion(newMessage),
        });
        addLog(`アップロード成功: ${file.name}`, "info");
        const messageItem = document.createElement("div");
        messageItem.className = "message-item";
        console.log(fileData.id);
      }
    } catch (error) {
      addLog(`エラー: ${error.message}`, "error");
    } finally {
      fileInput.value = "";
      updateProgressBar(0); // 完了後にプログレスバーをリセットする
      hideProgressBar();
    }
  });
}

/*
// プロファイル画像を取得してローカルストレージに保存する関数
const saveProfileImageToLocalStorage = async (myUserId) => {
  try {
    const userDocRef = doc(dbUser s, `users/${myUserId}/profile_ico`);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const profileImage = userDocSnap.data().profileImage;
      localStorage.setItem("profileImage", profileImage);
      console.log("Profile image saved to local storage");
    } else {
      console.log("No such document!");
      //localStorage.clear();
      //window.location.href = "/login/login.html";      
    }
  } catch (error) {
    console.error("Error getting document:", error);
  }
};

function init_profile_ico() {
  if (localStorage.getItem("profileImage") === "init") {
    saveProfileImageToLocalStorage();
  }
}
*/
/*
window.addEventListener('scroll', function() {
  console.log('scroll');
  const chatBox = document.getElementById('chat-box');
  const scrollToBottomButton = document.getElementById('scroll-to-bottom');
  
  // チャットボックスが画面に表示されているかどうかを確認
  const chatBoxBottom = chatBox.getBoundingClientRect().bottom;
  const windowHeight = window.innerHeight;
  
  if (chatBoxBottom > windowHeight) {
    scrollToBottomButton.style.display = 'block';
  } else {
    scrollToBottomButton.style.display = 'none';
  }
});

// ボタンがクリックされたときに一番下にスクロールする
document.getElementById('scroll-to-bottom').addEventListener('click', function() {
  document.getElementById('chat-box').scrollIntoView({ behavior: 'smooth', block: 'end' });
});

*/
//import SkyWay from 'https://cdn.jsdelivr.net/npm/@skyway-webrtc/sdk';

async function callSend() {
  const messageId = generateRandomId(); //messageIdとroomIdは共通
  localStorage.setItem("caller", "first");
  localStorage.setItem("skyway-roomId", messageId);
  var iframe = document.createElement("iframe");
  iframe.src = `../call/call.html?room=${messageId}`;
  iframe.id = "callPipContainer";
  iframe.className = "pip";
  document.body.appendChild(iframe);
  try {
    await setDoc(
      doc(dbdev, `ChatGroup/${selectedChatId}`),
      {
        messages: arrayUnion({
          message: "Call",
          messageId: messageId,
          sender: myuserId,
          timestamp: new Date().toISOString(),
          call: "first",
        }),
      },
      { merge: true }
    );

    await setDoc(
      doc(dbInfo, `ChatGroup/${selectedChatId}`),
      {
        //サーバー通知用
        message: `${username}から電話`,
        lastMessageId: messageId,
        sender: myuserId,
        call: true,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("メッセージ送信中にエラーが発生しました: " + error.message);
    addLog("メッセージ送信中にエラーが発生しました: " + error.message, error);
  }
}
const call = document.getElementById("call");
call.addEventListener("click", function () {
  if (!selectedChatId) {
    addLog("チャットが選択されていません。", "b");
    return;
  } else {
    callSend();
  }
});

/*
function answerCall() {
  var container = document.querySelector('.slide-container');
  var knob = document.querySelector('.slide-knob');
  container.classList.add('active');
  setTimeout(function() {
    container.classList.remove('active');
    alert('電話を取りました！');
  }, 1000); // スライド完了後1秒後にアラート表示
}
// テスト用にページ読み込み後3秒でモーダルウィンドウを表示
window.onload = function() {
  setTimeout(answerCall, 3000);
}

*/
