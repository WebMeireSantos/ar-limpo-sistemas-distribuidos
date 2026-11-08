// =====================================================================
// Coletor periodico.
//
// Roda em segundo plano dentro do servidor e, a cada intervalo definido,
// percorre as cidades cadastradas, coleta a medicao, grava no banco e,
// quando o indice ultrapassa o limite aceitavel, gera um alerta e o
// transmite imediatamente a todos os aplicativos conectados via
// WebSocket (comunicacao assincrona no modelo publicar/assinar).
// =====================================================================
const { consultar } = require('./bancoDeDados');
const { coletarMedicao, calcularIndice, classificar } = require('./servicoQualidadeAr');

const LIMITE_ALERTA = 100;   // acima disso a qualidade deixa de ser aceitavel

async function coletarCidade(cidade, io) {
  const medicao = await coletarMedicao(cidade);
  const indice = calcularIndice(medicao.pm2_5);
  const situacao = classificar(indice);

  const [gravada] = await consultar(
    `INSERT INTO medicao (id_cidade, pm2_5, pm10, no2, o3, indice_aqi, origem)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_medicao, data_hora`,
    [cidade.id_cidade, medicao.pm2_5, medicao.pm10, medicao.no2, medicao.o3, indice, medicao.origem]
  );

  // Publica a medicao para os clientes interessados naquela cidade.
  io.emit('medicao', {
    id_medicao: gravada.id_medicao,
    id_cidade: cidade.id_cidade,
    cidade: cidade.nome,
    indice_aqi: indice,
    situacao: situacao.rotulo,
    nivel: situacao.nivel,
    origem: medicao.origem,
    data_hora: gravada.data_hora
  });

  if (indice != null && indice > LIMITE_ALERTA) {
    const mensagem = `Qualidade do ar ${situacao.rotulo.toLowerCase()} em ${cidade.nome} (indice ${indice}).`;
    const [alerta] = await consultar(
      `INSERT INTO alerta (id_cidade, mensagem, nivel)
       VALUES ($1, $2, $3) RETURNING id_alerta, data_hora`,
      [cidade.id_cidade, mensagem, situacao.nivel]
    );
    io.emit('alerta', {
      id_alerta: alerta.id_alerta,
      cidade: cidade.nome,
      mensagem,
      nivel: situacao.nivel,
      data_hora: alerta.data_hora
    });
    console.log('[alerta] ' + mensagem);
  }
}

async function executarCiclo(io) {
  try {
    const cidades = await consultar('SELECT * FROM cidade ORDER BY id_cidade');
    for (const cidade of cidades) {
      try {
        await coletarCidade(cidade, io);
      } catch (erro) {
        // A falha em uma cidade nao interrompe a coleta das demais.
        console.error(`[coletor] falha em ${cidade.nome}: ${erro.message}`);
      }
    }
    console.log(`[coletor] ciclo concluido para ${cidades.length} cidades`);
  } catch (erro) {
    console.error('[coletor] erro geral: ' + erro.message);
  }
}

function iniciarColetor(io, intervaloMinutos = 15) {
  executarCiclo(io);                                   // primeira coleta imediata
  setInterval(() => executarCiclo(io), intervaloMinutos * 60 * 1000);
}

module.exports = { iniciarColetor, executarCiclo };
