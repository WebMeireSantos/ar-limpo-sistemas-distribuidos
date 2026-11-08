// =====================================================================
// Ponto de entrada do servidor de aplicacao.
//
// Reune tres responsabilidades do no servidor no sistema distribuido:
//   1. expor a API REST consumida pelos aplicativos moveis;
//   2. manter o canal WebSocket para notificacoes em tempo real;
//   3. executar o coletor periodico que alimenta o banco de dados.
// =====================================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { criarRotas } = require('./rotas');
const { iniciarColetor } = require('./coletor');
const { testarConexao } = require('./bancoDeDados');

const PORTA = Number(process.env.PORTA || 3000);
const INTERVALO_COLETA = Number(process.env.INTERVALO_COLETA_MIN || 15);

const aplicacao = express();
const servidorHttp = http.createServer(aplicacao);

// O WebSocket compartilha a mesma porta do servidor HTTP.
const io = new Server(servidorHttp, { cors: { origin: '*' } });

aplicacao.use(cors());                      // libera o acesso do aplicativo
aplicacao.use(express.json());              // interpreta corpo em JSON
aplicacao.use((req, res, proximo) => {      // registro simples de acesso
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  proximo();
});

aplicacao.use('/api', criarRotas(io));

// Tratamento centralizado de erros: qualquer falha nao prevista nas
// rotas chega aqui e retorna uma resposta padronizada, sem derrubar o
// servidor nem expor detalhes internos ao cliente.
aplicacao.use((erro, req, res, proximo) => {
  console.error('[erro] ' + erro.message);
  res.status(500).json({ erro: 'Falha interna no servidor.' });
});

// Conexoes WebSocket: cada aplicativo aberto vira um cliente assinante.
io.on('connection', socket => {
  console.log('[websocket] cliente conectado: ' + socket.id);
  socket.emit('bemvindo', { mensagem: 'Conectado ao servidor AR LIMPO' });
  socket.on('disconnect', () => console.log('[websocket] cliente saiu: ' + socket.id));
});

async function iniciar() {
  try {
    await testarConexao();
    console.log('[banco] conexao estabelecida');
  } catch (erro) {
    console.error('[banco] nao foi possivel conectar: ' + erro.message);
    console.error('Verifique o arquivo .env e se o PostgreSQL esta em execucao.');
    process.exit(1);
  }

  servidorHttp.listen(PORTA, () => {
    console.log(`[servidor] ouvindo na porta ${PORTA}`);
    iniciarColetor(io, INTERVALO_COLETA);
  });
}

iniciar();
