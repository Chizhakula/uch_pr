const fs = require('node:fs');
const path = require('node:path');
const Database = require('../src/database');
const { hashPassword } = require('../src/security');
(async () => {
  const db = new Database();
  try {
    await db.query(fs.readFileSync(path.join(__dirname, '../sql/schema.sql'),'utf8'));
    await db.query(`INSERT INTO users (login,password_hash,full_name,phone,email,role)
      VALUES ($1,$2,$3,$4,$5,'admin') ON CONFLICT(login) DO NOTHING`,
      ['Conf2027', hashPassword('Demo77'), 'Администратор Портала', '8(000)000-00-00', 'admin@conferences.local']);
    console.log('База и помещения готовы. Администратор: Conf2027 / Demo77');
  } catch(e) { console.error('Ошибка инициализации:',e.message); process.exitCode = 1; }
  finally { await db.close(); }
})();
