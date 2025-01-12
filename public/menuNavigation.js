document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = item.getAttribute('data-page');
            if (page) {
                if (page === 'home') {
                    window.location.href = '../home/home.html';
                } else if (page === 'talk') {
                    window.location.href = '../talk/index.html';
                } else if (page === 'settings') {
                    window.location.href = '../settings/settings.html';
                }
            }
        });
    });
});
