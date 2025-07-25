/**
 * Advanced cache manager for auth session tokens
 * Provides LRU eviction, memory pressure monitoring, and performance metrics
 */

import { log } from '../../log'

/** Cache entry with metadata for LRU eviction */
interface CacheEntry {
  token: string
  expires: number
  lastAccessed: number
  accessCount: number
}

/** Cache configuration options */
export interface CacheConfig {
  /** Maximum number of entries in cache (default: 50) */
  maxSize?: number
  /** Default cache duration in milliseconds (default: 15 minutes) */
  defaultTtlMs?: number
  /** Enable automatic cleanup on memory pressure (default: true) */
  enableMemoryPressureCleanup?: boolean
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupIntervalMs?: number
  /** Enable performance metrics collection (default: false) */
  enableMetrics?: boolean
}

/** Cache performance metrics */
export interface CacheMetrics {
  hits: number
  misses: number
  evictions: number
  cleanups: number
  totalEntries: number
  hitRate: number
}

/** Default cache configuration */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  maxSize: 50,
  defaultTtlMs: 15 * 60 * 1000, // 15 minutes
  enableMemoryPressureCleanup: true,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  enableMetrics: false
}

/**
 * Advanced token cache manager with LRU eviction and memory management
 */
export class TokenCacheManager {
  private readonly config: Required<CacheConfig>
  private readonly cache: Map<string, CacheEntry> = new Map()
  private readonly metrics: CacheMetrics
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      cleanups: 0,
      totalEntries: 0,
      hitRate: 0
    }

    // Start periodic cleanup if enabled
    if (this.config.enableMemoryPressureCleanup) {
      this.startPeriodicCleanup()
    }
  }

  /**
   * Get a token from cache if it exists and is not expired
   * @param key Cache key (typically file path)
   * @returns Token string or null if not found/expired
   */
  get(key: string): string | null {
    const entry = this.cache.get(key)
    const now = Date.now()

    if (!entry) {
      this.recordMiss()
      return null
    }

    // Check if expired
    if (entry.expires <= now) {
      this.cache.delete(key)
      this.recordMiss()
      return null
    }

    // Update access metadata for LRU
    entry.lastAccessed = now
    entry.accessCount++

    this.recordHit()
    return entry.token
  }

  /**
   * Store a token in cache with optional TTL
   * @param key Cache key (typically file path)
   * @param token Token string to cache
   * @param ttlMs Optional time-to-live in milliseconds
   */
  set(key: string, token: string, ttlMs?: number): void {
    if (!token) {
      log.warningSync('Attempted to cache empty token')
      return
    }

    const now = Date.now()
    const expires = now + (ttlMs || this.config.defaultTtlMs)

    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed()
    }

    const entry: CacheEntry = {
      token,
      expires,
      lastAccessed: now,
      accessCount: 1
    }

    this.cache.set(key, entry)
    this.updateMetrics()
  }

  /**
   * Remove a specific entry from cache
   * @param key Cache key to remove
   * @returns Whether the key was found and removed
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.updateMetrics()
    }
    return deleted
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear()
    this.resetMetrics()
  }

  /**
   * Get current cache metrics
   * @returns Cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Get cache status information
   */
  getStatus(): {
    size: number
    maxSize: number
    utilizationPercent: number
    oldestEntryAge: number
    averageAccessCount: number
  } {
    const entries = Array.from(this.cache.values())
    const now = Date.now()

    const oldestEntryAge =
      entries.length > 0
        ? Math.min(...entries.map((e) => now - e.lastAccessed))
        : 0

    const averageAccessCount =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length
        : 0

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilizationPercent: (this.cache.size / this.config.maxSize) * 100,
      oldestEntryAge,
      averageAccessCount
    }
  }

  /**
   * Manually trigger cache cleanup
   * Removes expired entries and optionally enforces size limits
   * @param forceEviction Whether to force LRU eviction even if under size limit
   * @returns Number of entries removed
   */
  cleanup(forceEviction: boolean = false): number {
    const initialSize = this.cache.size
    const now = Date.now()

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key)
      }
    }

    // Force eviction if requested or if still over size limit
    while (forceEviction || this.cache.size > this.config.maxSize) {
      if (!this.evictLeastRecentlyUsed()) {
        break // No more entries to evict
      }
    }

    const removed = initialSize - this.cache.size
    this.metrics.cleanups++
    this.updateMetrics()

    return removed
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.clear()
  }

  /**
   * Evict the least recently used entry
   * @returns Whether an entry was evicted
   */
  private evictLeastRecentlyUsed(): boolean {
    if (this.cache.size === 0) return false

    let lruKey: string | null = null
    let lruLastAccessed = Date.now()

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruLastAccessed) {
        lruLastAccessed = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
      this.metrics.evictions++
      return true
    }

    return false
  }

  /**
   * Start periodic cleanup timer
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanup()
      if (this.config.enableMetrics && removed > 0) {
        log.infoSync(`Cache cleanup removed ${removed} entries`)
      }
    }, this.config.cleanupIntervalMs)

    // Don't keep process alive for cleanup timer
    this.cleanupTimer.unref()
  }

  /**
   * Record a cache hit and update metrics
   */
  private recordHit(): void {
    if (this.config.enableMetrics) {
      this.metrics.hits++
      this.updateHitRate()
    }
  }

  /**
   * Record a cache miss and update metrics
   */
  private recordMiss(): void {
    if (this.config.enableMetrics) {
      this.metrics.misses++
      this.updateHitRate()
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    if (this.config.enableMetrics) {
      this.metrics.totalEntries = this.cache.size
      this.updateHitRate()
    }
  }

  /**
   * Calculate and update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0
  }

  /**
   * Reset all metrics to zero
   */
  private resetMetrics(): void {
    this.metrics.hits = 0
    this.metrics.misses = 0
    this.metrics.evictions = 0
    this.metrics.cleanups = 0
    this.metrics.totalEntries = 0
    this.metrics.hitRate = 0
  }
}

// Global cache instance with sensible defaults
export const globalTokenCache = new TokenCacheManager({
  maxSize: 50,
  defaultTtlMs: 15 * 60 * 1000, // 15 minutes
  enableMemoryPressureCleanup: true,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  enableMetrics: process.env.NODE_ENV === 'development'
})

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    globalTokenCache.destroy()
  })
}
