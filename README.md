# Ventus-Talk

**開発者**: Roughfts

## 現時点でのVentus-Talkの性能

### 概要
- **4MB** (npm module除く)・静的サイト
- 独自サーバー、静的サイトホスティングでも、独立してサイト設立可能 (ただし、サーバーがない場合はそのサイト間での通知は不可、expressサーバーが動かせるなら可能)
- **3つのFirebaseFirestoreサーバー同時使用**により、請求額とサーバー負荷を軽減 (増設中)

### メッセージ送信性能
- 約**10,000/日**メッセージ送信可能
  - それぞれ単一のメッセージ長は、1〜ブラウザの限界まで (数十万文字。ちなみに容量重い100万文字の中国漢字を送ったらエラーになった)

### メッセージ更新速度
- 平均**0.05秒〜0.15秒**

### その他の特徴
- 通信制限でもアプリさえ開いたら、安定してやり取り可能
- 画像・(動画)・様々なファイル共有可能
- パスワードはハッシュで安全に管理
- ブラウザや、アプリ化様々な媒体で動作可能 (IE非対応)
  - 尚、iPadのブラウザでは通知の権限がないため通知にはアプリ化が必須
- LINEと同じようにアイコン・グループ作成可能 (現在リプライ機能搭載中)
- 友達追加はQRコード又はuserId入力
- 複数アカウント作成可能
- 同期デバイス数制限なし
- Youtubeリンクサイト規制回避自動変換＆埋め込み
- その他リンクサイト規制回避URL自動追加
- **15種類**くらいのフォントと**5種類**のテーマ (テーマの細かいCSSが面倒なので現在やってくれる人募集中)

### セキュリティと制限
- サーバー荒らされる可能性あり
- セキュリティ対策ほぼなし
- 動画送信・閲覧にかなり時間がかかる
- glitchだと、サーバーが起きていないと通知が届かない

## サーバーの説明
| **サーバー名** | **役割** | **詳細** |
| ---------------- | -------- | -------- |
| **dev**          | チャットメッセージの保存と管理 | `ChatGroup - chatId - messages: [message, messageId, sender, timestamp, replyId, resourceURL, extension]` |
| **Users**        | ユーザー情報の保存と管理 | `users - userId - chatIdList, friendList, password, rawFriendList, timestamp, username`<br>`rawUserId - enterdRawUserId: 0: user1, 1: user2, ...` |
| **Server**       | 通知関連情報の管理 | `users - userId - token, profile_ico, username` |
| **Info**         | チャットグループの情報管理 | `ChatGroup - chatId - rawusernames, usernames, rawusernames, lastMessageId, sender, senderUsername, ChatGroupName` |

```mermaid
erDiagram
    USERS {
        string userId
        string username
        array chatIdList
        array friendList
        string password
        array rowFriendList
        timestamp timestamp
    }
    
    SERVER {
        string userId
        string token
        string profile_ico
        string username
    }

    DEV {
        string chatId
        array messages
    }

    INFO {
        string chatId
        array rawusernames
        array usernames
        string lastMessageId
        string sender
        string senderUsername
        string ChatGroupName
    }

    LOCAL_STORAGE {
        string userId
        string lastMessageId
    }

    USERS ||--o{ DEV : "belongs to"
    USERS ||--o{ SERVER : "syncs with"
    USERS ||--o{ RAW_USER_ID : "maps to"
    DEV ||--o{ INFO : "linked with"
    INFO ||--o{ SERVER : "references for FCM"
    LOCAL_STORAGE ||--o{ USERS : "caches data"
```
この真下のフローチャート図は、適当にAIに作らせたので、ちょいと違います。完全に正しいのは、次のGraph TDです。
```mermaid
flowchart TD
    A[ユーザーのブラウザ] -->|ログイン| B(Users/Server 更新)
    B --> C(FCMトークン保存)
    B --> D(ローカルストレージ更新)
    
    A -->|メッセージ送信| E(dev 更新)
    E --> F(Info 最終メッセージ更新)
    
    A -->|グループ作成/友達追加| G(dev/Info 更新)
    
    F -->|スナップショット監視| H(Glitchサーバー)
    H -->|通知送信| I(Serverのトークン参照)
    I -->|FCM通知| J[ユーザーのブラウザ]

    A -->|ビデオ通話開始| K(SkyWay セットアップ)
    K -->|call=first| L(dev 更新)
    L -->|call=did| M(受信者側でフォーム非表示)
```

かなり省略しているので、矢印や処理が足りませんが、おおまかにはこれです。
#Graph TD
```mermaid
graph TD
    %% Firestoreのデータベース
    O(Firebase) --> |Power| A[Firestore Database]
    A --> B[(Firestore-dev)]
    A --> C[(Firestore-Users)]
    A --> D[(Firestore-Server)]
    A --> E[(Firestore-Info)]
    
    %% devの構造
    B -->|Contains| B1[ChatGroup]
    B1 -->|Contains| B2[chatId]
    B2 -->|Contains| B5[messages]
    B5 -->|Attributes| B4[message, messageId, sender, timestamp, replyId, resourceURL, extension]

    %% Usersの構造
    C -->|Contains| C1[userId]
    C -->|Contains| C2[rawUserId]
    C1 -->|Attributes| C3[chatIdList, friendList, password, rowFriendList, timestamp, username]
    C2 -->|Attributes| C5[enterdRawUserIdList]

    %% Serverの構造
    D -->|Contains| D1[users]
    D1 -->|Contains| D2[userId]
    D2 -->|Attributes| D3[FCMtoken,profile_ico,username]
    
    %% Infoの構造
    E -->|Contains| E1[ChatGroup]
    E1 -->|Contains| E2[chatId]
    E2 -->|Attributes| E3[rawusernames, usernames, lastMessageId, sender, senderUsername, ChatGroupName,TokenLastUpdate]
    
    
    %%ブラウザ
    Browser(Browser) --> sw[sw.js]
    Browser --> Notification[Notification]
    H --> sw --> Notification

    %% ローカルストレージ
    %%User(User) --> Browser
    Browser --> L[(Local Storage)]
    L -->|Stores| L1[SkyWay-RoomId,lastMessageId, userId, token,lastUpdated,]
    
    %%GoogleDrive
    F1r --> Drive[(GoogleDrive)]
    
    %%Google Cloud
    GC(GoogleCloud) --> |Monitor| GCM[GCM未実装]
    GC --> ServiceAccount[ServiceAccount]
    %%GCM --> A
    %%GCM --> B
    %%GCM --> C
    %%GCM --> D
    
    %%Apps Script
    N[Apps Script] --> |Manage|Drive

    %% Glitchサーバー
    G(Glitch Server) -->|Monitors Snapshot| E1
    G -->|References| D1
    O -->|Power| H(FCM <Firebase Cloud Messaging>)
    G -->|Sends Notification via| H
    G --> |AccessToken| F1r --> |Upload|ServiceAccount
    

    %% SkyWayによるビデオ通話
    I[SkyWay] -->|Uses| J[Secret Key]
    
    
    L -->|Store| E3
    
    %% 操作のデータフロー
    User(User) --> F1{Send Message}
    User --> F1r{Send File}
    User --> F2{Load Message}
    User --> F3{Call}
    User --> F4{Login}
    
    F1 --> |Save|B
    F1 --> |Update|E
    F2 --> B1
    
    %% 通知
    E3 -->|Trigger Update| G
    G -->|Retrieve Token| D3
    G -->|Send Push Notification| H
    %%H -->|Deliver Notification| User

    %% ログイン
    F4 --> C1
    F4 --> Sync
    F4 --> C3
    F4 --> C5
    F4 --> C5
    F4 -->|Update Token| D3
    F4 -->|Update Local Storage| L1

    %% グループ作成
    User -->|Create Group| B1
    User -->|Update Group Info| E1

    %% 友達追加
    User -->|Add Friend| C3
    User -->|Update Info| E1

    %% 電話 (SkyWay)
    User -->|Initiate Call <call=first>| F1
    %%F3 --> User2[Call.html]
    F3 -->|Receive Call| F1
    F3 -->|Ask SkyWay RoomId| L1
    F3 -->|Accept Call <call=did>| F1
    F3 -->|Start Video Session| I
    
    %%同期init
    User --> Sync(Initial Sync)
    Sync -->|Fetch| D3

    %% 補足的な関係
    H -->|Requires| D3
    User -->|Reads Data| L1
```
＃シーケンズ図
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Browser as ブラウザ
    participant ServiceWorker as サービスワーカー
    participant LocalStorage as ローカルストレージ
    participant Firebase as Firebase
    participant FirestoreDev as Firestore-dev
    participant FirestoreUsers as Firestore-Users
    participant FirestoreServer as Firestore-Server
    participant FirestoreInfo as Firestore-Info
    participant GlitchServer as Glitchサーバー
    participant FCM as Firebase Cloud Messaging
    participant SkyWay as SkyWay
    participant GoogleDrive as Googleドライブ
    participant AppsScript as Apps Script
    participant GoogleCloud as Google Cloud

    %% ユーザーの操作
    User->>Browser: アプリにアクセス
    Browser->>LocalStorage: データの読み書き
    Browser->>ServiceWorker: サービスワーカーと通信
    ServiceWorker->>FCM: 通知の受信

    %% メッセージ送信
    User->>Browser: メッセージ送信 (F1)
    Browser->>FirestoreDev: メッセージを保存
    Browser->>FirestoreInfo: メッセージ情報を更新
    FirestoreInfo-->>GlitchServer: 変更を検知
    GlitchServer->>FirestoreServer: トークン取得
    GlitchServer->>FCM: プッシュ通知を送信
    FCM->>ServiceWorker: 通知を配信
    ServiceWorker->>User: 通知表示

    %% ファイル送信
    ServiceAccount->>GlitchServer: トークン提供
    User ->>GlitchServer: サービスアカウントトークンを取得
    User ->>ServeceAccount: ファイル受け取り
    ServiceAccount->>GoogleDrive: ファイルをアップロード (F1r)
    GoogleDrive->>ServiceAccount: アクセストークンで認証
    

    %% メッセージ読み込み
    User->>Browser: メッセージを読み込む (F2)
    Browser->>FirestoreDev: メッセージを取得

    %% ビデオ通話
    User->>Browser: 通話を開始 (F3)
    Browser->>SkyWay: セッションを開始
    SkyWay->>User: 通話を確立

    %% ログイン
    User->>FirestoreUsers: ログイン情報を取得 (F4)
    FirestoreUsers->>FirestoreServer: トークンを更新
    FirestoreServer->>LocalStorage: トークンを保存
    User->>LocalStorage: ローカルストレージを更新

    %% グループ作成
    User->>FirestoreDev: グループを作成
    User->>FirestoreInfo: グループ情報を更新

    %% 友達追加
    User->>FirestoreUsers: フレンドリストを更新
    User->>FirestoreInfo: ユーザー情報を更新

    %% 初期同期
    User->>FirestoreServer: データを同期
    FirestoreServer->>LocalStorage: データを保存

    %% その他の操作
    AppsScript->>GoogleDrive: ファイル管理
    GoogleCloud->>Firebase: モニタリング（未実装）
```

通知の仕組みだけ。
```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant FirestoreDev as Firestore(dev)
    participant FirestoreInfo as Firestore(Info)
    participant GlitchServer
    participant FirestoreServer as Firestore(Server)
    participant FCM

    User->>Browser: Send Message
    Browser->>FirestoreDev: Update messages array
    Browser->>FirestoreInfo: Update lastMessage
    User->>Browser: Manage message updates
    FirestoreDev->>User: Snapshot update detected
    FirestoreInfo->>User: Snapshot update detected
    GlitchServer->>FirestoreInfo: Snapshot update detected
    GlitchServer->>FirestoreServer: Get FCM Token
    GlitchServer->>FCM: Send Notification
    FCM->>User: Receive Notification
```
