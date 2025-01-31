// ログイン情報のチェック
const username = localStorage.getItem("username");
if (!username) {
  // ログイン情報がない場合はログインページにリダイレクト
  window.location.href = "/login/login.html";
} else {
  // ログイン情報がある場合は表示
  document.getElementById("username").textContent = username;
}
