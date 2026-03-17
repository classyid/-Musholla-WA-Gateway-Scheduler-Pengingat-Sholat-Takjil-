const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const scheduler = require('./src/scheduler');
const WhatsAppAPI = require('./src/whatsapp');
const logger = require('./src/logger');

const app = express();
const PORT = 5531;
const configPath = path.join(__dirname, 'data/config.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const readConfig = () => JSON.parse(fs.readFileSync(configPath, 'utf8'));
const writeConfig = (data) => fs.writeFileSync(configPath, JSON.stringify(data, null, 2));

app.get('/api/config', (req, res) => {
    try {
        res.json(readConfig()); // FIX BUG 4: tambah try/catch agar tidak crash jika file config rusak/tidak ada
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Gagal membaca konfigurasi: ' + error.message });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        writeConfig(req.body);
        logger.info('system', 'Konfigurasi aplikasi diperbarui');
        await scheduler.syncDailySchedule(); 
        res.json({ status: 'success', message: 'Konfigurasi disimpan.' });
    } catch (error) { 
        logger.error('system', `Gagal menyimpan konfigurasi: ${error.message}`, { error: error.message });
        res.status(500).json({ status: 'error', message: error.message }); 
    }
});

app.post('/api/test-wa', async (req, res) => {
    try {
        logger.info('system', 'Memulai test koneksi WhatsApp');
        const status = await WhatsAppAPI.checkStatus(req.body.wa_url, req.body.wa_api_key);
        res.json({ status: 'success', data: status });
    } catch (error) { res.status(500).json({ status: 'error', message: error.message }); }
});

app.post('/api/test-msg-imsyak', async (req, res) => {
    const { wa_url, wa_api_key, target_phone, pesan_template, cctv_url } = req.body;
    try {
        logger.info('system', `Memulai test broadcast Imsyak ke ${target_phone}`);
        const message = scheduler.generateMessage(pesan_template, scheduler.currentData);
        const result = await WhatsAppAPI.sendWithFallback(wa_url, wa_api_key, target_phone, message, cctv_url);
        res.json({ status: 'success', data: result, sent_message: message });
    } catch (error) { res.status(500).json({ status: 'error', message: error.message }); }
});

app.post('/api/test-msg-takjil', async (req, res) => {
    const { wa_url, wa_api_key, target_phone, pesan_takjil_template, cctv_url } = req.body;
    try {
        logger.info('system', `Memulai test broadcast Takjil ke ${target_phone}`);
        const takjilData = scheduler.todayTakjil || { puasa_ke: "X", nama: "Bpk/Ibu Fulan (Simulasi)", no_rumah: "X.XX" };
        const message = scheduler.generateMessage(pesan_takjil_template, scheduler.currentData, takjilData);
        const result = await WhatsAppAPI.sendWithFallback(wa_url, wa_api_key, target_phone, message, cctv_url);
        res.json({ status: 'success', data: result, sent_message: message });
    } catch (error) { res.status(500).json({ status: 'error', message: error.message }); }
});

app.get('/api/current-schedule', (req, res) => {
    res.json({ status: 'success', data: scheduler.currentData, takjil: scheduler.todayTakjil });
});

app.post('/api/snapshot-cctv', async (req, res) => {
    const { cctv_url } = req.body;
    if (!cctv_url || cctv_url.trim() === '') {
        return res.status(400).json({ status: 'error', message: 'URL CCTV tidak boleh kosong' });
    }
    
    try {
        logger.info('cctv', `Mengambil snapshot CCTV`, { url: cctv_url });
        const imageRes = await axios.get(cctv_url, { 
            responseType: 'arraybuffer', 
            timeout: 10000,
            maxContentLength: 10 * 1024 * 1024 // 10MB max
        });
        
        const contentType = imageRes.headers['content-type'] || 'image/jpeg';
        const base64Image = Buffer.from(imageRes.data).toString('base64');
        const dataUri = `data:${contentType};base64,${base64Image}`;
        
        logger.success('cctv', `Berhasil mengambil snapshot CCTV`, { contentType, size: imageRes.data.length });
        res.json({ 
            status: 'success', 
            data: { 
                dataUri,
                contentType,
                size: imageRes.data.length
            } 
        });
    } catch (error) {
        logger.error('cctv', `Gagal mengambil snapshot CCTV: ${error.message}`, { url: cctv_url, error: error.message });
        res.status(500).json({ 
            status: 'error', 
            message: `Gagal mengambil snapshot CCTV: ${error.message}` 
        });
    }
});

// Logging Endpoints
app.get('/api/logs', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const category = req.query.category || null;
        const type = req.query.type || null;

        const allLogs = logger.getLogs();
        
        // Filter logs
        let filteredLogs = allLogs;
        if (category) filteredLogs = filteredLogs.filter(log => log.category === category);
        if (type) filteredLogs = filteredLogs.filter(log => log.type === type);

        // Sort descending (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

        res.json({
            status: 'success',
            data: paginatedLogs,
            meta: {
                total: filteredLogs.length,
                page,
                limit,
                totalPages: Math.ceil(filteredLogs.length / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/api/logs/stats', (req, res) => {
    try {
        res.json({ status: 'success', data: logger.getStats() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.delete('/api/logs', (req, res) => {
    try {
        logger.clearLogs();
        res.json({ status: 'success', message: 'Semua log berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(PORT, () => {
    logger.info('system', `Server berjalan di port ${PORT}`, { port: PORT });
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    scheduler.start();
});
