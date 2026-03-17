#!/usr/bin/env node
/**
 * Migration Script: Initialize Logs System
 * 
 * Script ini membuat file logs.json jika belum ada.
 * Safe untuk dijalankan multiple kali (idempotent).
 * 
 * Usage: node migrate_init_logs.js
 */

const fs = require('fs');
const path = require('path');

const logsPath = path.join(__dirname, 'data/logs.json');

console.log('🚀 Migration: Initialize Logs System\n');

// Check if logs.json already exists
if (fs.existsSync(logsPath)) {
    console.log('ℹ️  File logs.json sudah ada');
    
    try {
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        console.log(`   Current logs: ${logs.length} entries`);
    } catch (error) {
        console.log('⚠️  File logs.json corrupt, akan di-reset');
        fs.writeFileSync(logsPath, JSON.stringify([], null, 2));
        console.log('✅ File logs.json di-reset ke empty array');
    }
} else {
    console.log('📝 Membuat file logs.json baru...');
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('✅ Directory data/ dibuat');
    }
    
    // Create empty logs.json
    fs.writeFileSync(logsPath, JSON.stringify([], null, 2));
    console.log('✅ File logs.json dibuat dengan empty array');
}

console.log('\n✨ Migration selesai!\n');
console.log('📊 Log System Details:');
console.log('   File: data/logs.json');
console.log('   Max entries: 500 (auto-rotate)');
console.log('   Categories: whatsapp, sholat_api, cctv, scheduler, system');
console.log('   Types: success, error, info, warning');
console.log('\n🎉 Ready to use!');
