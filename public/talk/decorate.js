document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const chatMenu = document.getElementById('chat-menu');
    const closeMenuButton = document.getElementById('close-menu-button');

    // メニューアイコンのクリックイベント
    menuButton.addEventListener('click', () => {
      console.log('chat menu open')
        chatMenu.classList.add('open');
    });

    // 閉じるボタンのクリックイベント
    closeMenuButton.addEventListener('click', () => {
        chatMenu.classList.remove('open');
    });
});



/*
function goOffline() {
  setTimeout(async () => {
    await setDoc(doc(dbdev, 'users', myuserId), { status: 'offline' }, { merge: true });
    console.log('オフライン状態をFirestoreに書き込みました');
  }, 3000); // 3秒の遅延
}

// オンライン状態の書き込み関数
function goOnline() {
  (async () => {
    await setDoc(doc(dbdev, 'users', myuserId), { status: 'online' }, { merge: true });
    console.log('オンライン状態をFirestoreに書き込みました');
  })();
}

// visibilitychangeイベントのリスナーを設定
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    goOffline();
  } else if (document.visibilityState === 'visible') {
    goOnline();
  }
});

// 初期ロード時にオンライン状態を設定
document.addEventListener('DOMContentLoaded', goOnline);

// ウィンドウが閉じられる前にオフライン状態を設定
window.addEventListener('beforeunload', goOffline);
*/


      /*offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // ページが開かれたことを通知
        registration.active.postMessage({ type: 'PAGE_STATUS', status: 'open' });

        window.addEventListener('beforeunload', () => {
          // ページが閉じられる前に通知
          registration.active.postMessage({ type: 'PAGE_STATUS', status: 'closed' });
        });
      });
    }
    
    */
  /*
      if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('../firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
*/
  
/*
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission(status => {console.log('Notification permission status:', status);});
};*/
