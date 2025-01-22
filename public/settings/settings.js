import { 
    appd, app1, app2, appUsers, appInfo, getToken,
    dbdev, db1, db2, dbUsers, dbInfo, updateDoc,messaging,
    addDoc, serverTimestamp, query, reloadPage, orderBy, username, 
    setDoc, doc, getDoc, myuserId
} from '../firebase-setup.js';
import {addLog} from '../log.js';
function settings(){
  const settingsItems = document.querySelectorAll('.settings-item');
    const settingsPages = document.querySelectorAll('.settings-page');
    const settingsContent = document.getElementById('settings-content');

    settingsItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            
            // 全ての設定ページを非表示にする
            settingsPages.forEach(page => {
                page.style.display = 'none';
            });

            // 選択されたページを表示する
            document.getElementById(pageId).style.display = 'block';
            settingsContent.style.display = 'none'; // 初期メッセージを非表示にする

            // プロフィールページを表示する場合、現在のアイコンを取得して表示する
            if (pageId === 'profile') {
                loadCurrentProfileImage();
            }
        });
    });

    // プロフィール画像のアップロード
    const profileImageInput = document.getElementById('profile-image-input');
    const uploadProfileImageBtn = document.getElementById('upload-profile-image');

    uploadProfileImageBtn.addEventListener('click', () => {
        const file = profileImageInput.files[0];
        if (file) {
            compressAndEncodeImage(file, 64, 64, base64Image => {
                saveProfileImageToFirestore(base64Image);
            });
        }
    });
}

function compressAndEncodeImage(file, width, height, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // PNG形式に変換し、色数を減らして圧縮
            const base64Image = canvas.toDataURL('image/png', 0.5); // 0.5は品質設定
            callback(base64Image);
        };
    };
}

function saveProfileImageToFirestore(base64Image) {
    setDoc(doc(dbUsers, 'users', myuserId), { profile_ico: base64Image }, { merge: true })
        .then(() => {
            addLog('プロフィール画像が更新されました',"b");
            localStorage.setItem('profileImage', base64Image);
            loadCurrentProfileImage(); // 更新後に再表示
            setProfileImageFromLocalStorage();
        })
        .catch(error => {
            alert('プロフィール画像の更新に失敗しました: ', error);
        });
}

function loadCurrentProfileImage() {
    getDoc(doc(dbUsers, 'users', myuserId)).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const profileImage = data.profile_ico || '';
            document.getElementById('current-profile-image').src = profileImage;
        }
    }).catch(error => {
        console.error('プロフィール画像の読み込みに失敗しました: ', error);
    });
}


document.addEventListener('DOMContentLoaded', () => {
  settings();
  change_username();
  signOut();
  font();
  notification_auth();
  setProfileImageFromLocalStorage();
  init_thema()
  setProfileImageFromLocalStorage();
  const rightPanel = document.getElementById("right-panel");
  const backButton = document.getElementById("back-button");
  
  backButton.addEventListener("click", function() {
    rightPanel.classList.remove("open");
  });
  /*
  rightPanel.addEventListener('click', (event) => {
    // クリックされた要素が<div>タグであることを確認
    if (event.target && event.target.tagName === 'DIV') {
      console.log(`${event.target.id}がクリックされました`);
      rightPanel.classList.remove("open");
    }
  });
  */
  
});

document.addEventListener('DOMContentLoaded', () => {
    // すべての settings-item クラスの div 要素を取得
    const settingsItems = document.querySelectorAll('#settings-list .settings-item');
    // 各 settings-item 要素にタッチイベントリスナーを追加
    settingsItems.forEach(item => {
        item.addEventListener('click', () => {
            const clickedElement = item;
            // クリックされた要素に対して何かを実行（例えば、コンソールに表示）
            console.log('Touched on:', clickedElement.dataset.page);
          const rightPanel = document.getElementById("right-panel");
          rightPanel.classList.toggle("open");
        });
    });
});

function change_username(){
  const changeUsernameButton = document.getElementById('change-username');
    const usernameInput = document.getElementById('username-input');
    changeUsernameButton.addEventListener('click', async () => {
      
      console.log('username');
        const newUsername = usernameInput.value.trim();
        if (!newUsername) {
            alert('ユーザーネームを入力してください。');
            return;
        }

        try {
            // FirestoreのusersコレクションのmyuserIdドキュメントを更新
            await setDoc(doc(dbUsers, 'users', myuserId), { username: newUsername }, { merge: true });
            await localStorage.setItem('username', newUsername);
            addLog('ユーザーネームが変更されました。',"info");
        } catch (error) {
            console.error('ユーザーネームの変更中にエラーが発生しました: ', error);
            alert('ユーザーネームの変更中にエラーが発生しました: ' + error.message);
        }
    });
}

import {setProfileImageFromLocalStorage} from '../log.js';

document.getElementById('renotice').addEventListener('click', () => saveuserToken());
function notification_auth() {
  const notification = document.getElementById('notification');
  notification.addEventListener('click', () => {
    console.log('notification auth');
    if (Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
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
    addLog('通知設定を登録中です画面を切り替えないでください。',"info")
    const token = await getToken(messaging, { vapidKey: 'BKUDfUUeYgn8uWaWW1_d94Xyt03iBIHoLvyu1MNGPPrc72J2m5E3ckzxLqwHrsCQ9uJ5m-VhuHEjxquWqyKzTGE' });
    console.log(token);
    if (token) {
      await setDoc(doc(dbUsers, 'users', myuserId), { token }, { merge: true });
      const currentDate = new Date();
      localStorage.setItem('TokenLastUpdate', currentDate.toISOString());
      addLog('設定完了', "info");
    } else {
      console.warn('通知トークンを取得できませんでした');
    }
  } catch (error) {
    console.error('通知トークン保存中にエラーが発生しました:', error);
  }
}

// ページが読み込まれた際の初期化
//document.addEventListener('DOMContentLoaded', notification_auth);


function signOut(){
  const signoutButton = document.getElementById('signout-button');

    // サインアウトボタンのクリックイベント
    signoutButton.addEventListener('click', () => {
        const confirmation = confirm('本当にサインアウトしますか？データは消えませんが、次ログインした時、全て新規メッセージとして扱われます。');
        if (confirmation) {
            // ローカルストレージをクリア
            localStorage.clear();
            localStorage.setItem('condition',"init");
            // ログインページにリダイレクト
            window.location.href = '../login/login.html';
        }
    });
}


function font(){
    const fontSelect = document.getElementById('font-select');
    const changeFontButton = document.getElementById('change-font-button');
    document.getElementById('font-select').addEventListener('change', function() {
        var selectedFont = this.options[this.selectedIndex].style.fontFamily;
        document.body.style.fontFamily = selectedFont;
    });
    // フォント変更ボタンのクリックイベント
    changeFontButton.addEventListener('click', () => {
        const selectedFont = fontSelect.value;
        // ローカルストレージにフォントを保存
        localStorage.setItem('font', selectedFont);
        // メッセージのフォントを変更
      addLog(`${selectedFont}に変更しました。`);
        //document.getElementById('chat-box').style.fontFamily = selectedFont;
    });
  
    
};



// テーマの適用関数
function applyTheme(theme) {
    document.body.className = ''; // 既存のクラスをクリア
    if (theme !== 'default') {
        document.body.classList.add(theme);
    }
}
function init_thema(){
  // 初期テーマを適用
  const savedTheme = localStorage.getItem('theme') || 'default';
  applyTheme(savedTheme);
  document.getElementById('theme-select').value = savedTheme;

  // テーマ変更時の処理
  document.getElementById('theme-select').addEventListener('change', (event) => {
      const selectedTheme = event.target.value;
      applyTheme(selectedTheme);
      localStorage.setItem('theme', selectedTheme);
  });
}
