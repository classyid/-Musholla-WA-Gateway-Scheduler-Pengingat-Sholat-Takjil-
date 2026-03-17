const cron = require('node-cron');
const SholatAPI = require('./sholat');
const WhatsAppAPI = require('./whatsapp');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class Scheduler {
    constructor() {
        this.jobImsyak = null;
        this.jobMaghrib = null;
        this.dailySyncJob = null;
        this.currentData = { jadwal: {}, tanggal: "", kota: "" };
        this.todayTakjil = null;
    }

    getConfig() { return JSON.parse(fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8')); }
    getTakjilData() { return JSON.parse(fs.readFileSync(path.join(__dirname, '../data/takjil.json'), 'utf8')); }

    generateMessage(template, apiData, takjilData = null) {
        if (!apiData || !apiData.jadwal) return "Jadwal belum tersedia.";
        
        let msg = template.replace(/{{kota}}/gi, apiData.kota).replace(/{{tanggal}}/gi, apiData.tanggal);

        const keys = ['imsyak', 'shubuh', 'terbit', 'dhuha', 'dzuhur', 'ashr', 'magrib', 'isya'];
        keys.forEach(k => {
            const val = apiData.jadwal[k] || '-';
            msg = msg.replace(new RegExp(`{{${k}}}`, 'gi'), val);
        });

        if (takjilData) {
            msg = msg.replace(/{{puasa_ke}}/gi, takjilData.puasa_ke || '-')
                     .replace(/{{nama}}/gi, takjilData.nama || '-')
                     .replace(/{{no_rumah}}/gi, takjilData.no_rumah || '-');
        }
        return msg;
    }

    async syncDailySchedule() {
        const config = this.getConfig();
        if (!config.kota || !config.target_phone || !config.wa_url) return;

        try {
            logger.info('scheduler', `Memulai sinkronisasi jadwal harian untuk ${config.kota}`, { kota: config.kota });
            const apiData = await SholatAPI.getJadwal(config.sholat_api_key, config.kota);
            this.currentData = apiData; 
            
            const allTakjil = this.getTakjilData();
            const dateStr = apiData.tanggal; // FIX BUG 1: tanggal ada di root apiData, bukan di dalam apiData.jadwal
            this.todayTakjil = allTakjil[dateStr] || null;
            
            this.clearJobs();
            
            // JADWAL IMSYAK (CEK ENABLE FLAG)
            const imsakTime = apiData.jadwal.imsyak;
            if (imsakTime && config.enable_imsyak !== false) { // Default true jika tidak ada field
                let [iH, iM] = imsakTime.split(':').map(Number);
                iH = (iH - 1 + 24) % 24; // FIX BUG 2: gunakan modulo agar aman dan tidak dobel hitung
                this.jobImsyak = cron.schedule(`${iM} ${iH} * * *`, async () => {
                    logger.info('scheduler', `Menjalankan broadcast Imsyak`, { time: imsakTime, scheduledTime: `${iH}:${iM}` });
                    const message = this.generateMessage(config.pesan_template, this.currentData);
                    try { 
                        await WhatsAppAPI.sendWithFallback(config.wa_url, config.wa_api_key, config.target_phone, message, config.cctv_url);
                        logger.success('scheduler', `Broadcast Imsyak berhasil`, { time: imsakTime });
                    } 
                    catch (err) { 
                        logger.error('scheduler', `Broadcast Imsyak gagal: ${err.message}`, { time: imsakTime, error: err.message });
                    }
                });
                logger.success('scheduler', `Jadwal Imsyak diaktifkan`, { scheduledTime: `${String(iH).padStart(2,'0')}:${String(iM).padStart(2,'0')}`, imsakTime });
            } else {
                logger.info('scheduler', `Jadwal Imsyak tidak aktif`, { enabled: config.enable_imsyak, hasTime: !!imsakTime });
            }

            // JADWAL TAKJIL MAGHRIB (CEK ENABLE FLAG)
            const magribTime = apiData.jadwal.magrib;
            if (magribTime && this.todayTakjil && config.enable_takjil !== false) { // Default true jika tidak ada field
                let [mH, mM] = magribTime.split(':').map(Number);
                mH = (mH - 1 + 24) % 24; // FIX BUG 2: gunakan modulo agar aman dan tidak dobel hitung
                this.jobMaghrib = cron.schedule(`${mM} ${mH} * * *`, async () => {
                    logger.info('scheduler', `Menjalankan broadcast Takjil & Undangan Kultum`, { time: magribTime, scheduledTime: `${mH}:${mM}` });
                    const message = this.generateMessage(config.pesan_takjil_template, this.currentData, this.todayTakjil);
                    try { 
                        await WhatsAppAPI.sendWithFallback(config.wa_url, config.wa_api_key, config.target_phone, message, config.cctv_url);
                        logger.success('scheduler', `Broadcast Takjil berhasil`, { time: magribTime, takjil: this.todayTakjil.nama });
                    } 
                    catch (err) { 
                        logger.error('scheduler', `Broadcast Takjil gagal: ${err.message}`, { time: magribTime, error: err.message });
                    }
                });
                logger.success('scheduler', `Jadwal Takjil diaktifkan`, { scheduledTime: `${String(mH).padStart(2,'0')}:${String(mM).padStart(2,'0')}`, magribTime, takjil: this.todayTakjil.nama });
            } else {
                if (!magribTime) {
                    logger.info('scheduler', `Jadwal Takjil tidak aktif (waktu maghrib tidak tersedia)`, { hasTime: false });
                } else if (!this.todayTakjil) {
                    logger.info('scheduler', `Jadwal Takjil tidak aktif (tidak ada jadwal takjil hari ini)`, { date: dateStr });
                } else {
                    logger.info('scheduler', `Jadwal Takjil tidak aktif (dimatikan dari dashboard)`, { enabled: config.enable_takjil });
                }
            }
            logger.success('scheduler', `Sinkronisasi jadwal harian selesai`, { kota: config.kota, date: dateStr });
        } catch (error) { 
            logger.error('scheduler', `Gagal sinkronisasi jadwal harian: ${error.message}`, { error: error.message });
        }
    }

    start() {
        logger.info('scheduler', 'Memulai scheduler - menjalankan sync awal dan setup cron harian', {});
        this.syncDailySchedule();
        this.dailySyncJob = cron.schedule('5 0 * * *', () => {
            logger.info('scheduler', 'Menjalankan daily sync otomatis (00:05)', {});
            this.syncDailySchedule();
        });
        logger.success('scheduler', 'Scheduler berhasil diaktifkan', { dailySyncTime: '00:05' });
    }

    clearJobs() {
        if (this.jobImsyak) this.jobImsyak.stop();
        if (this.jobMaghrib) this.jobMaghrib.stop();
        this.jobImsyak = null;
        this.jobMaghrib = null;
    }
}

module.exports = new Scheduler();
