SkyWayを使ったVentus-Talkの音声・ビデオ通話実装手順

1. 準備
	1.	SkyWayアカウント作成 & APIキー取得
	•	SkyWay公式サイトでアカウントを作成
	•	「プロジェクトを作成」し、APIキーを取得
	2.	Glitchでの環境整備
	•	server.js にシグナリング用の最小限の処理を追加
	•	クライアント側 (script.js や index.html) にSkyWayのSDKを読み込む

2. 基本的な構成

(1) クライアントの処理
	•	SkyWay SDKの読み込み
	•	通話開始時にPeerオブジェクトを作成
	•	ユーザー同士でシグナリング（ID交換）
	•	音声・ビデオストリームを取得し、相手と共有
	•	UIの制御（マイク・カメラON/OFF、退出）

(2) サーバーの役割（Glitch上で実装）
	•	ルーム管理（どのユーザーがどの通話にいるか）
	•	通話相手のマッチング（Firebaseを利用してユーザー情報を管理）

3. 実装手順

① SkyWay SDKを読み込む

<script src="https://cdn.jsdelivr.net/npm/@skyway-webrtc/sdk"></script>

② クライアントでPeerオブジェクトを作成

const peer = new SkyWay.Peer({ key: 'YOUR_SKYWAY_API_KEY' });

peer.on('open', id => {
  console.log('My peer ID is:', id);
});

③ メディアストリームを取得

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    document.getElementById('myVideo').srcObject = stream;
  });

④ 通話の開始

const call = peer.call(remotePeerId, stream);
call.on('stream', remoteStream => {
  document.getElementById('remoteVideo').srcObject = remoteStream;
});

⑤ 通話の受信

peer.on('call', call => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      call.answer(stream);
      call.on('stream', remoteStream => {
        document.getElementById('remoteVideo').srcObject = remoteStream;
      });
    });
});

4. 運用の際の処理
	1.	ルームの作成 & ユーザーの入退出管理
	•	Firestoreに ChatGroup/(chatId)/callSession を追加し、通話中のユーザーを管理
	•	ユーザーが通話を開始するときに callSession を更新
	•	退出時に callSession から削除
	2.	UIの改善
	•	通話中のメンバーリストの表示
	•	マイク・カメラのON/OFF切り替えボタン
	3.	エラーハンドリング
	•	ユーザーが通話を中断した場合の処理
	•	ネットワーク切断時のリカバリ処理

この流れで実装すれば、Ventus-Talkに無料の音声・ビデオ通話を追加できます。まずはシンプルなP2P通話を実装し、グループ通話の実装に進むのが良いです。