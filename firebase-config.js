const admin = require('firebase-admin');

// サービスアカウントキーを読み込む
const serviceAccount = require('./SERVICE ACCOUNT KEY.json');

// Firebase アプリを初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
