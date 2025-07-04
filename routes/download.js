const express = require('express');
const StorageService = require('../utils/storageService');
const router = express.Router();
const storageService = new StorageService();

router.get('/download/*', async (req, res) => {
    try {
        const key = decodeURIComponent(req.params[0]);
        const inline = req.query.inline === 'true';
        const object = await storageService.download(key);

        res.setHeader(
            'Content-Type',
            object.ContentType || 'application/octet-stream'
        );
        res.setHeader(
            'Content-Length',
            object.ContentLength?.toString() || ''
        );
        res.setHeader(
            'Content-Disposition',
            `${inline ? 'inline' : 'attachment'}; filename="${key.split('/').pop()}"`
        );

        object.Body.pipe(res);
    } catch (error) {
        console.error('Ошибка при скачивании файла:', error);
        res.status(500).json({ message: 'Failed to download file' });
    }
});


module.exports = router;
