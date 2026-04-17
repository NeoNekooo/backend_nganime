const fs = require('fs');
const path = require('path');

const VIDEOS_DIR = path.join(__dirname, 'videos');
const METADATA_FILE = path.join(__dirname, 'cache_metadata.json');
const MAX_SIZE = 7 * 1024 * 1024 * 1024; // 7GB dalam Bytes

/**
 * Inisialisasi folder dan metadata
 */
function init() {
    if (!fs.existsSync(VIDEOS_DIR)) {
        fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
    if (!fs.existsSync(METADATA_FILE)) {
        fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Ambil metadata cache
 */
function getMetadata() {
    try {
        const data = fs.readFileSync(METADATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

/**
 * Simpan metadata cache
 */
function saveMetadata(data) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Hitung total ukuran cache saat ini
 */
function getTotalSize() {
    const metadata = getMetadata();
    return metadata.reduce((acc, item) => acc + item.size, 0);
}

/**
 * Hapus file tertua jika melebihi limit (FIFO)
 * @param {number} incomingSize - Ukuran file baru yang akan masuk
 */
function ensureSpace(incomingSize) {
    let metadata = getMetadata();
    let currentTotal = getTotalSize();

    console.log(`[CACHE] Total Saat Ini: ${(currentTotal / (1024 * 1024)).toFixed(2)} MB. Limit: 7GB.`);

    while (currentTotal + incomingSize > MAX_SIZE && metadata.length > 0) {
        const oldest = metadata.shift(); // Ambil yang paling lama (index 0)
        const filePath = path.join(VIDEOS_DIR, oldest.filename);

        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            fs.unlinkSync(filePath);
            currentTotal -= stats.size;
            console.log(`[CACHE] Menghapus file lama: ${oldest.filename} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
        } else {
            console.log(`[CACHE] File tidak ditemukan di disk, hapus dari metadata: ${oldest.filename}`);
        }
    }

    saveMetadata(metadata);
}

/**
 * Daftarkan file baru ke metadata
 */
function registerCache(id, filename, size) {
    let metadata = getMetadata();
    
    // Hapus entry lama jika ID sama (update cache)
    metadata = metadata.filter(item => item.id !== id);
    
    metadata.push({
        id: id,
        filename: filename,
        size: size,
        timestamp: Date.now()
    });

    saveMetadata(metadata);
}

/**
 * Cari file di cache berdasarkan ID
 * @param {string} id 
 * @returns {string|null} Full path file jika ada
 */
function getCachePath(id) {
    const metadata = getMetadata();
    const item = metadata.find(i => i.id === id);
    if (item) {
        const fullPath = path.join(VIDEOS_DIR, item.filename);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
}

module.exports = {
    init,
    ensureSpace,
    registerCache,
    getCachePath,
    VIDEOS_DIR
};
