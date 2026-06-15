const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const serverPath = path.join(root, 'server.js');
const dbPath = path.join(root, 'database', 'db.js');
const seedPath = path.join(root, 'database', 'seed.js');

function fixServer() {
  let text = fs.readFileSync(serverPath, 'utf8');

  text = text.replace(/,\s*\(req,\s*res\)\s*=>\s*\{/g, ', async (req, res) => {');

  // Remove duplicate awaits and extra parentheses in db.prepare calls
  text = text.replace(/await\s*\(\s*await\s+/g, 'await ');
  text = text.replace(/await\s*\(\s*db\.prepare/g, 'await db.prepare');
  text = text.replace(/db\.prepare\(([^)]+)\)\)\.(get|all|run)/g, 'db.prepare($1).$2');
  text = text.replace(/await db\.prepare\(([^)]+)\)\.(get|all|run)/g, 'await db.prepare($1).$2');

  fs.writeFileSync(serverPath, text, 'utf8');
  console.log('Fixed server.js');
}

function fixSeed() {
  let text = fs.readFileSync(seedPath, 'utf8');
  text = text.replace(/const insertUser = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertUser = db.prepare(`$1`);');
  text = text.replace(/const insertClient = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertClient = db.prepare(`$1`);');
  text = text.replace(/const insertBrief = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertBrief = db.prepare(`$1`);');
  text = text.replace(/const insertCall = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertCall = db.prepare(`$1`);');
  text = text.replace(/const insertMeeting = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertMeeting = db.prepare(`$1`);');
  text = text.replace(/const insertTodo = await db\.prepare\(`([\s\S]*?)`\);/g, 'const insertTodo = db.prepare(`$1`);');
  fs.writeFileSync(seedPath, text, 'utf8');
  console.log('Fixed seed.js');
}

function fixDb() {
  let text = fs.readFileSync(dbPath, 'utf8');

  // Fix Postgres run helper and add placeholder conversion
  text = text.replace(
    /run:\s*async \(\.\.\.params\) => \{[\s\S]*?return \{ rowCount: res\.rowCount, rows: res\.rows, id: res\.rows\[0\]\?\.id \};\s*\},/,
    `run: async (...params) => {
        let finalSql = sql;
        if (/^\\s*INSERT\\s+/i.test(sql) && !/RETURNING\\s+/i.test(sql)) {
          finalSql = finalSql.replace(/;?\\s*$/, ' RETURNING id');
        }
        const res = await pool.query(finalSql, params);
        return { rowCount: res.rowCount, rows: res.rows, lastInsertRowid: res.rows[0]?.id };
      },`
  );

  // Add placeholder conversion helper if missing
  if (!/const toPostgres =/.test(text)) {
    text = text.replace(
      /const schema = `([\s\S]*?)`;\s*\n\s*ready = pool\.query\(schema\)\./,
      `const schema = \
$1\n`;

  const toPostgres = (sql) => {
    let index = 0;
    return sql.replace(/\?/g, () => '$' + ++index);
  };

  ready = pool.query(schema).`
    );
  }

  // Make prepare query function convert placeholders
  if (!/const prepareQuery =/.test(text)) {
    text = text.replace(
      /ready = pool\.query\(schema\)\.catch\(\(err\) => \{ console\.error\('Postgres schema init failed:', err\); throw err; \}\);\s*\n\s*\n\s*db = \{[\s\S]*?prepare: \(sql\) => \({/,
      `ready = pool.query(schema).catch((err) => { console.error('Postgres schema init failed:', err); throw err; });

  const prepareQuery = (sql) => {
    let index = 0;
    return sql.replace(/\?/g, () => '$' + ++index);
  };

  db = {
    isPostgres: true,
    isSqlite: false,
    ready,
    prepare: (sql) => {
      const pgSql = prepareQuery(sql);
      return {
        all: async (...params) => (await pool.query(pgSql, params)).rows,
        get: async (...params) => (await pool.query(pgSql, params)).rows[0] || null,
        run: async (...params) => {
          let finalSql = pgSql;
          if (/^\\s*INSERT\\s+/i.test(sql) && !/RETURNING\\s+/i.test(sql)) {
            finalSql = finalSql.replace(/;?\\s*$/, ' RETURNING id');
          }
          const res = await pool.query(finalSql, params);
          return { rowCount: res.rowCount, rows: res.rows, lastInsertRowid: res.rows[0]?.id };
        }
      };
    },
    all: async (sql, params = []) => (await pool.query(prepareQuery(sql), params)).rows,
    get: async (sql, params = []) => {
      const res = await pool.query(prepareQuery(sql), params);
      return res.rows[0] || null;
    },
    run: async (sql, params = []) => {
      let finalSql = prepareQuery(sql);
      if (/^\\s*INSERT\\s+/i.test(sql) && !/RETURNING\\s+/i.test(sql)) {
        finalSql = finalSql.replace(/;?\\s*$/, ' RETURNING id');
      }
      const res = await pool.query(finalSql, params);
      return { rowCount: res.rowCount, rows: res.rows, lastInsertRowid: res.rows[0]?.id };
    },
    exec: async (sql) => { await pool.query(sql); }
  };
  `
    );
  }

  fs.writeFileSync(dbPath, text, 'utf8');
  console.log('Fixed db.js');
}

fixServer();
fixSeed();
fixDb();
