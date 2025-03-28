import {
  appd,
  app1,
  app2,
  appUsers,
  appInfo,
  getToken,
  dbdev,
  dbServer,
  db2,
  dbUsers,
  dbInfo,
  updateDoc,
  messaging,
  addDoc,
  serverTimestamp,
  query,
  reloadPage,
  orderBy,
  username,
  setDoc,
  doc,
  getDoc,
  myuserId,
} from "../firebase-setup.js";
import { addLog,setProfileImageFromLocalStorage,compressAndEncodeImage,updateCacheIfNeeded } from "../helper.js";

function settings() {
  const settingsItems = document.querySelectorAll(".settings-item");
  const settingsPages = document.querySelectorAll(".settings-page");
  const settingsContent = document.getElementById("settings-content");

  // 設定項目のクリックイベントリスナーを削除
  // （DOMContentLoadedイベント内の一つのリスナーだけを使用する）
}

function saveProfileImageToFirestore(base64Image) {
  setDoc(
    doc(dbServer, "users", myuserId),
    { profile_ico: base64Image },
    { merge: true }
  )
    .then(() => {
      addLog("プロフィール画像が更新されました", "b");
      localStorage.setItem("profileImage", base64Image);
      loadCurrentProfileImage();
      setProfileImageFromLocalStorage();
    })
    .catch((error) => {
      alert("プロフィール画像の更新に失敗しました: ", error);
    });
}

function loadCurrentProfileImage() {
  getDoc(doc(dbServer, "users", myuserId))
    .then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileImage = data.profile_ico || "";
        document.getElementById("current-profile-image").src = profileImage;
        //localStorage.setItem('profileImage',profileImage)
      }
    })
    .catch((error) => {
      console.error("プロフィール画像の読み込みに失敗しました: ", error);
    });
}

// 重複したDOMContentLoadedイベントリスナーを整理し、一つにまとめます
document.addEventListener("DOMContentLoaded", () => {
  // 基本設定の初期化
  settings();
  change_username();
  signOut();
  font();
  notification_auth();
  setProfileImageFromLocalStorage();
  setupThemeSelector();  // テーマセレクタのセットアップ
  updateVersion();
  
  // 戻るボタンの設定
  const backButton = document.getElementById("back-button");
  if (backButton) {
    backButton.addEventListener("click", function () {
      const rightPanel = document.getElementById("right-panel");
      if (rightPanel) {
        rightPanel.classList.remove("open");
      }
    });
  }
  
  // 設定項目のクリックイベント（モバイル対応）
  // このイベントリスナーのみを残し、他の重複したものは削除
  const settingsItems = document.querySelectorAll("#settings-list .settings-item");
  settingsItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      // クリックされた要素のデータを取得
      const pageId = item.dataset.page;
      console.log("設定項目がクリックされました:", pageId);
      
      // 右パネルを表示（モバイル表示時のみ）
      const rightPanel = document.getElementById("right-panel");
      if (rightPanel && window.innerWidth <= 768) {
        rightPanel.classList.add("open");
      }
      
      // 設定ページの表示切替
      const settingsPages = document.querySelectorAll(".settings-page");
      settingsPages.forEach(page => {
        page.style.display = "none";
      });
      
      // 選択したページを表示
      const selectedPage = document.getElementById(pageId);
      if (selectedPage) {
        selectedPage.style.display = "block";
        
        // プロフィールページの場合、画像を読み込む
        if (pageId === "profile") {
          loadCurrentProfileImage();
        }
        
        // 設定内容のタイトルを更新
        const settingsContent = document.getElementById("settings-content");
        if (settingsContent) {
          settingsContent.textContent = item.textContent;
          settingsContent.style.display = "block";
        }
      }
      
      // クリックイベントがパネルの表示状態を変更しないようにする
      // (重要: rightPanel.classList.toggle() を使わない)
    });
  });
  
  // テーマプレビューのクリックバブリングを防止
  const themePreviewBoxes = document.querySelectorAll('.theme-preview-box');
  themePreviewBoxes.forEach(box => {
    box.addEventListener('click', function(e) {
      e.stopPropagation(); // イベント伝播を止める
    });
  });
});

function change_username() {
  const changeUsernameButton = document.getElementById("change-username");
  const usernameInput = document.getElementById("username-input");
  changeUsernameButton.addEventListener("click", async () => {
    console.log("username");
    const newUsername = usernameInput.value.trim();
    if (!newUsername) {
      alert("ユーザーネームを入力してください。");
      return;
    }
    if (newUsername.length >= 30){addLog("30文字以内で入力してください。","error");return;}
    try {
      // FirestoreのusersコレクションのmyuserIdドキュメントを更新
      await setDoc(
        doc(dbServer, "users", myuserId),
        { username: newUsername },
        { merge: true }
      );
      await localStorage.setItem("username", newUsername);
      addLog("ユーザーネームが変更されました。", "info");
    } catch (error) {
      console.error("ユーザーネームの変更中にエラーが発生しました: ", error);
      alert("ユーザーネームの変更中にエラーが発生しました: " + error.message);
    }
  });
}

document
  .getElementById("renotice")
  .addEventListener("click", () => saveuserToken());

function notification_auth() {
  const notification = document.getElementById("notification");
  notification.addEventListener("click", () => {
    console.log("notification auth");
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("通知が許可されました");
          saveuserToken();
        } else {
          console.log("通知が拒否されました");
        }
      });
    }
  });
}

async function saveuserToken() {
  try {
    addLog("通知設定を登録中です画面を切り替えないでください。", "info");
    const token = await getToken(messaging, {
      vapidKey:
        "BKUDfUUeYgn8uWaWW1_d94Xyt03iBIHoLvyu1MNGPPrc72J2m5E3ckzxLqwHrsCQ9uJ5m-VhuHEjxquWqyKzTGE",
    });
    console.log(token);
    if (token) {
      await setDoc(doc(dbServer, "users", myuserId), { token }, { merge: true });
      const currentDate = new Date();
      localStorage.setItem("TokenLastUpdate", currentDate.toISOString());
      addLog("設定完了", "info");
    } else {
      console.warn("通知トークンを取得できませんでした");
    }
  } catch (error) {
    console.error("通知トークン保存中にエラーが発生しました:", error);
  }
}

function signOut() {
  const signoutButton = document.getElementById("signout-button");

  // サインアウトボタンのクリックイベント
  signoutButton.addEventListener("click", () => {
    const confirmation = confirm(
      "本当にサインアウトしますか？データは消えませんが、次ログインした時、全て新規メッセージとして扱われます。"
    );
    if (confirmation) {
      // ローカルストレージをクリア
      localStorage.clear();
      localStorage.setItem("condition", "init");
      // ログインページにリダイレクト
      window.location.href = "../login/login.html";
    }
  });
}

function font() {
  const fontSelect = document.getElementById("font-select");
  const changeFontButton = document.getElementById("change-font-button");
  fontSelect
    .addEventListener("change", function () {
      var selectedFont = this.options[this.selectedIndex].style.fontFamily;
      document.body.style.fontFamily = selectedFont;
    });
  // フォント変更ボタンのクリックイベント
  changeFontButton.addEventListener("click", () => {
    const selectedFont = fontSelect.value;
    localStorage.setItem("font", selectedFont);
    addLog(`${selectedFont}に変更しました。`);
    //document.getElementById('chat-box').style.fontFamily = selectedFont;
  });
}

function updateVersion(){
  const updateButton = document.getElementById('update');
  updateButton.addEventListener('click', () => {
    localStorage.setItem('lastUpdated',"");
    updateCacheIfNeeded();
  });
}

// テーマ選択と適用の設定
function setupThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    // 保存されたテーマを取得
    const currentTheme = localStorage.getItem('theme') || 'default';
    themeSelect.value = currentTheme;

    // テーマプレビューの選択状態を更新
    updateThemePreviewSelection(currentTheme);

    // セレクトボックスの変更イベント
    themeSelect.addEventListener('change', function() {
        const selectedTheme = this.value;
        applyTheme(selectedTheme);
        updateThemePreviewSelection(selectedTheme);
        localStorage.setItem('theme', selectedTheme);
    });

    // プレビューボックスのクリックイベント
    const previewBoxes = document.querySelectorAll('.theme-preview-box');
    previewBoxes.forEach(box => {
        box.addEventListener('click', function(e) {
            e.stopPropagation(); // イベントの伝播を止める
            const selectedTheme = this.getAttribute('data-theme');
            themeSelect.value = selectedTheme;
            applyTheme(selectedTheme);
            updateThemePreviewSelection(selectedTheme);
            localStorage.setItem('theme', selectedTheme);
        });
    });
}

// テーマプレビューの選択状態を更新
function updateThemePreviewSelection(selectedTheme) {
    const previewBoxes = document.querySelectorAll('.theme-preview-box');
    previewBoxes.forEach(box => {
        if (box.getAttribute('data-theme') === selectedTheme) {
            box.classList.add('selected');
        } else {
            box.classList.remove('selected');
        }
    });
}

// テーマを適用する関数
function applyTheme(theme) {
    // すべての要素からテーマクラスを削除
    const elements = document.querySelectorAll(
        "body, #left-panel, #right-panel, #user-info, #chat-box, #menu-bar, #menu-bar-top, #chat-input, #chat-group-name, .menu-item, .chat-item, .date-divider, #chat-menu, #chat-info, #send-button, .settings-page"
    );
    
    elements.forEach(element => {
        // 現在のクラスからテーマクラスを削除
        const currentClasses = element.className.split(" ");
        const newClasses = currentClasses.filter(
            className => 
                !className.endsWith("-mode") && 
                !className.startsWith("forest-") && 
                !className.startsWith("modern-")
        );
        
        // 選択されたテーマクラスを追加
        if (theme !== "default") {
            newClasses.push(theme);
        }
        
        element.className = newClasses.join(" ");
    });
    
    console.log(`テーマを「${theme}」に変更しました`);
}

// 設定項目のモバイルビュー対応
document.addEventListener("DOMContentLoaded", () => {
  const settingsItems = document.querySelectorAll("#settings-list .settings-item");
  settingsItems.forEach((item) => {
    item.addEventListener("click", () => {
      // クリックされた要素のデータを取得
      const pageId = item.dataset.page;
      console.log("Touched on:", pageId);
      
      // 右パネルを表示
      const rightPanel = document.getElementById("right-panel");
      if (rightPanel && !rightPanel.classList.contains("open")) {
        rightPanel.classList.add("open");
      }
      
      // 設定ページの表示切替
      const settingsPages = document.querySelectorAll(".settings-page");
      settingsPages.forEach(page => {
        page.style.display = "none";
      });
      
      const selectedPage = document.getElementById(pageId);
      if (selectedPage) {
        selectedPage.style.display = "block";
        
        // 設定内容のタイトルを更新
        const settingsContent = document.getElementById("settings-content");
        if (settingsContent) {
          settingsContent.textContent = item.textContent;
          settingsContent.style.display = "block";
        }
      }
    });
  });
  
  // テーマプレビューのクリックバブリングを防止
  const themePreviewBoxes = document.querySelectorAll('.theme-preview-box');
  themePreviewBoxes.forEach(box => {
    box.addEventListener('click', function(e) {
      e.stopPropagation(); // イベント伝播を止める
    });
  });
});

// モバイル用の戻るボタン
const backButton = document.getElementById("back-button");
if (backButton) {
  backButton.addEventListener("click", function () {
    const rightPanel = document.getElementById("right-panel");
    if (rightPanel) {
      rightPanel.classList.remove("open");
    }
  });
}
