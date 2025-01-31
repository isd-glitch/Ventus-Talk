import {
  dbdev,dbServer,onMessage,collection,messaging,getToken,doc,addDoc,arrayUnion,reloadPage,
  updateDoc,dbUsers,setDoc,serverTimestamp,startAfter,onSnapshot,limit,
  query,orderBy,getDocs,getDoc,dbInfo
} from "../firebase-setup.js";





document.addEventListener("DOMContentLoaded", function () {
  const friend_query = getQueryParam("callTo");
  if (friend_query && localStorage.getItem("userID")) {
  }
  
});

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
