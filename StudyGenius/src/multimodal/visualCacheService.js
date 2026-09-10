/**
 * StudyGenius Academic Intelligence System
 * src/multimodal/visualCacheService.js
 * 
 * Cache persistente multi-livello a chiave composita per analisi visuali e ritagli.
 * Struttura chiave:
 *   hash(pdf) + "_p" + pageNum + "_" + hash(bbox) + "_" + schemaVersion + "_" + modelVersion + "_" + analysisType
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class VisualCacheService {
  constructor(cacheDir) {
    this.cacheDir = cacheDir || path.resolve(__dirname, '../../sessions/cache/multimodal');
    fs.ensureDirSync(this.cacheDir);
    fs.ensureDirSync(path.join(this.cacheDir, 'crops'));
    fs.ensureDirSync(path.join(this.cacheDir, 'evidence'));

    this.stats = {
      hits: 0,
      misses: 0,
      tokensSavedEstimate: 0
    };
  }

  /**
   * Genera una chiave univoca e riproducibile
   */
  generateKey({ fileHash, page, bbox = null, schemaVersion = '1.0.0', modelVersion = 'gemini-flash', analysisType = 'evidence' }) {
    const bboxStr = Array.isArray(bbox) ? bbox.map(n => Number(n).toFixed(3)).join(':') : 'full';
    const bboxHash = crypto.createHash('md5').update(bboxStr).digest('hex').slice(0, 8);
    const cleanHash = (fileHash || 'nohash').slice(0, 16);
    return `${cleanHash}_p${page}_${bboxHash}_${schemaVersion}_${modelVersion}_${analysisType}`;
  }

  has(key) {
    const filePath = path.join(this.cacheDir, 'evidence', `${key}.json`);
    return fs.existsSync(filePath);
  }

  get(key) {
    const filePath = path.join(this.cacheDir, 'evidence', `${key}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readJsonSync(filePath);
        this.stats.hits++;
        this.stats.tokensSavedEstimate += (data.estimatedTokens || 1200);
        return data;
      } catch (e) {
        console.warn(`  ⚠️ VisualCache: Errore lettura cache per chiave ${key}: ${e.message}`);
        this.stats.misses++;
        return null;
      }
    }
    this.stats.misses++;
    return null;
  }

  set(key, data) {
    const filePath = path.join(this.cacheDir, 'evidence', `${key}.json`);
    try {
      fs.writeJsonSync(filePath, {
        ...data,
        cachedAt: new Date().toISOString()
      }, { spaces: 2 });
      return true;
    } catch (e) {
      console.warn(`  ⚠️ VisualCache: Errore scrittura cache per chiave ${key}: ${e.message}`);
      return false;
    }
  }

  saveCrop(cropKey, imageBuffer) {
    const cropPath = path.join(this.cacheDir, 'crops', `${cropKey}.png`);
    try {
      fs.writeFileSync(cropPath, imageBuffer);
      return cropPath;
    } catch (e) {
      console.warn(`  ⚠️ VisualCache: Errore salvataggio ritaglio ${cropKey}: ${e.message}`);
      return null;
    }
  }

  getCropPath(cropKey) {
    const cropPath = path.join(this.cacheDir, 'crops', `${cropKey}.png`);
    return fs.existsSync(cropPath) ? cropPath : null;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total).toFixed(3) : '0.000',
      totalQueries: total
    };
  }

  clear() {
    fs.emptyDirSync(this.cacheDir);
    fs.ensureDirSync(path.join(this.cacheDir, 'crops'));
    fs.ensureDirSync(path.join(this.cacheDir, 'evidence'));
    this.stats = { hits: 0, misses: 0, tokensSavedEstimate: 0 };
  }
}

const defaultCacheInstance = new VisualCacheService();

module.exports = {
  VisualCacheService,
  defaultCacheInstance
};
