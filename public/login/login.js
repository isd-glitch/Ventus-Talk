import { 
    appd, app1, app2, appUsers, appInfo, 
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, query, orderBy, username, doc, setDoc, getDoc
} from '../firebase-setup.js';

const usernameInput = document.getElementById('username');
const usernameCheck = document.getElementById('username-check');
const loadingSpinner = document.getElementById('loading-spinner');
const submitButton = document.getElementById('submit-button');
const termsCheckbox = document.getElementById('terms-checkbox');
let usernameTimeout;

// Function to check username availability
async function checkUsernameAvailability() {
    const username = usernameInput.value;
    if (username === '') {
        usernameCheck.textContent = '';
        submitButton.className = 'disabled';
        submitButton.disabled = true;
        return;
    }

    const usernameDoc = await getDoc(doc(dbdev, 'users', username));
    loadingSpinner.style.display = 'none';

    if (usernameDoc.exists()) {
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
    const userId = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const userDoc = await getDoc(doc(dbdev, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.password === password) {
              localStorage.setItem('username', userData.username);
              localStorage.setItem('password', password);
              localStorage.setItem('userID', userId);
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
    const username = usernameInput.value;
    const password = document.getElementById('password').value;

    // パスワードのハッシュ化
    const hashedPassword = password; //CryptoJS.SHA256(password).toString();
    const userId = username;
    // ローカルストレージにログイン情報を保存
    localStorage.setItem('username', username);
    localStorage.setItem('password', hashedPassword);
    localStorage.setItem('userID', userId);
    // ユーザー情報をFirestoreに保存
    
    try {
        await setDoc(doc(dbdev, 'users', userId), {
            username: username,
            password: hashedPassword,
            timestamp: serverTimestamp()
        });
        alert(`あなたのユーザーIDはこれです。スクショしておいてください。${userId}`);
        // メインページへリダイレクト
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


