const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
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
                    rank,
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
                rank,
                visitDate: visitDate ? new Date(visitDate) : undefined,
                conviction,
                rfBan,
                attestations,
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




// ---------------------------------------------------------------------------
// Выгрузка базы аттестаций в Excel
// ---------------------------------------------------------------------------

// Список существующих профессий для фильтра (SELECT DISTINCT profession)
router.get('/professions', async (req, res) => {
    try {
        const rows = await prisma.attestation.findMany({
            distinct: ['profession'],
            select: { profession: true },
            orderBy: { profession: 'asc' }
        });

        // Отбрасываем пустые/мусорные значения, оставляем непустые строки
        const professions = rows
            .map(r => r.profession)
            .filter(p => typeof p === 'string' && p.trim() !== '');

        res.json(professions);
    } catch (err) {
        console.error('Ошибка при получении списка профессий:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Приводим дату к ДД.ММ.ГГГГ; невалидную/пустую — в пустую строку
const formatDateRu = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getUTCFullYear()).padStart(4, '0');
    return `${dd}.${mm}.${yyyy}`;
};

// Результат аттестации: «Сдал» только если и теория, и практика сданы
const resultLabel = (att) => {
    const theoryOk = att?.theory === 'Сдано';
    const practiceOk = att?.practice === 'Сдано';
    return theoryOk && practiceOk ? 'Сдал' : 'Не сдал';
};

router.get('/export', async (req, res) => {
    try {
        const { dateFrom, dateTo, profession, result, certFrom, certTo } = req.query;

        // Фильтр по профессии можно отдать на уровень БД
        const where = {};
        if (profession && profession.trim() !== '') {
            where.profession = profession;
        }

        const records = await prisma.attestation.findMany({
            where,
            orderBy: { certificateNumber: 'asc' }
        });

        // Границы периода (по дате визита). Конец — включительно, до конца суток.
        const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
        const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
        const fromValid = from && !isNaN(from.getTime()) ? from : null;
        const toValid = to && !isNaN(to.getTime()) ? to : null;

        // Границы по номеру сертификата
        const certFromNum = certFrom !== undefined && certFrom !== '' ? Number(certFrom) : null;
        const certToNum = certTo !== undefined && certTo !== '' ? Number(certTo) : null;

        // Разворачиваем JSON attestations в плоские строки.
        // Человек без аттестаций даёт одну строку с пустыми «Тип»/«Результат»,
        // чтобы не выпасть из выгрузки без фильтра по результату.
        const rows = [];
        for (const rec of records) {
            // Фильтр по дате визита (на уровне приложения)
            if (fromValid || toValid) {
                if (!rec.visitDate) continue;
                const visit = new Date(rec.visitDate);
                if (isNaN(visit.getTime())) continue;
                if (fromValid && visit < fromValid) continue;
                if (toValid && visit > toValid) continue;
            }

            // Фильтр по номеру сертификата
            if (certFromNum !== null && !isNaN(certFromNum) && rec.certificateNumber < certFromNum) continue;
            if (certToNum !== null && !isNaN(certToNum) && rec.certificateNumber > certToNum) continue;

            const base = {
                fullName: rec.fullName || '',
                passport: rec.passport || '',
                passportCountry: rec.passportCountry || '',
                profession: rec.profession || '',
                rank: rec.rank || '',
                certificateNumber: rec.certificateNumber,
                visitDate: formatDateRu(rec.visitDate),
                conviction: rec.conviction || '',
                rfBan: rec.rfBan || ''
            };

            const atts = Array.isArray(rec.attestations) ? rec.attestations : [];

            if (atts.length === 0) {
                // Нет аттестаций — одна строка с пустым типом/результатом
                if (result === 'passed' || result === 'failed') continue;
                rows.push({ ...base, attType: '', attResult: '' });
                continue;
            }

            for (const att of atts) {
                const label = resultLabel(att);
                if (result === 'passed' && label !== 'Сдал') continue;
                if (result === 'failed' && label !== 'Не сдал') continue;
                rows.push({ ...base, attType: att?.type || '', attResult: label });
            }
        }

        // Генерируем xlsx
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Аттестации');

        sheet.columns = [
            { header: 'ФИО', key: 'fullName', width: 28 },
            { header: 'Паспорт', key: 'passport', width: 18 },
            { header: 'Страна', key: 'passportCountry', width: 16 },
            { header: 'Профессия', key: 'profession', width: 26 },
            { header: 'Разряд', key: 'rank', width: 10 },
            { header: '№ сертификата', key: 'certificateNumber', width: 14 },
            { header: 'Дата визита', key: 'visitDate', width: 14 },
            { header: 'Тип аттестации', key: 'attType', width: 34 },
            { header: 'Результат', key: 'attResult', width: 12 },
            { header: 'Судимость', key: 'conviction', width: 22 },
            { header: 'Запрет РФ', key: 'rfBan', width: 22 }
        ];

        // Шапка жирная + автофильтр
        sheet.getRow(1).font = { bold: true };
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheet.columns.length }
        };

        rows.forEach(r => sheet.addRow(r));

        const fileDate = formatDateRu(new Date()).split('.').reverse().join('-'); // YYYY-MM-DD
        const fileName = `attestations_${fileDate}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Ошибка при выгрузке в Excel:', err);
        res.status(500).json({ error: 'Ошибка при формировании файла' });
    }
});


module.exports = router;

