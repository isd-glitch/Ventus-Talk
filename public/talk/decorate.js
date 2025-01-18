document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const chatMenu = document.getElementById('chat-menu');
    const closeMenuButton = document.getElementById('close-menu-button');

    // メニューアイコンのクリックイベント
    menuButton.addEventListener('click', () => {
      console.log('chat menu open')
        chatMenu.classList.add('open');
    });

    // 閉じるボタンのクリックイベント
    closeMenuButton.addEventListener('click', () => {
        chatMenu.classList.remove('open');
    });
});
