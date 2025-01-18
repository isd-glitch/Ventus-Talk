/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js";
import { getFirestore,arrayUnion,updateDoc, collection, addDoc,getDocs,limit, startAfter,serverTimestamp, onSnapshot, query, orderBy,setDoc,doc ,getDoc} 
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
// Firestoreのオフライン持続機能を有効にする

// DOM要素の取得
// ローカルストレージからユーザー名の取得
const username = localStorage.getItem('username');
const myuserId = localStorage.getItem('userID');

function reloadPage() {
  caches.keys().then(function(names) {
    for (let name of names) caches.delete(name);
  });
  window.location.reload(true);
}



// 必要なものをエクスポート
export { 
    appd, app1, app2, appUsers, appInfo,
    dbdev, db1, db2, dbUsers, dbInfo, startAfter,
    collection, addDoc,arrayUnion,updateDoc,reloadPage,serverTimestamp, limit,onSnapshot, query, orderBy, username ,getDocs,setDoc,doc,myuserId,getDoc
};

*/

/*
// Firestoreのオフライン持続機能を有効にする
enableIndexedDbPersistence(dbdev).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.log('複数のタブが開かれているため、オフライン持続機能を有効にできません。');
  } else if (err.code == 'unimplemented') {
    console.log('このブラウザではオフライン持続機能がサポートされていません。');
  }
});
*/
import { getMessaging,onMessage, getToken } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-messaging.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.0/firebase-app.js";
import { getFirestore,arrayUnion,updateDoc, initializeFirestore, startAfter, collection, addDoc, getDocs, limit, serverTimestamp, onSnapshot, query, orderBy, setDoc, doc, getDoc, CACHE_SIZE_UNLIMITED } 
from "https://www.gstatic.com/firebasejs/9.17.0/firebase-firestore.js";
import { firebaseConfigDev, firebaseConfig1, firebaseConfig2, firebaseConfigUsers, firebaseConfigInfo } 
from './firebase_keys.js';

// 各Firebaseアプリを初期化
const appd = initializeApp(firebaseConfigDev, "appd");
const app1 = initializeApp(firebaseConfig1, "app1");
const app2 = initializeApp(firebaseConfig2, "app2");
const appUsers = initializeApp(firebaseConfigUsers, "appUsers");
const appInfo = initializeApp(firebaseConfigInfo, "appInfo");

// 各Firestoreインスタンスを取得し、キャッシュの設定を適用
// 各Firestoreインスタンスを取得し、キャッシュの設定を適用
const dbdev = initializeFirestore(appd, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
const db1 = initializeFirestore(app1, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
const db2 = initializeFirestore(app2, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
const dbUsers = initializeFirestore(appUsers, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
const dbInfo = initializeFirestore(appInfo, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });

const messaging = getMessaging(appd);  // 変更
// DOM要素の取得
// ローカルストレージからユーザー名の取得
const username = localStorage.getItem('username');
const myuserId = localStorage.getItem('userID');
function reloadPage() {
  caches.keys().then(function(names) {
    for (let name of names) caches.delete(name);
  });
  window.location.reload(true);
}

// 必要なものをエクスポート
export { 
    appd, app1, app2, appUsers, appInfo,getToken,onMessage,
    dbdev, db1, db2, dbUsers, dbInfo, startAfter,messaging,
    collection, addDoc,arrayUnion,updateDoc,reloadPage,serverTimestamp, limit,onSnapshot, query, orderBy, username ,getDocs,setDoc,doc,myuserId,getDoc
};

