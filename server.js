const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
// 最初に loading.html を読み込むルーティング
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'loading.html'));
});
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
