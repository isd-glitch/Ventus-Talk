// Push通知を受け取ると呼ばれる
self.addEventListener('push', function(event) {
    var data = {};
    if (event.data) {
        data = event.data.json();
    }
    var title = data.notification.title;
    var messageText = data.notification.body;
    var chatId = data.data.chatId; // データからchatIdを取得

    event.waitUntil(
        self.registration.showNotification(title, {
            'body': messageText,
            'icon': '/path/to/icon.png', // 通知アイコン
            'tag': `chat-${chatId}`, // 同一チャットの通知をまとめる
            'data': { chatId }
        })
    );
});
