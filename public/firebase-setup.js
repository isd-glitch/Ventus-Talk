import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js";
import { getFirestore, collection, addDoc,getDocs,limit, serverTimestamp, onSnapshot, query, orderBy,setDoc,doc ,getDoc} 
from "https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js";
import { firebaseConfigDev, firebaseConfig1, firebaseConfig2, firebaseConfigUsers, firebaseConfigInfo } 
from './firebase_keys.js';

// 各Firebaseアプリを初期化
const appd = initializeApp(firebaseConfigDev, "appd");
const app1 = initializeApp(firebaseConfig1, "app1");
const app2 = initializeApp(firebaseConfig2, "app2");
const appUsers = initializeApp(firebaseConfigUsers, "appUsers");
const appInfo = initializeApp(firebaseConfigInfo, "appInfo");

// 各Firestoreインスタンスを取得
const dbdev = getFirestore(appd);
const db1 = getFirestore(app1);
const db2 = getFirestore(app2);
const dbUsers = getFirestore(appUsers);
const dbInfo = getFirestore(appInfo);

// DOM要素の取得
// ローカルストレージからユーザー名の取得
const username = localStorage.getItem('username');
const myuserId = localStorage.getItem('userID');


// 必要なものをエクスポート
export { 
    appd, app1, app2, appUsers, appInfo,
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, limit,onSnapshot, query, orderBy, username ,getDocs,setDoc,doc,myuserId,getDoc
};
