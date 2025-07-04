const express = require('express');
const multer = require('multer');
const StorageService = require('../utils/storageService');

const upload = multer();
const router = express.Router();
const storageService = new StorageService();
const path = require('path');
const slugify = require('slugify');

router.post('/', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;

        if (!files || !files.length) {
            return res.status(400).json({ message: 'No files provided' });
        }

        const urls = await Promise.all(
            files.map(async (file) => {
                const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const ext = path.extname(originalName); // .pdf, .jpg и т.д.
                const baseName = path.basename(originalName, ext); // без расширения

                const safeName = slugify(baseName, { lower: true, strict: true }) + ext.toLowerCase();

                const key = `files/${Date.now()}_${safeName}`;

                return storageService.uploadBuffer(file.buffer, key, file.mimetype);
            })
        );

        res.status(200).json({ count: urls.length, urls });
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ message: 'Failed to upload files' });
    }
});

module.exports = router;
