const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logPath = path.join(__dirname, '../data/logs.json');
        this.maxLogs = 500; // Keep last 500 logs
        this.ensureLogFile();
    }

    ensureLogFile() {
        if (!fs.existsSync(this.logPath)) {
            this.writeLogs([]);
        }
    }

    readLogs() {
        try {
            const data = fs.readFileSync(this.logPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[Logger] Error reading logs:', error.message);
            return [];
        }
    }

    writeLogs(logs) {
        try {
            fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('[Logger] Error writing logs:', error.message);
        }
    }

    log(type, category, message, metadata = {}) {
        const logs = this.readLogs();
        
        const logEntry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            type, // 'success', 'error', 'info', 'warning'
            category, // 'whatsapp', 'sholat_api', 'cctv', 'scheduler', 'system'
            message,
            metadata
        };

        logs.unshift(logEntry); // Add to beginning (newest first)

        // Keep only last maxLogs entries
        if (logs.length > this.maxLogs) {
            logs.splice(this.maxLogs);
        }

        this.writeLogs(logs);
        
        // Also log to console for debugging
        const emoji = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        console.log(`${emoji[type] || '•'} [${category.toUpperCase()}] ${message}`);
        
        return logEntry;
    }

    success(category, message, metadata = {}) {
        return this.log('success', category, message, metadata);
    }

    error(category, message, metadata = {}) {
        return this.log('error', category, message, metadata);
    }

    info(category, message, metadata = {}) {
        return this.log('info', category, message, metadata);
    }

    warning(category, message, metadata = {}) {
        return this.log('warning', category, message, metadata);
    }

    getLogs(limit = 100, category = null) {
        let logs = this.readLogs();
        
        if (category) {
            logs = logs.filter(log => log.category === category);
        }

        return logs.slice(0, limit);
    }

    clearLogs() {
        this.writeLogs([]);
        return { status: 'success', message: 'All logs cleared' };
    }

    getStats() {
        const logs = this.readLogs();
        const stats = {
            total: logs.length,
            byType: {},
            byCategory: {},
            lastLog: logs[0] || null
        };

        logs.forEach(log => {
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
            stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        });

        return stats;
    }
}

module.exports = new Logger();
