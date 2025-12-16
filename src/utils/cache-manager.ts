import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class CacheManager {
    private cacheDir: string;

    constructor(repoPath: string = process.cwd()) {
        this.cacheDir = path.join(repoPath, '.pr-agent', 'cache');
        this.ensureCacheDir();
    }

    private ensureCacheDir(): void {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Generate a unique cache key based on inputs
     */
    public generateKey(inputs: Record<string, any>): string {
        const content = JSON.stringify(inputs);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get cached data if it exists and isn't expired
     * @param key Cache key
     * @param ttlSeconds Time to live in seconds (default: 24 hours)
     */
    public get<T>(key: string, ttlSeconds: number = 86400): T | null {
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
            return JSON.parse(content) as T;
        } catch (error) {
            // Corrupt file or read error, ignore
            return null;
        }
    }

    /**
     * Save data to cache
     */
    public set(key: string, data: any): void {
        try {
            this.ensureCacheDir();
            const filePath = path.join(this.cacheDir, `${key}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.warn('Failed to write to cache:', error);
        }
    }

    /**
     * Clear all cache
     */
    public clear(): void {
        try {
            if (fs.existsSync(this.cacheDir)) {
                fs.rmSync(this.cacheDir, { recursive: true, force: true });
                this.ensureCacheDir();
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
}
