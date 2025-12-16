export declare class CacheManager {
    private cacheDir;
    constructor(repoPath?: string);
    private ensureCacheDir;
    /**
     * Generate a unique cache key based on inputs
     */
    generateKey(inputs: Record<string, any>): string;
    /**
     * Get cached data if it exists and isn't expired
     * @param key Cache key
     * @param ttlSeconds Time to live in seconds (default: 24 hours)
     */
    get<T>(key: string, ttlSeconds?: number): T | null;
    /**
     * Save data to cache
     */
    set(key: string, data: any): void;
    /**
     * Clear all cache
     */
    clear(): void;
}
