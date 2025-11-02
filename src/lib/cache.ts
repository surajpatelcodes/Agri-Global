/**
 * Simple client-side caching utility using localStorage with TTL support
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class Cache {
  private prefix = 'csapm_cache_';

  /**
   * Set a cache item with optional TTL (in milliseconds)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item: CacheItem<T> = {
        value,
        expiry: ttl ? Date.now() + ttl : Infinity,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get a cache item
   */
  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      // Check if expired
      if (Date.now() > item.expiry) {
        this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Remove a cache item
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Check if a cache item exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const cache = new Cache();
