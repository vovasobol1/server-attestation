const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {

    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        return res.status(200).json({ ok: true });
    } else {
        return res.status(401).json({ message: 'Неверный пароль' });
    }
});

module.exports = router;