const DB_NAME = "fitness2026";
const DB_VERSION = 1;

export const DB = {
  _db: null,

  async open() {
    if (this._db) return this._db;

    this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;

        // sessions: {id, dateISO, type, durationMin, notes, otherName, intensity}
        if (!db.objectStoreNames.contains("sessions")) {
          const s = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
          s.createIndex("by_date", "dateISO", { unique: false });
          s.createIndex("by_month", "monthKey", { unique: false }); // YYYY-MM
        }

        // exercises: {id, name, group, kind, primary, emphasis, secondary, builtIn}
        if (!db.objectStoreNames.contains("exercises")) {
          const ex = db.createObjectStore("exercises", { keyPath: "id", autoIncrement: true });
          ex.createIndex("by_group", "group", { unique: false });
          ex.createIndex("by_name", "name", { unique: false });
        }

        // sessionExercises: {id, sessionId, exerciseId, done, orderIndex}
        if (!db.objectStoreNames.contains("sessionExercises")) {
          const se = db.createObjectStore("sessionExercises", { keyPath: "id", autoIncrement: true });
          se.createIndex("by_session", "sessionId", { unique: false });
        }

        // sets: {id, sessionExerciseId, setNumber, reps, weightKg}
        if (!db.objectStoreNames.contains("sets")) {
          const st = db.createObjectStore("sets", { keyPath: "id", autoIncrement: true });
          st.createIndex("by_sessionExercise", "sessionExerciseId", { unique: false });
        }

        // cardio: {id, sessionExerciseId, minutes, km}
        if (!db.objectStoreNames.contains("cardio")) {
          const c = db.createObjectStore("cardio", { keyPath: "id", autoIncrement: true });
          c.createIndex("by_sessionExercise", "sessionExerciseId", { unique: true });
        }

        // meta: {key, value}
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this._db;
  },

  tx(storeNames, mode = "readonly") {
    const db = this._db;
    const tx = db.transaction(storeNames, mode);
    const stores = Array.isArray(storeNames)
      ? storeNames.reduce((acc, name) => (acc[name] = tx.objectStore(name), acc), {})
      : { [storeNames]: tx.objectStore(storeNames) };
    return { tx, stores };
  },

  async get(store, key) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { stores } = this.tx(store);
      const req = stores[store].get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(store, value) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { tx, stores } = this.tx(store, "readwrite");
      const req = stores[store].put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async add(store, value) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { tx, stores } = this.tx(store, "readwrite");
      const req = stores[store].add(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async del(store, key) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { tx, stores } = this.tx(store, "readwrite");
      const req = stores[store].delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async getAll(store) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { stores } = this.tx(store);
      const req = stores[store].getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllByIndex(store, indexName, queryValue) {
    await this.open();
    return await new Promise((resolve, reject) => {
      const { stores } = this.tx(store);
      const index = stores[store].index(indexName);
      const req = index.getAll(queryValue);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll() {
    await this.open();
    const stores = ["sessions", "exercises", "sessionExercises", "sets", "cardio", "meta"];
    await new Promise((resolve, reject) => {
      const { tx, stores: st } = this.tx(stores, "readwrite");
      stores.forEach(name => st[name].clear());
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async metaGet(key) {
    const row = await this.get("meta", key);
    return row?.value ?? null;
  },

  async metaSet(key, value) {
    await this.put("meta", { key, value });
  }
};

// helpers
export function monthKeyFromISO(dateISO) {
  return dateISO.slice(0, 7); // YYYY-MM
}

