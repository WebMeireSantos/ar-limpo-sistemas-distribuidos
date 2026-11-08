// =====================================================================
// Rotas da API REST.
//
// Cada rota corresponde a um servico oferecido pelo servidor aos
// clientes moveis. A comunicacao usa HTTP com dados em JSON, no estilo
// requisicao/resposta (modelo cliente-servidor).
// =====================================================================
const express = require('express');
const { consultar, testarConexao } = require('./bancoDeDados');
const { classificar } = require('./servicoQualidadeAr');
const { executarCiclo } = require('./coletor');

function criarRotas(io) {
  const rotas = express.Router();

  // ---------------------------------------------------------------
  // GET /api/saude - verifica se servidor e banco estao no ar.
  // ---------------------------------------------------------------
  rotas.get('/saude', async (req, res) => {
    try {
      await testarConexao();
      res.json({ status: 'ok', banco: 'conectado', horario: new Date() });
    } catch (erro) {
      res.status(503).json({ status: 'falha', detalhe: erro.message });
    }
  });

  // ---------------------------------------------------------------
  // GET /api/cidades - lista os pontos de monitoramento com a ultima
  // medicao de cada um (consulta com juncao entre duas tabelas).
  // ---------------------------------------------------------------
  rotas.get('/cidades', async (req, res, next) => {
    try {
      const linhas = await consultar(`
        SELECT c.id_cidade, c.nome, c.uf, c.latitude, c.longitude,
               m.indice_aqi, m.pm2_5, m.pm10, m.no2, m.o3, m.origem, m.data_hora
          FROM cidade c
          LEFT JOIN LATERAL (
               SELECT * FROM medicao
                WHERE id_cidade = c.id_cidade
                ORDER BY data_hora DESC
                LIMIT 1
          ) m ON TRUE
         ORDER BY c.nome
      `);
      res.json(linhas.map(linha => ({ ...linha, ...classificar(linha.indice_aqi) })));
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // GET /api/cidades/:id/historico - serie das ultimas medicoes,
  // usada pelo grafico do aplicativo.
  // ---------------------------------------------------------------
  rotas.get('/cidades/:id/historico', async (req, res, next) => {
    try {
      const limite = Math.min(Number(req.query.limite) || 24, 200);
      const linhas = await consultar(
        `SELECT id_medicao, data_hora, pm2_5, pm10, indice_aqi, origem
           FROM medicao WHERE id_cidade = $1
          ORDER BY data_hora DESC LIMIT $2`,
        [req.params.id, limite]
      );
      res.json(linhas.reverse());
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // GET /api/ocorrencias - ocorrencias registradas pelos usuarios.
  // ---------------------------------------------------------------
  rotas.get('/ocorrencias', async (req, res, next) => {
    try {
      const linhas = await consultar(`
        SELECT o.id_ocorrencia, o.tipo, o.descricao, o.gravidade, o.autor,
               o.latitude, o.longitude, o.data_hora, o.confirmacoes,
               c.nome AS cidade
          FROM ocorrencia o
          INNER JOIN cidade c ON c.id_cidade = o.id_cidade
         ORDER BY o.data_hora DESC
         LIMIT 100
      `);
      res.json(linhas);
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // POST /api/ocorrencias - registra uma ocorrencia enviada pelo app
  // e avisa em tempo real todos os demais aparelhos conectados.
  // ---------------------------------------------------------------
  rotas.post('/ocorrencias', async (req, res, next) => {
    try {
      const { id_cidade, tipo, descricao, gravidade, latitude, longitude, autor } = req.body;

      // Validacao dos dados recebidos antes de gravar no banco.
      const tiposValidos = ['ALAGAMENTO', 'FUMACA', 'QUEIMADA', 'ODOR', 'DESCARTE', 'OUTRO'];
      if (!id_cidade || !tipo || !descricao) {
        return res.status(400).json({ erro: 'Informe id_cidade, tipo e descricao.' });
      }
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo invalido. Use: ' + tiposValidos.join(', ') });
      }
      if (String(descricao).trim().length < 5) {
        return res.status(400).json({ erro: 'A descricao deve ter ao menos 5 caracteres.' });
      }

      const [nova] = await consultar(
        `INSERT INTO ocorrencia (id_cidade, tipo, descricao, gravidade, latitude, longitude, autor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_ocorrencia, data_hora`,
        [id_cidade, tipo, String(descricao).trim(), gravidade || 'MEDIA',
         latitude || null, longitude || null, autor || 'Anonimo']
      );

      const [cidade] = await consultar('SELECT nome FROM cidade WHERE id_cidade = $1', [id_cidade]);
      const evento = {
        id_ocorrencia: nova.id_ocorrencia,
        cidade: cidade ? cidade.nome : '',
        tipo, descricao, gravidade: gravidade || 'MEDIA',
        autor: autor || 'Anonimo',
        data_hora: nova.data_hora
      };

      io.emit('ocorrencia', evento);           // notificacao em tempo real
      res.status(201).json(evento);
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // POST /api/ocorrencias/:id/confirmar - outro usuario confirma que
  // a ocorrencia procede (mecanismo simples de validacao coletiva).
  // ---------------------------------------------------------------
  rotas.post('/ocorrencias/:id/confirmar', async (req, res, next) => {
    try {
      const linhas = await consultar(
        `UPDATE ocorrencia SET confirmacoes = confirmacoes + 1
          WHERE id_ocorrencia = $1
          RETURNING id_ocorrencia, confirmacoes`,
        [req.params.id]
      );
      if (linhas.length === 0) return res.status(404).json({ erro: 'Ocorrencia nao encontrada.' });
      io.emit('confirmacao', linhas[0]);
      res.json(linhas[0]);
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // GET /api/alertas - alertas gerados automaticamente pelo servidor.
  // ---------------------------------------------------------------
  rotas.get('/alertas', async (req, res, next) => {
    try {
      const linhas = await consultar(`
        SELECT a.id_alerta, a.mensagem, a.nivel, a.data_hora, c.nome AS cidade
          FROM alerta a
          INNER JOIN cidade c ON c.id_cidade = a.id_cidade
         ORDER BY a.data_hora DESC LIMIT 50
      `);
      res.json(linhas);
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // GET /api/estatisticas - numeros consolidados para o painel,
  // usando funcoes de agregacao e agrupamento.
  // ---------------------------------------------------------------
  rotas.get('/estatisticas', async (req, res, next) => {
    try {
      const [resumo] = await consultar(`
        SELECT COUNT(*)::int AS total_medicoes,
               ROUND(AVG(indice_aqi))::int AS indice_medio,
               MAX(indice_aqi) AS pior_indice
          FROM medicao
         WHERE data_hora > NOW() - INTERVAL '7 days'
      `);
      const porTipo = await consultar(`
        SELECT tipo, COUNT(*)::int AS total
          FROM ocorrencia
         GROUP BY tipo
         ORDER BY total DESC
      `);
      res.json({ ...resumo, ocorrencias_por_tipo: porTipo });
    } catch (erro) { next(erro); }
  });

  // ---------------------------------------------------------------
  // POST /api/coletar - forca uma coleta imediata (util na demonstracao).
  // ---------------------------------------------------------------
  rotas.post('/coletar', async (req, res, next) => {
    try {
      await executarCiclo(io);
      res.json({ status: 'coleta executada' });
    } catch (erro) { next(erro); }
  });

  return rotas;
}

module.exports = { criarRotas };
