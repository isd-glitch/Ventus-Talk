import { 
    appd, app1, app2, appUsers, appInfo, 
    dbdev, db1, db2, dbUsers, dbInfo, 
    collection, addDoc, serverTimestamp, query, orderBy, username, 
    setDoc, doc, getDoc, myuserId 
} from '../firebase-setup.js';

const myUserId = myuserId;

async function addFriend_ID() {
  const addFriendWindow = document.getElementById('add-friend-window');
    addFriendWindow.classList.toggle('visible');
    
    console.log('searching');
    const userIdElement = document.getElementById('user-id');
    const userId = userIdElement.value;
    if (myuserId === userId) {alert('自分を友達登録することはできません。あなたはぼっちですか？');return};

    const userDocRef = doc(dbdev, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            console.log('User found:', userDoc.data());

            // Add to friend's friendList
            const friendList = userDoc.data().friendList || [];
            if (!friendList.includes(myUserId)) {
                friendList.push(myUserId);
                await setDoc(userDocRef, { friendList }, { merge: true });
                console.log('Friend added successfully.');
                alert('Friend added successfully.');
            } else {
                console.log('User is already your friend.');
                alert('User is already your friend.');
            }

            // Generate ChatId and update ChatIdList for both users
            const chatId = generateChatId();
            const chatGroupName = `Group_${chatId}`;
            const serverID = "dev"
            const timestamp = serverTimestamp();
            const pinned = false;
          
          /*
            const chatIdRef = doc(dbdev, 'chatIdList', chatId);
            await setDoc(chatIdRef, {  serverID,pinned });
*/
            // Update friend's chatIdList
            const friendChatIdListRef = doc(dbdev, 'users', userId, 'chatIdList', chatId);
            await setDoc(friendChatIdListRef, { serverID, pinned});

            // Update my friendList
            const myDocRef = doc(dbdev, 'users', myuserId);
            const myDoc = await getDoc(myDocRef);
          //friend's frinedList
            const myFriendList = myDoc.data().friendList || [];
            if (!myFriendList.includes(userId)) {
                myFriendList.push(userId);
                await setDoc(myDocRef, { friendList: myFriendList }, { merge: true });
            }
          
          //Update my ChatId list
            const myChatIdListRef = doc(dbdev, 'users', myuserId, 'chatIdList', chatId);
            await setDoc(myChatIdListRef, {serverID, pinned });
          
            const chatGroupRef = doc(dbdev, 'ChatGroup', chatId);
            await setDoc(chatGroupRef, { usernames: [myuserId, userId], chatGroupName, timestamp });

        } else {
            console.log('User not found.');
            alert('User not found.');
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Error adding friend: ' + error.message);
    }
}

function generateChatId() {
    return 'chat_' + Math.random().toString(36).substr(2, 9);
}
document.getElementById('register-button').addEventListener('click', addFriend_ID);

document.getElementById('add-friend').addEventListener('click', function() {
    const addFriendWindow = document.getElementById('add-friend-window');
    addFriendWindow.classList.toggle('visible');
    console.log('add friend');
  document.getElementById('user-id-display').textContent = `ユーザーID: ${myuserId}`;
});






async function updateFriendList() {
    const friendListContainer = document.getElementById('friend-list');
    
    // 自分の友達リストのパス
    const friendListDocRef = doc(dbdev, `users/${myuserId}`);
    const friendListDoc = await getDoc(friendListDocRef);
    
    if (friendListDoc.exists()) {
        const friendListData = friendListDoc.data().friendList;
        for (const friendUserId of friendListData) {
            // 各友達のユーザー名を取得
            const userDocRef = doc(dbdev, `users/${friendUserId}`);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const username = userDoc.data().username;
                
                // 友達リストに追加
                const friendItem = document.createElement('div');
                friendItem.className = 'friend-item';
                friendItem.setAttribute('data-friend-user-id', friendUserId);
                friendItem.textContent = username;
                friendListContainer.appendChild(friendItem);
            }
        }
    }
  
  addEventListenersToChatItems();
}


document.addEventListener('DOMContentLoaded', () => {
  updateFriendList();
});


function addEventListenersToChatItems() {
  document.querySelectorAll('.friend-item').forEach((chatItem) => {
    chatItem.addEventListener('click', () => {
      const selectedChatId = chatItem.getAttribute('data-friend-user-id');
      console.log(selectedChatId);
    });
  });
}
