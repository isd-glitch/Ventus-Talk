import { 
    appd, app1, app2, appUsers, appInfo, 
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
    chatBox, chatInput, sendButton, username 
} from '../firebase-setup.js';


document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // パスワードのハッシュ化
    const hashedPassword = password//CryptoJS.SHA256(password).toString();

    // ローカルストレージにログイン情報を保存
    localStorage.setItem('username', username);
    localStorage.setItem('password', hashedPassword);

    // ユーザー情報をFirestoreに保存
    const userId = username + '-' + Date.now(); // ユニークIDの生成
    try {
        await addDoc(collection(dbdev, 'users'), {
            id: userId,
            username: username,
            password: hashedPassword,
            timestamp: serverTimestamp()
        });
        // メインページへリダイレクト
        window.location.href = '../talk/index.html';
    } catch (error) {
        console.error("Error adding document: ", error);
    }
});
