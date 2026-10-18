const { Pool, types } = require('pg');
types.setTypeParser(1114, value => value);
const env = require('./config');
class Database {
  constructor(config = env.db) { this.pool = new Pool({ ...config, max: 10 }); }
  query(text, values = []) { return this.pool.query(text, values); }
  async transaction(fn) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  close() { return this.pool.end(); }
}
module.exports = Database;
