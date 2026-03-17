const axios = require('axios');
const logger = require('./logger');

class SholatAPI {
    static async getJadwal(apiKey, kota) {
        try {
            logger.info('sholat_api', `Mengambil jadwal sholat untuk kota ${kota}`, { kota });
            const res = await axios.get(`http://api-sholat.appku.asia/api?action=jadwal&kota=${kota}`, {
                headers: { 'X-API-Key': apiKey }
            });
            if (res.data && res.data.status === 'success' && res.data.data) {
                logger.success('sholat_api', `Berhasil mengambil jadwal sholat untuk kota ${kota}`, { kota, dataCount: Object.keys(res.data.data).length });
                return res.data.data; 
            } else {
                throw new Error("Struktur response API tidak sesuai atau gagal");
            }
        } catch (error) {
            logger.error('sholat_api', `Gagal mengambil jadwal sholat untuk kota ${kota}: ${error.message}`, { kota, error: error.message });
            throw error;
        }
    }
}
module.exports = SholatAPI;
