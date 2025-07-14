const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
    const {
        fullName,
        passport,
        passportCountry,
        profession,
        rank ,
        visitDate,
        conviction,
        rfBan,
        photoUrls,
        attestations
    } = req.body;

    try {
        const existing = await prisma.attestation.findUnique({
            where: { passport: req.body.passport }
        });


        if (existing) {
            const updated = await prisma.attestation.update({
                where: { passport },
                data: {
                    fullName,
                    passportCountry,
                    profession,
                    visitDate,
                    conviction,
                    rfBan,
                    photoUrls,
                    attestations,
                }
            });

            return res.status(200).json({
                message: 'Запись обновлена',
                certificateNumber: updated.certificateNumber,
                attestation: updated
            });
        }


        // Сначала получаем последний номер сертификата
        const lastCert = await prisma.attestation.findFirst({
            orderBy: { certificateNumber: 'desc' },
            select: { certificateNumber: true }
        });

        const nextCertNumber = (lastCert?.certificateNumber || 0) + 1;

        const attestation = await prisma.attestation.create({
            data: {
                fullName,
                passport: passport.replace(/\s+/g, ''),
                passportCountry,
                profession,
                visitDate: visitDate ? new Date(visitDate) : undefined,
                conviction,
                rfBan,
                attestations ,
                photoUrls,
                certificateNumber: nextCertNumber
            },
        });

        res.status(201).json(attestation);
    } catch (err) {
        console.error('❌ Ошибка при сохранении аттестации:', err);
        res.status(500).json({ error: 'Ошибка при сохранении анкеты' });
    }
});

router.get('/search', async (req, res) => {
    const { passport } = req.query;

    if (!passport) {
        return res.status(400).json({ error: 'Параметр passport обязателен' });
    }

    try {
        const record = await prisma.attestation.findUnique({
            where: { passport }
        });

        if (!record) {
            return res.status(200).json(null); // null если не найдено — это ок
        }

        // Убедимся, что attestations — это массив (если вдруг null в базе)
        const result = {
            ...record,
            attestations: Array.isArray(record.attestations) ? record.attestations : []
        };

        res.json(result);
    } catch (err) {
        console.error('Ошибка при поиске:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.put('/edit/:passport', async (req, res) => {
    const { passport } = req.params;
    const {
        fullName,
        passportCountry,
        profession,
        rank,
        visitDate,
        conviction,
        rfBan,
        photoUrls,
        attestations,
    } = req.body;

    try {
        // Получаем текущий certificateNumber и проверяем его наличие
        const existing = await prisma.attestation.findUnique({
            where: { passport },
            select: { certificateNumber: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Запись с таким паспортом не найдена' });
        }

        const updatedAttestation = await prisma.attestation.update({
            where: { passport },
            data: {
                fullName,
                passportCountry,
                profession,
                rank ,
                visitDate: visitDate ? new Date(visitDate) : undefined,
                conviction,
                rfBan,
                photoUrls,
                attestations,
                certificateNumber: existing.certificateNumber
            }
        });

        res.json(updatedAttestation);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Запись с таким паспортом не найдена' });
        }

        console.error('Ошибка при обновлении:', err);
        res.status(500).json({ error: 'Ошибка при обновлении записи' });
    }
});


// routes/attestation.js
router.get('/result/:passport', async (req, res) => {
    try {
        const { passport } = req.params;
        const record = await prisma.attestation.findUnique({
            where: { passport }
        });

        if (!record) {
            return res.status(404).json({ error: 'Анкета не найдена' });
        }

        res.json(record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении анкеты' });
    }
});

// routes/attestation.js или где у тебя

const StorageService = require('../utils/storageService');

router.put('/remove-file', async (req, res) => {
    const { passport, key } = req.body;

    // Проверяем, что ключ не пустой
    if (!passport || !key) {
        return res.status(400).json({ error: 'Не указан паспорт или ключ файла' });
    }

    const storage = new StorageService();

    try {
        // Получаем анкету по паспорту
        const record = await prisma.attestation.findUnique({
            where: { passport }
        });

        if (!record) {
            return res.status(404).json({ error: 'Анкета не найдена' });
        }

        // --- ГЛАВНАЯ ДИАГНОСТИКА ---
        // Выводим в консоль то, что мы собираемся сравнивать.
        console.log('---------------------------------');
        console.log('[ДИАГНОСТИКА] Ключ, полученный для удаления (key):');
        console.log(`> "${key}" (тип: ${typeof key})`);

        console.log('\n[ДИАГНОСТИКА] Массив ссылок, который хранится в БД (record.photoUrls):');
        console.log(record.photoUrls);
        console.log('---------------------------------');
        // --- КОНЕЦ ДИАГНОСТИКИ ---

        // Пытаемся удалить файл из S3
        try {
            await storage.delete(key);
            console.log(`[S3] Файл с ключом "${key}" успешно отправлен на удаление.`);
        } catch (s3Error) {
            console.error(`[S3] Ошибка при удалении ключа "${key}" из S3 (это может быть нормально, если файла там и не было):`, s3Error.message);
        }

        // Обновляем запись в БД
        const originalLength = record.photoUrls.length;
        const updatedPhotoUrls = record.photoUrls.filter(urlInDb => urlInDb !== key);
        const newLength = updatedPhotoUrls.length;

        // Проверяем, изменился ли массив
        if (originalLength === newLength) {
            console.warn('\n[ПРЕДУПРЕЖДЕНИЕ] Фильтр не нашел ключ в массиве! Массив не изменился. Проверьте соответствие ключа и ссылок в БД.');
        } else {
            console.log('\n[УСПЕХ] Ключ был найден и отфильтрован из массива.');
        }

        await prisma.attestation.update({
            where: { passport },
            data: { photoUrls: updatedPhotoUrls }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[КРИТИЧЕСКАЯ ОШИБКА] Ошибка в эндпоинте /remove-file:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.delete('/delete', async (req, res) => {
    const { passport } = req.body;

    if (!passport) {
        return res.status(400).json({ error: 'Паспорт обязателен' });
    }

    try {
        await prisma.attestation.delete({
            where: { passport }
        });

        res.json({ message: 'Анкета успешно удалена' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Анкета не найдена' });
        }

        console.error('Ошибка при удалении анкеты:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});





module.exports = router;

