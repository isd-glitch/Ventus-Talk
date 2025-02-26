import { doc, onSnapshot, setDoc, getDoc } from "../../firebase-setup.js";
import { addLog } from "../../helper.js";

export class ChatMessaging {
  constructor(chatBox, chatInput, sendButton, dbdev, dbServer, dbInfo, myuserId, username) {
    this.chatBox = chatBox;
    this.chatInput = chatInput;
    this.sendButton = sendButton;
    this.dbdev = dbdev;
    this.dbServer = dbServer;
    this.dbInfo = dbInfo;
    this.myuserId = myuserId;
    this.username = username;
    
    this.unsubscribeMessages = null;
    this.otherChatListeners = {};
    this.senderCache = {};
    this.messageQueue = [];
    this.MESSAGE_INTERVAL = 5000;
    this.MAX_MESSAGES = 5;
  }

  async sendMessage(selectedChatId) {
    const message = this.chatInput.value.trim();
    if (!message || !selectedChatId) {
      if (!selectedChatId) {
        addLog("チャットが選択されていません。", "b");
      }
      return;
    }

    this.chatInput.value = "";
    const sendChatId = selectedChatId;
    const formattedMessage = message.replace(/\n/g, "<br>");
    const MAX_SIZE = 80000; // 80KB
    const messageSize = new Blob([formattedMessage]).size;
    if (messageSize > MAX_SIZE) {
      console.error("エラーログ: メッセージのデータサイズが80KBを超えています。");
      alert("警告: メッセージのデータサイズが80KBを超えています。BANするぞ、テメェ。");
      return;
    }

    const timestamp = new Date().toISOString();
    const messageId = this.generateRandomId();
    const replyTarget = document
      .getElementById("reply-content")
      .getAttribute("messageId");
    console.log(replyTarget);

    const newMessage = {
      timestamp: timestamp,
      message: formattedMessage,
      messageId: messageId,
      sender: this.myuserId,
      replyId: replyTarget,
    };

    this.messageQueue.push(newMessage);

    const messagesInLastInterval = this.messageQueue.filter(
      (msg) => new Date() - new Date(msg.timestamp) <= this.MESSAGE_INTERVAL
    );

    if (messagesInLastInterval.length > this.MAX_MESSAGES) {
      addLog("メッセージを連投しないで", "info");
      this.chatInput.value = message;
    } else {
      await this.sendToFirestore(newMessage, sendChatId);
      localStorage.setItem(`LastMessageId_${sendChatId}`, messageId);
    }
  }

  async sendToFirestore(newMessage, sendChatId) {
    try {
      document.getElementById("chat-input").focus();
      this.clearReplyShow();
      const chatRef = doc(this.dbdev, `ChatGroup/${sendChatId}`);
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
        doc(this.dbInfo, `ChatGroup/${sendChatId}`),
        {
          message: newMessage.message.substring(0, 20),
          lastMessageId: newMessage.messageId,
          sender: newMessage.sender,
          senderUsername: this.username,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("メッセージ送信中にエラーが発生しました: " + error.message);
      addLog("メッセージ送信中にエラーが発生しました: " + error.message, error);
      this.chatInput.value = newMessage.message;
    }
  }

  async loadMessages(chatId) {
    this.chatBox.innerHTML = "";
    if (!chatId) {
      this.chatBox.innerHTML = "<p>チャットを選択してください。</p>";
      return;
    }
    if (this.unsubscribeMessages) {
      console.log(this.unsubscribeMessages);
      this.unsubscribeMessages();
    }
    
    let added_message_id = [];
    const chatRef = doc(this.dbdev, `ChatGroup/${chatId}`);
    let lastDate = "";
    let isinit = true;
    
    console.log("Loading messages for chat ID:", chatId);
    console.log("My user ID:", this.myuserId);
    
    this.unsubscribeMessages = onSnapshot(
      chatRef,
      async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          this.chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
          return;
        }
        const messages = docSnapshot.data().messages || [];
        console.log(`Found ${messages.length} messages in this chat`);
        
        if (messages.length === 0) {
          this.chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
          return;
        }

        // すべての送信者のIDを収集して一度にユーザー情報をロードする
        const uniqueSenders = [...new Set(messages.map(m => m.sender).filter(Boolean))];
        console.log("Unique senders in this chat:", uniqueSenders);
        
        // 自分自身を除く新しいユーザー情報を取得する
        const sendersToFetch = uniqueSenders.filter(
          senderId => senderId !== this.myuserId && !this.senderCache[senderId]
        );
        
        // 自分自身の情報をキャッシュに追加（まだなければ）
        if (this.myuserId && !this.senderCache[this.myuserId]) {
          this.senderCache[this.myuserId] = {
            userName: this.username || "Me",
            userIcon: localStorage.getItem("profileImage") || 
                     "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609",
          };
          console.log("Added current user to cache:", this.senderCache[this.myuserId]);
        }
        
        // 他のユーザー情報を非同期で取得
        if (sendersToFetch.length > 0) {
          console.log("Fetching user data for senders:", sendersToFetch);
          
          await Promise.all(
            sendersToFetch.map(async (senderId) => {
              try {
                console.log(`Attempting to fetch user data for sender ID: ${senderId}`);
                
                // DB構造が (ハッシュ化されたuserId)/username の場合、usersコレクション内のドキュメントを探す
                const server_userRef = doc(this.dbServer, "users", senderId);
                const userDoc = await getDoc(server_userRef);
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  console.log(`User data found for ${senderId}:`, userData);
                  
                  // usernameフィールドを直接取得する
                  const username = userData.username;
                  let profileIcon = userData.profile_ico || null;
                  
                  // Base64データチェック
                  if (profileIcon && this.isValidBase64Image(profileIcon)) {
                    console.log(`Valid base64 image found for ${senderId}`);
                    // Base64形式が正しい場合はそのまま使用
                  } else if (profileIcon) {
                    console.log(`Non-base64 or invalid image URL for ${senderId}: ${profileIcon.substring(0, 30)}...`);
                    // URLの場合はそのまま使用
                  } else {
                    profileIcon = "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609";
                    console.log(`No valid icon found for ${senderId}, using default`);
                  }
                  
                  if (username) {
                    console.log(`Username found for ${senderId}: ${username}`);
                    this.senderCache[senderId] = {
                      userName: username,
                      userIcon: profileIcon
                    };
                    console.log(`Sender cache updated for ${senderId} with icon length: ${profileIcon ? profileIcon.length : 0}`);
                  } else {
                    console.warn(`Username field not found in document for ${senderId}`);
                    this.senderCache[senderId] = {
                      userName: "No Username",
                      userIcon: profileIcon
                    };
                  }
                } else {
                  console.warn(`User document for ${senderId} does not exist in dbdev`);
                  
                  // バックアップ方法: 他のコレクションを試す
                  try {
                    const userInfoRef = doc(this.dbInfo, "users", senderId);
                    const userInfoDoc = await getDoc(userInfoRef);
                    
                    if (userInfoDoc.exists()) {
                      const userInfoData = userInfoDoc.data();
                      console.log(`Found user info in dbInfo for ${senderId}:`, userInfoData);
                      
                      let profileIcon = userInfoData.profile_ico || userInfoData.profileImage || userInfoData.icon;
                      
                      // Base64データチェック
                      if (profileIcon && this.isValidBase64Image(profileIcon)) {
                        console.log(`Valid base64 image found in dbInfo for ${senderId}`);
                      } else if (profileIcon) {
                        console.log(`Using URL image from dbInfo for ${senderId}`);
                      } else {
                        profileIcon = "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609";
                        console.log(`No valid icon found in dbInfo for ${senderId}, using default`);
                      }
                      
                      this.senderCache[senderId] = {
                        userName: userInfoData.username || userInfoData.userName || "User " + senderId.substring(0, 5),
                        userIcon: profileIcon
                      };
                    } else {
                      // 最後の手段として、ChatGroupの情報からユーザー名を取得
                      const chatInfoRef = doc(this.dbInfo, "ChatGroup", chatId);
                      const chatInfoDoc = await getDoc(chatInfoRef);
                      
                      if (chatInfoDoc.exists() && chatInfoDoc.data().senderUsername && 
                          chatInfoDoc.data().sender === senderId) {
                        console.log(`Found username in chat info for ${senderId}`);
                        this.senderCache[senderId] = {
                          userName: chatInfoDoc.data().senderUsername,
                          userIcon: "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609",
                        };
                      } else {
                        this.senderCache[senderId] = {
                          userName: "Unknown User",
                          userIcon: "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609",
                        };
                      }
                    }
                  } catch (backupError) {
                    console.error(`Backup retrieval failed for ${senderId}:`, backupError);
                    this.senderCache[senderId] = {
                      userName: "Unknown User",
                      userIcon: "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609",
                    };
                  }
                }
              } catch (error) {
                console.error(`Error fetching user data for ${senderId}:`, error);
                this.senderCache[senderId] = {
                  userName: "Error Loading",
                  userIcon: "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609",
                };
              }
            })
          );
          
          console.log("Final sender cache after fetching all users:", 
            Object.keys(this.senderCache).map(key => ({
              id: key,
              userName: this.senderCache[key].userName,
              iconLength: this.senderCache[key].userIcon ? this.senderCache[key].userIcon.length : 0
            }))
          );
        }
        
        // すべてのユーザー情報がロードされた後にメッセージHTMLを生成
        console.log("Current sender cache:", this.senderCache);
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
          
          // 送信者情報を取得
          let userName = "Unknown User";
          let userIcon = "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609";
          
          if (sender && this.senderCache[sender]) {
            userName = this.senderCache[sender].userName;
            userIcon = this.senderCache[sender].userIcon;
            console.log(`Using cached user data for ${sender}: ${userName}`);
          } else if (sender) {
            console.warn(`No sender cache for ${sender} after processing`);
          }
          
          const messageHtml = this.createMessageHtml(
            message, 
            sender, 
            userName, 
            userIcon, 
            lastDate, 
            timestamp
          );
          
          lastDate = new Date(timestamp).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          
          messageHtmlArray.push(messageHtml);
        }

        // 最初のロードかチャット更新かによって表示方法を変える
        if (isinit) {
          // 初回ロードの場合は全メッセージを表示
          this.chatBox.innerHTML = ""; // クリア
          messageHtmlArray.forEach((messageHtml) => {
            this.chatBox.insertAdjacentHTML("beforeend", messageHtml);
          });
          this.chatBox.scrollTo({ top: this.chatBox.scrollHeight, behavior: "auto" });
          isinit = false;
        } else {
          // 更新の場合は新しいメッセージだけを追加
          messageHtmlArray.forEach((messageHtml) => {
            this.chatBox.insertAdjacentHTML("beforeend", messageHtml);
          });
          this.chatBox.scrollTo({ top: this.chatBox.scrollHeight, behavior: "smooth" });
        }
      },
      (error) => {
        console.error("メッセージ取得中にエラーが発生しました: ", error);
        addLog(`メッセージ取得中にエラーが発生しました:${error.message}`, "error");
      }
    );
    this.updateOtherChatListeners();
  }

  createMessageHtml(message, sender, userName, userIcon, lastDate, timestamp) {
    const {
      message: messageText,
      messageId,
      replyId,
      resourceFileId,
      extension,
      call,
    } = message;
    
    console.log(`Creating HTML for message ${messageId} from ${sender}, userName: ${userName}`);
    
    const messageTimestamp = new Date(timestamp);
    const messageDate = messageTimestamp.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    let dateDivider = "";
    if (messageDate !== lastDate) {
      dateDivider = `<div class="date-divider"><span>${messageDate}</span></div>`;
    }
    
    const isMine = sender === this.myuserId;
    let icon_html;
    let username_html;
    let margin_style = "";
    
    if (isMine) {
      // 自分のメッセージ
      icon_html = "";
      username_html = "";
      margin_style = "margin-top: 0;";
    } else {
      // 相手のメッセージ
      // イメージソースがBase64かURLかを判断
      const iconUrl = userIcon || "https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609";
      console.log(`Using icon for ${sender}, data type: ${typeof iconUrl}, length: ${iconUrl.length}, starts with: ${iconUrl.substring(0, 30)}...`);
      
      icon_html = `<img class="icon" src="${iconUrl}" alt="${userName}のアイコン" onerror="this.src='https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/defaultUserIcon.png?v=1738806359609';">`;
      username_html = `<div class="username">${userName}</div>`;
    }
    
    let message_html = `
      ${dateDivider}
      <div class="message-item ${isMine ? "self" : "other"} draggable="true" data-sender="${sender}" data-message-id="${messageId}">
        ${icon_html}
        <div class="message-content" style="${margin_style}">
          ${username_html}`;
          
    const replyTargetDOM = replyId
      ? `<div class="message-reply-content" id="message-reply-content" convert="false">${replyId}</div>`
      : "";
      
    if (resourceFileId) {
      message_html += this.createFileMessageHtml(resourceFileId, extension, messageId, replyTargetDOM, message.filename);
    } else if (call) {
      message_html += this.createCallMessageHtml(call, messageId, messageTimestamp, userName, sender);
    } else {
      const escapedMessageText = this.escapeHtml(messageText);
      const formattedMessageText = this.insertWbrEvery100Chars(escapedMessageText);
      const linkedMessageText = this.linkify(formattedMessageText);
      message_html += `<div class="message-bubble" messageId="${messageId}">${replyTargetDOM}${linkedMessageText}</div>`;
    }
    
    message_html += `</div><div class="timestamp">${messageTimestamp.toLocaleTimeString(
      "ja-JP",
      { hour: "2-digit", minute: "2-digit" }
    )}</div></div>`;
    
    const youtubeEmbed = this.extractYoutubeEmbedUrl(this.linkify(messageText || ''));
    if (youtubeEmbed) {
      message_html += `<div class="youtube-embed"><iframe width="560" height="315" src="${youtubeEmbed}" frameborder="0" allowfullscreen></iframe></div>`;
    }
    
    return message_html;
  }

  createFileMessageHtml(resourceFileId, extension, messageId, replyTargetDOM, filename) {
    const fileType = this.getFileType(extension);
    if (fileType === "image") {
      return `<a href="https://drive.google.com/uc?id=${resourceFileId}"><img src="https://drive.google.com/thumbnail?id=${resourceFileId}" alt="画像" class="message-image"></a>`;
    } else if (fileType === "video") {
      return `
        <iframe src="https://drive.google.com/file/d/${resourceFileId}/preview?controls=0" class="message-bubble" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        <div class="message-bubble" messageId="${messageId}">${replyTargetDOM}
          <a href="https://drive.google.com/file/d/${resourceFileId}/view?usp=drivesdk" target="_blank">ビデオを見る 動画は再生できるまでに時間がかかることがあります。</a>
        </div>
      `;
    } else {
      return `<a href="https://drive.google.com/file/d/${resourceFileId}" class="message-bubble">${replyTargetDOM}${filename}ファイルを開く</a>`;
    }
  }

  createCallMessageHtml(call, messageId, messageTimestamp, userName, sender) {
    if (
      sender !== this.myuserId &&
      1 * 60 * 1000 > new Date() - messageTimestamp &&
      call === 'first'
    ) {
      console.log(sender);
      document.getElementById("caller").textContent = `${userName}より電話着信`;
      localStorage.setItem("skyway-roomId", messageId);
      document.getElementById("callNotification").style.display = "flex";
    }
    return `<div class="message-bubble" messageId="${messageId}"><img class="call_bubble" id="call_bubble" src="https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/call.png?v=1738408814280"></div>`;
  }

  getFileType(extension) {
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

  generateRandomId() {
    return Math.random().toString(36).substring(2, 18);
  }

  escapeHtml(text) {
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

  linkify(text) {
    const urlPattern = /((https?|ftp):\/\/[^\s/$.?#].[^\s]*)/g;
    return text.replace(urlPattern, (match) => {
      const decodedUrl = decodeURIComponent(match);
      let modifiedUrl = decodedUrl;
      if (decodedUrl.includes("youtube.com") || decodedUrl.includes("youtu.be")) {
        modifiedUrl = this.extractYoutubeEmbedUrl(decodedUrl);
      }
      if (
        !decodedUrl.includes("youtube.com") &&
        !decodedUrl.includes("youtu.be")
      ) {
        return `<a href="${modifiedUrl}" target="_blank">${this.splitLongUrl(
          modifiedUrl
        )}</a><br><a href="https://edu-open-4step.glitch.me." target="_blank">規制回避用url</a><br><br><br>`;
      } else {
        return `<a href="${modifiedUrl}" target="_blank">${this.splitLongUrl(
          modifiedUrl
        )}</a>`;
      }
    });
  }

  splitLongUrl(url, maxLength = 30) {
    const parts = url.match(new RegExp(".{1," + maxLength + "}", "g"));
    return parts.join("<wbr>"); // <wbr>タグを使用して適切な位置で改行
  }

  extractYoutubeEmbedUrl(text) {
    const youtubePattern =
      /https?:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([^\s&]+)/;
    const match = text.match(youtubePattern);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[4]}`;
    }
    return null;
  }

  insertWbrEvery100Chars(text) {
    return text.replace(/(.{90})/g, "$1<wbr>");
  }

  clearReplyShow() {
    document.getElementById("reply-target").style.display = "none";
    const replyContentElement = document.getElementById("reply-content");
    replyContentElement.innerText = "";
    replyContentElement.setAttribute("messageId", ""); // Save the messageId
  }

  updateOtherChatListeners() {
    console.log("update other chat list");
    // ここに他のチャットのリスナーを更新するロジックを実装
    // 他のチャットの新着メッセージを検知するための機能
    // オプション: この機能はapp.jsから適切なchatIdListを渡して実装するか、
    // ChatListManagerと連携する必要があるかもしれません
  }

  // Base64のイメージデータが有効かチェックするメソッドを追加
  isValidBase64Image(str) {
    // data:image形式かチェック
    if (str && str.startsWith('data:image/')) {
      return true;
    }
    
    // プレーンBase64のチェック (少なくとも基本的な長さと文字セットをチェック)
    if (str && str.length > 100) {
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      const samplePart = str.substring(0, 100); // 最初の100文字をチェック
      return base64Regex.test(samplePart);
    }
    
    return false;
  }
}
