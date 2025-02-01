document.addEventListener('keydown', function(event) {
    // 同時押しを検出するための変数
    let keys = {
        e: false,
        s: false,
        c: false,
    };
    // キーが押された時の処理
    function keyDownHandler(event) {
        switch (event.key) {
            case 'e':
                keys.e = true;
                break;
            case 's':
                keys.s = true;
                break;
            case 'c':
                keys.c = true;
                break;
        }
        checkCombination();
    }
    // キーが離された時の処理
    function keyUpHandler(event) {
        switch (event.key) {
            case 'e':
                keys.e = false;
                break;
            case 's':
                keys.s = false;
                break;
            case 'c':
                keys.c = false;
                break;
        }
    }
    // 全てのキーが押されたか確認する処理
    function checkCombination() {
        if (keys.e && keys.s && keys.c) {
            window.location.href = '../recover/recover.html';
        }
    }
    // イベントリスナーの登録
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
});