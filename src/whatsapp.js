const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

class WhatsAppAPI {
    static async checkStatus(waUrl, waApiKey) {
        try {
            const headers = waApiKey ? { 'X-API-Key': waApiKey } : {};
            const res = await axios.get(`${waUrl}/api/status`, { headers, timeout: 5000 });
            logger.success('whatsapp', 'Test koneksi WhatsApp berhasil', { url: waUrl, status: res.data });
            return res.data;
        } catch (error) { 
            logger.error('whatsapp', `Test koneksi WhatsApp gagal: ${error.message}`, { url: waUrl, error: error.message });
            throw new Error(error.response?.data?.message || error.message); 
        }
    }

    static async sendMessage(waUrl, waApiKey, phone, message) {
        try {
            const headers = { 'Content-Type': 'application/json', ...(waApiKey && { 'X-API-Key': waApiKey }) };
            const payload = { phone, message };
            const res = await axios.post(`${waUrl}/api/send-message`, payload, { headers });
            logger.success('whatsapp', `Pesan text berhasil dikirim ke ${phone}`, { phone, messageLength: message.length });
            return res.data;
        } catch (error) { 
            logger.error('whatsapp', `Gagal kirim pesan text ke ${phone}: ${error.message}`, { phone, error: error.message });
            throw new Error(error.response?.data?.message || error.message); 
        }
    }

    static async sendImage(waUrl, waApiKey, phone, caption, imageUrl) {
        try {
            const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
            const buffer = Buffer.from(imageRes.data);

            const form = new FormData();
            form.append('phone', phone);
            if (caption) form.append('caption', caption);
            form.append('file', buffer, { filename: 'cctv_musholla.jpg', contentType: 'image/jpeg' });

            const headers = { ...form.getHeaders(), ...(waApiKey && { 'X-API-Key': waApiKey }) };
            const res = await axios.post(`${waUrl}/api/send-image`, form, { headers });
            logger.success('whatsapp', `Pesan dengan gambar berhasil dikirim ke ${phone}`, { phone, imageSize: buffer.length, captionLength: caption?.length || 0 });
            return res.data;
        } catch (error) { 
            logger.error('whatsapp', `Gagal kirim pesan dengan gambar ke ${phone}: ${error.message}`, { phone, imageUrl, error: error.message });
            throw new Error(error.response?.data?.message || error.message); 
        }
    }

    static async sendWithFallback(waUrl, waApiKey, phone, message, imageUrl) {
        if (imageUrl && imageUrl.trim() !== '') {
            try {
                logger.info('whatsapp', `Mencoba kirim pesan dengan gambar ke ${phone}`, { phone, hasImage: true });
                return await this.sendImage(waUrl, waApiKey, phone, message, imageUrl);
            } catch (error) {
                logger.warning('whatsapp', `Gagal kirim gambar ke ${phone}, fallback ke text`, { phone, error: error.message });
                return await this.sendMessage(waUrl, waApiKey, phone, message);
            }
        } else {
            logger.info('whatsapp', `Kirim pesan text ke ${phone} (no image)`, { phone, hasImage: false });
            return await this.sendMessage(waUrl, waApiKey, phone, message);
        }
    }
}
module.exports = WhatsAppAPI;
