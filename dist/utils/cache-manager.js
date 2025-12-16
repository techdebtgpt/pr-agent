import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
export class CacheManager {
    cacheDir;
    constructor(repoPath = process.cwd()) {
        this.cacheDir = path.join(repoPath, '.pr-agent', 'cache');
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    /**
     * Generate a unique cache key based on inputs
     */
    generateKey(inputs) {
        const content = JSON.stringify(inputs);
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Get cached data if it exists and isn't expired
     * @param key Cache key
     * @param ttlSeconds Time to live in seconds (default: 24 hours)
     */
    get(key, ttlSeconds = 86400) {
        const filePath = path.join(this.cacheDir, `${key}.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const stats = fs.statSync(filePath);
            const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
            if (ageSeconds > ttlSeconds) {
                fs.unlinkSync(filePath); // Expired
                return null;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            // Corrupt file or read error, ignore
            return null;
        }
    }
    /**
     * Save data to cache
     */
    set(key, data) {
        try {
            this.ensureCacheDir();
            const filePath = path.join(this.cacheDir, `${key}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (error) {
            console.warn('Failed to write to cache:', error);
        }
    }
    /**
     * Clear all cache
     */
    clear() {
        try {
            if (fs.existsSync(this.cacheDir)) {
                fs.rmSync(this.cacheDir, { recursive: true, force: true });
                this.ensureCacheDir();
            }
        }
        catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
}
//# sourceMappingURL=cache-manager.js.map