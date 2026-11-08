// =====================================================================
// Camada de acesso ao banco de dados PostgreSQL.
// Centraliza a conexao para que o restante do servidor nao precise
// conhecer detalhes do SGBD (principio de transparencia de acesso).
// =====================================================================
const { Pool } = require('pg');

// O pool mantem varias conexoes abertas e as reaproveita, evitando o
// custo de abrir uma conexao nova a cada requisicao recebida.
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'ar_limpo',
  max: 10
});

// Executa uma consulta parametrizada. O uso de parametros ($1, $2...)
// evita injecao de SQL, pois os valores nunca sao concatenados ao texto.
async function consultar(sql, parametros = []) {
  const resultado = await pool.query(sql, parametros);
  return resultado.rows;
}

// Verifica se o banco esta acessivel (usado no endpoint de saude).
async function testarConexao() {
  await pool.query('SELECT 1');
  return true;
}

module.exports = { consultar, testarConexao, pool };
