self.addEventListener("push", function (event) {
  var data = {};
  if (event.data) {
    data = event.data.json();
  }
  var title = data.notification.title;
  var messageText = data.notification.body;
  var chatId = data.data.chatId; // データからchatIdを取得
  event.waitUntil(
    self.registration.showNotification(title, {
      body: messageText,
      icon: "/path/to/icon.png", // 通知アイコン
      tag: `chat-${chatId}`, // 同一チャットの通知をまとめる
      data: { chatId },
    })
  );
});


/*
  // フォアグラウンドでない場合のみ通知を表示
  if (
    Notification.permission === "granted" &&
    document.visibilityState !== "visible"
  ) {
    
  }
*/
