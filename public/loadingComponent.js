/**
 * アプリケーション内で使用できるローディングコンポーネント
 */
class LoadingComponent {
  /**
   * ローディングコンポーネントを初期化
   * @param {string} message - 表示するメッセージ
   * @param {boolean} fullScreen - 画面全体に表示するかどうか
   */
  constructor(message = 'Ventus Talk を読み込み中...', fullScreen = true) {
    this.message = message;
    this.fullScreen = fullScreen;
    this.element = null;
  }

  /**
   * ローディングコンポーネントを表示
   * @param {HTMLElement} container - ローディングを表示するコンテナ要素
   * @returns {HTMLElement} 作成したローディング要素
   */
  show(container = document.body) {
    // 既存のローディング要素があれば削除
    this.hide();

    // 新しいローディング要素を作成
    this.element = document.createElement('div');
    this.element.className = 'loader-container';
    
    if (!this.fullScreen) {
      this.element.style.position = 'absolute';
      this.element.style.backgroundColor = 'rgba(248, 250, 252, 0.9)';
    }

    this.element.innerHTML = `
      <div class="loader">
        <div class="loader-circle"></div>
        <div class="loader-circle"></div>
        <div class="loader-circle"></div>
      </div>
      <div class="loader-ripple"></div>
      <div class="loader-ripple"></div>
      <div class="loader-text">${this.message}</div>
    `;

    container.appendChild(this.element);
    return this.element;
  }

  /**
   * ローディングコンポーネントを非表示
   */
  hide() {
    if (this.element && this.element.parentNode) {
      this.element.style.opacity = '0';
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          this.element = null;
        }
      }, 500);
    }
  }

  /**
   * メッセージを更新
   * @param {string} newMessage - 新しいメッセージ
   */
  updateMessage(newMessage) {
    if (this.element) {
      const textElement = this.element.querySelector('.loader-text');
      if (textElement) {
        textElement.textContent = newMessage;
      }
    }
    this.message = newMessage;
  }
}

// グローバルに使用できるようにエクスポート
window.LoadingComponent = LoadingComponent;

// モジュールとしてもエクスポート
export default LoadingComponent;
