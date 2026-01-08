class Cache {
  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, customTtlMs) {
    const ttl = typeof customTtlMs === 'number' ? customTtlMs : this.ttl;
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = { Cache };
