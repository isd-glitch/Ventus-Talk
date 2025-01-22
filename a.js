function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = percentage + "%";
  console.log(percentage,"progress bar check")
  progressBar.textContent = Math.round(percentage) + "%";
}

function showProgressBar() {
  document.getElementById("progress-container").style.display = "block";
}

function hideProgressBar() {
  document.getElementById("progress-container").style.display = "none";
}

async function uploadFile(file) {
  const accessToken = await getAccessToken();
  const parentFolderId = "1QsqLlsAp5MUSHbn7Cibh9WQ8DG-oKdzl";
  const folderId = await createFolderIfNotExists(selectedChatId, parentFolderId);
  let fileData;
  
  if (file.size > 5 * 1024 * 1024) { // 5MB以上の場合
    fileData = await resumableUpload(file, accessToken, folderId);
  } else { // 5MB未満の場合
    fileData = await simpleUpload(file, accessToken, folderId);
  }
  
  console.log(fileData); // ここでfileDataの内容を確認
  return fileData;
}

async function simpleUpload(file, accessToken, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId]
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);
  
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
  xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
  
  xhr.upload.onprogress = function(event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      updateProgressBar(percentComplete);
    }
  };
  
  xhr.onload = function() {
    if (xhr.status === 200) {
      console.log("アップロードに成功しました");
      updateProgressBar(100); // 完了時にプログレスバーを100%にする
    } else {
      console.error("アップロードに失敗しました: " + xhr.status);
    }
  };
  
  xhr.send(form);
  const response = await new Promise((resolve, reject) => {
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
  });
  
  return JSON.parse(response);
}
