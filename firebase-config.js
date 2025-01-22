const admin = require('firebase-admin');

// サービスアカウントキーを読み込む
const serviceAccount = require('./ventus-talk-dev-firebase-adminsdk-1iv00-9d4ecb0874.json');

// Firebase アプリを初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;