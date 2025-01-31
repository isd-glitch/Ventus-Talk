import { 
    appd, app1, app2, appUsers, appInfo, arrayUnion,
    dbdev,dbServer, db2, dbUsers, dbInfo,collection, addDoc, myuserId,serverTimestamp, query, orderBy, username, doc, setDoc, getDoc
} from '../firebase-setup.js';
import {addLog,setProfileImageFromLocalStorage,hash} from '../helper.js';

const usernameInput = document.getElementById('username');
const usernameCheck = document.getElementById('username-check');
const loadingSpinner = document.getElementById('loading-spinner');
const submitButton = document.getElementById('submit-button');
const termsCheckbox = document.getElementById('terms-checkbox');
let usernameTimeout;
if (username) {
    window.location.href = '../talk/index.html';
}



// Function to check username availability
async function checkUsernameAvailability() {
  const username = usernameInput.value;

  // 文字数チェック
  if (username.length >= 20) {
    addLog("20文字以内で入力してください。", "error");
    return;
  }

  // 日本語（ひらがな、カタカナ、漢字）・英数字のみを許可する正規表現
  const validUsernamePattern = /^[\u3040-\u30FF\u4E00-\u9FFFa-zA-Z0-9]+$/;
  if (!validUsernamePattern.test(username)) {
    usernameCheck.textContent = 'ユーザーネームは日本語（ひらがな、カタカナ、漢字）・英数字のみ使用できます。';
    submitButton.className = 'disabled';
    submitButton.disabled = true;
    return;
  }

  // ユーザーネームが空の場合のチェック
  if (username === '') {
    usernameCheck.textContent = '';
    submitButton.className = 'disabled';
    submitButton.disabled = true;
    return;
  }

  try {
    console.log('req'); // ここでログを追加
    loadingSpinner.style.display = 'block';

    const usernameDocRef = doc(dbUsers, 'rawUserId', 'enterdRawUserId');

    // タイムアウトを設定
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 3000)
    );
    //毎回呼び出されるが、firebase独自のキャッシュでリソース読み込み削減

    const usernameDoc = await Promise.race([getDoc(usernameDocRef), timeoutPromise]);

    console.log('res'); // ここでログを追加
    loadingSpinner.style.display = 'none';

    if (usernameDoc.exists() && usernameDoc.data().rawUserId.includes(username)) {
      usernameCheck.className = 'username-check-error';
      usernameCheck.textContent = '！重複しています';
      submitButton.className = 'disabled';
      submitButton.disabled = true;
    } else {
      usernameCheck.className = 'username-check-available';
      usernameCheck.textContent = 'Available';
      if (termsCheckbox.checked) {
        submitButton.className = 'enabled';
        submitButton.disabled = false;
      }
    }
  } catch (error) {
    loadingSpinner.style.display = 'none';
    console.error('Error checking username availability:', error);
    usernameCheck.className = 'username-check-error';
    usernameCheck.textContent = 'エラーが発生しました。再試行してください。';
    submitButton.className = 'disabled';
    submitButton.disabled = true;
  }
}
// Show loading spinner immediately and check username after 2 seconds of inactivity
usernameInput.addEventListener('input', () => {
    clearTimeout(usernameTimeout);
    console.log('changed');  // Log immediately on change
    loadingSpinner.style.display = 'inline';
    submitButton.className = 'disabled';
    submitButton.disabled = true;
    usernameCheck.className = 'username-check-loading';
    usernameCheck.textContent = '⏳ チェック中...';
  if (!isSignIn()){
    usernameTimeout = setTimeout(checkUsernameAvailability, 2000);//New
  }
    
});

function validateInput(input, fieldName) {
  if (input.length >= 20) {
    addLog(`${fieldName}は20文字以内で入力してください。`, "error");
    return false;
  }
  return true;
}


// Check the terms checkbox state
termsCheckbox.addEventListener('change', () => {
    if (termsCheckbox.checked && usernameCheck.textContent === 'Available') {
        submitButton.className = 'enabled';
        submitButton.disabled = false;
    } else {
        submitButton.className = 'disabled';
        submitButton.disabled = true;
    }
});

// サインイン関数の追加
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    localStorage.clear();
    addLog('サインイン処理中');
    const userIdInput = document.getElementById('login-username').value
    const password = document.getElementById('login-password').value;
    if (!validateInput(userIdInput, "ユーザーID") || !validateInput(password, "パスワード")) {return;}
    const hashedPassword = await hash(password);
    const userId = await hash(userIdInput);
    //if (userId.length >= 20){addLog("20文字以内で入力してください。","error");return;}
    try {
        const userDoc = await getDoc(doc(dbUsers, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.password === hashedPassword) {
              await localStorage.setItem('username', userIdInput);
              await localStorage.setItem('userID', userId);
              await localStorage.setItem('userIdShow',userIdInput)
              const condition = localStorage.getItem('condition');
              //if (!condition ||condition==='init') {
                //await loadCurrentProfileImage(userId);
              //}
              console.log('open');
              
              window.location.href = '../talk/index.html';
            } else {
                alert('ユーザーIDまたはパスワードが違います。');
            }
        } else {
            alert('ユーザーIDまたはパスワードが違います。');
        }
    } catch (error) {
        console.error('サインインエラー: ', error);
        alert('エラーが発生しました。もう一度お試しください。');
    }
});

document.getElementById('register-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    const userIdInput = usernameInput.value;
    if (!validateInput(userIdInput, "ユーザーID") || !validateInput(password, "パスワード")) {return;}
    const userId = await hash(userIdInput);
    if (userId === ''){addLog("userIdを入力してください。","error");return;}
    addLog('登録処理中です',"info");
    // パスワードのハッシュ化
    const hashedPassword = await hash(password);
    //const username = usernameInput.value;
    await localStorage.clear();
    // ローカルストレージにログイン情報を保存
    await localStorage.setItem('username', userIdInput);
    await localStorage.setItem('userID', userId);
    await localStorage.setItem('userIdShow',userIdInput);
    // ユーザー情報をFirestoreに保存
    
    try {
        await setDoc(doc(dbUsers, 'users', userId), { 
            password: hashedPassword,
            username: userIdInput,
            timestamp: serverTimestamp()
        });
        await setDoc(doc(dbServer, 'users', userId), { 
            username: userIdInput,
        });
        const docRef = doc(dbUsers, 'rawUserId', 'enterdRawUserId');
        await setDoc(docRef, {
          rawUserId: arrayUnion(userIdInput)
        }, { merge: true });
        //alert(`あなたのユーザーIDはこれです。スクショしておいてください。${userId}`);
        // メインページへリダイレクト
        addLog("登録完了","info");
        window.location.href = '../talk/index.html';
    } catch (error) {
        console.error("Error adding document: ", error);
    }
});
/*
function generateUniqueID() {
    const characters = 'ABCDEFGHJKLPQRSTUVXYZabcdefghjknpqrstuvxyz23456789';
    let uniqueID = '';
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueID += characters[randomIndex];
    }
    return uniqueID;
}
*/
// Handling the form transitions
const showLoginText = document.getElementById('show-login');
const showRegisterText = document.getElementById('show-register');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const formContainer = document.getElementById('form-container');


function isSignIn() {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    if (loginContainer.classList.contains('active')) {
        console.log('Currently showing: サインイン');
      return true
    } else if (registerContainer.classList.contains('active')) {
        console.log('Currently showing: 新規登録');
      return false
    }
}

// Add this call in the appropriate place to check the active form
showLoginText.addEventListener('click', () => {
    registerContainer.classList.remove('active');
    loginContainer.classList.add('active');
    formContainer.style.transform = 'translateX(0%)';
});

showRegisterText.addEventListener('click', () => {
    loginContainer.classList.remove('active');
    registerContainer.classList.add('active');
    formContainer.style.transform = 'translateX(-50%)';
});


async function loadCurrentProfileImage(userId) {
    try {
        const docRef = doc(dbUsers, 'users', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const profileImage = data.profile_ico || '';
            localStorage.setItem('profileImage', profileImage);
            localStorage.setItem('condition', "did");
            setProfileImageFromLocalStorage();
        } else {
            console.log('No such document!');
        }
    } catch (error) {
        console.error('プロフィール画像の読み込みに失敗しました: ', error);
        //addLog('プロフィール画像の読み込みに失敗しました: ', 'error');
    }
}
