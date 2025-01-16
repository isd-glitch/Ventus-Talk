import { 
    appd, app1, app2, appUsers, appInfo, 
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, query, reloadPage, orderBy, username, 
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
    setDoc(doc(dbdev, 'users', myuserId), { profile_ico: base64Image }, { merge: true })
        .then(() => {
            addLog('プロフィール画像が更新されました',"b");
            loadCurrentProfileImage(); // 更新後に再表示
        })
        .catch(error => {
            alert('プロフィール画像の更新に失敗しました: ', error);
        });
}

function loadCurrentProfileImage() {
    getDoc(doc(dbdev, 'users', myuserId)).then(docSnap => {
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
});


function change_username(){
  const changeUsernameButton = document.getElementById('change-username');
    const usernameInput = document.getElementById('username-input');
    changeUsernameButton.addEventListener('click', async () => {
        const newUsername = usernameInput.value.trim();
        if (!newUsername) {
            alert('ユーザーネームを入力してください。');
            return;
        }

        try {
            // FirestoreのusersコレクションのmyuserIdドキュメントを更新
            await setDoc(doc(dbdev, 'users', myuserId), { username: newUsername }, { merge: true });
            await localStorage.setItem('username', newUsername);
            alert('ユーザーネームが変更されました。');
        } catch (error) {
            console.error('ユーザーネームの変更中にエラーが発生しました: ', error);
            alert('ユーザーネームの変更中にエラーが発生しました: ' + error.message);
        }
    });
}

function signOut(){
  const signoutButton = document.getElementById('signout-button');

    // サインアウトボタンのクリックイベント
    signoutButton.addEventListener('click', () => {
        const confirmation = confirm('本当にサインアウトしますか？データは消えませんが、次ログインした時、全て新規メッセージとして扱われます。');
        if (confirmation) {
            // ローカルストレージをクリア
            localStorage.clear();
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
