import { doc, updateDoc, arrayUnion } from "../../firebase-setup.js";
import { addLog } from "../../helper.js";

export class FileUploader {
  constructor(selectedChatId, myuserId, dbdev) {
    this.selectedChatId = selectedChatId;
    this.myuserId = myuserId;
    this.dbdev = dbdev;
  }

  updateChatId(chatId) {
    this.selectedChatId = chatId;
  }

  initFileUpload() {
    const fileUploadImage = document.getElementById("file-upload");
    const fileInput = document.getElementById("fileInput");
    const result = document.getElementById("chat-box");
    
    fileUploadImage.addEventListener("click", () => fileInput.click());
    
    fileInput.addEventListener("change", async () => {
      console.log("upload start");
      if (fileInput.files.length === 0) return;
      this.showProgressBar();
      
      const files = Array.from(fileInput.files); // 複数ファイル対応
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExtension = file.name.split(".").pop();
          addLog(`アップロード中: ${file.name}`, "b");
          const fileData = await this.uploadFile(file);
          
          console.log(fileData); // ここでfileDataの内容を確認
          const timestamp = new Date().toISOString();
          const messageId = this.generateRandomId();
          const newMessage = {
            timestamp: timestamp,
            message: `${this.myuserId}から新規ファイル`,
            extension: fileExtension,
            filename: file.name,
            resourceFileId: fileData.id,
            messageId: messageId,
            sender: this.myuserId,
          };
          
          const docRef = doc(this.dbdev, "ChatGroup", this.selectedChatId);
          await updateDoc(docRef, {
            messages: arrayUnion(newMessage),
          });
          
          addLog(`アップロード成功: ${file.name}`, "info");
        }
      } catch (error) {
        addLog(`エラー: ${error.message}`, "error");
      } finally {
        fileInput.value = "";
        this.updateProgressBar(0); // 完了後にプログレスバーをリセットする
        this.hideProgressBar();
      }
    });
  }

  async uploadFile(file) {
    const accessToken = await this.getAccessToken();
    const parentFolderId = "10sasE7BA_hUO6WDgpGtJ-BDX8MzZvB2U";
    const folderId = await this.createFolderIfNotExists(this.selectedChatId, parentFolderId);
    
    let fileData;
    if (file.size > 5 * 1024 * 1024) {
      // 5MB以上の場合
      fileData = await this.resumableUpload(file, accessToken, folderId);
    } else {
      // 5MB未満の場合
      fileData = await this.simpleUpload(file, accessToken, folderId);
    }

    console.log(fileData);
    return fileData;
  }

  async getAccessToken() {
    const response = await fetch("/get-token");
    const data = await response.json();
    return data.token;
  }

  async createFolderIfNotExists(folderName, parentId) {
    try {
      const accessToken = await this.getAccessToken();
      const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`エラーが発生しました: ${response.status}`);
      }

      const json = await response.json();

      if (json.files && json.files.length > 0) {
        return json.files[0].id;
      }

      const metadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      };
      const createResponse = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!createResponse.ok) {
        throw new Error(`フォルダの作成に失敗しました: ${createResponse.status}`);
      }

      const createJson = await createResponse.json();
      return createJson.id;
    } catch (error) {
      console.error(`Error creating folder: ${error.message}`);
      throw error;
    }
  }

  async simpleUpload(file, accessToken, folderId) {
    const metadata = {
      name: file.name,
      parents: [folderId],
    };
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      true
    );
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        this.updateProgressBar(percentComplete);
      }
    };

    xhr.onload = function () {
      if (xhr.status === 200) {
        console.log("アップロードに成功しました");
        this.updateProgressBar(100); // 完了時にプログレスバーを100%にする
      } else {
        console.error("アップロードに失敗しました: " + xhr.status);
      }
    }.bind(this);

    xhr.onerror = function () {
      console.error("ネットワークエラーが発生しました: " + xhr.status);
    };

    xhr.send(form);
    const response = await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
    });

    return JSON.parse(response);
  }

  async resumableUpload(file, accessToken, folderId) {
    const metadata = {
      name: file.name,
      parents: [folderId],
    };
    const init = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!init.ok) {
      throw new Error(`アップロードの初期化に失敗しました: ${init.status}`);
    }

    const uploadUrl = init.headers.get("Location");
    const CHUNK_SIZE = 256 * 1024; // 256KB
    let start = 0;
    const fileSize = file.size;
    let response;

    while (start < fileSize) {
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader(
        "Content-Range",
        `bytes ${start}-${end - 1}/${fileSize}`
      );
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = ((start + event.loaded) / fileSize) * 100;
          this.updateProgressBar(percentComplete);
        }
      };
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 308) {
          start = end;
        } else {
          console.error("アップロードに失敗しました: " + xhr.status);
        }
      };
      xhr.send(chunk);
      response = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(xhr.statusText);
      });
    }
    
    const finalResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Range": `bytes */${fileSize}`,
      },
    });

    if (!finalResponse.ok) {
      throw new Error(`アップロードに失敗しました: ${finalResponse.status}`);
    }

    const json = await finalResponse.json();
    this.updateProgressBar(100); // 完了時にプログレスバーを100%にする
    return json;
  }

  updateProgressBar(percentage) {
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = percentage + "%";
    console.log(percentage, "progress bar check");
    progressBar.textContent = Math.round(percentage) + "%";
  }

  showProgressBar() {
    document.getElementById("progress-container").style.display = "block";
  }

  hideProgressBar() {
    document.getElementById("progress-container").style.display = "none";
  }
  
  generateRandomId() {
    return Math.random().toString(36).substring(2, 18);
  }
}
