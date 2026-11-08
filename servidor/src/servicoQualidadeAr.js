// =====================================================================
// Servico responsavel por obter os dados de qualidade do ar.
//
// Este modulo representa a integracao do sistema distribuido com um
// servico remoto de terceiros (Open-Meteo Air Quality API), acessado
// por HTTP. Caso o servico remoto esteja indisponivel, entra em acao o
// modo de contingencia, que estima os valores a partir da ultima
// medicao gravada no banco. Assim o sistema continua operando mesmo
// com falha parcial - propriedade conhecida como tolerancia a falhas.
// =====================================================================
const { consultar } = require('./bancoDeDados');

const URL_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const TEMPO_LIMITE_MS = 8000;

// Converte a concentracao de material particulado fino (PM2.5) em um
// indice de 0 a 500, seguindo a faixa adotada pelo padrao norte-americano.
function calcularIndice(pm25) {
  const faixas = [
    { cMin: 0.0,   cMax: 12.0,  iMin: 0,   iMax: 50 },
    { cMin: 12.1,  cMax: 35.4,  iMin: 51,  iMax: 100 },
    { cMin: 35.5,  cMax: 55.4,  iMin: 101, iMax: 150 },
    { cMin: 55.5,  cMax: 150.4, iMin: 151, iMax: 200 },
    { cMin: 150.5, cMax: 250.4, iMin: 201, iMax: 300 },
    { cMin: 250.5, cMax: 500.4, iMin: 301, iMax: 500 }
  ];
  if (pm25 == null) return null;
  const faixa = faixas.find(f => pm25 >= f.cMin && pm25 <= f.cMax) || faixas[faixas.length - 1];
  const proporcao = (pm25 - faixa.cMin) / (faixa.cMax - faixa.cMin);
  return Math.round(faixa.iMin + proporcao * (faixa.iMax - faixa.iMin));
}

// Traduz o indice numerico para uma categoria compreensivel ao usuario.
function classificar(indice) {
  if (indice == null) return { rotulo: 'Sem dados', nivel: 'INDEFINIDO' };
  if (indice <= 50)  return { rotulo: 'Boa',       nivel: 'BOM' };
  if (indice <= 100) return { rotulo: 'Moderada',  nivel: 'MODERADO' };
  if (indice <= 150) return { rotulo: 'Ruim',      nivel: 'RUIM' };
  if (indice <= 200) return { rotulo: 'Muito ruim', nivel: 'MUITO_RUIM' };
  return { rotulo: 'Pessima', nivel: 'PESSIMO' };
}

// Consulta o servico remoto para uma coordenada especifica.
async function buscarNaApiExterna(latitude, longitude) {
  const parametros = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'pm10,pm2_5,nitrogen_dioxide,ozone',
    timezone: 'America/Sao_Paulo'
  });

  // AbortController interrompe a requisicao se o servico remoto demorar
  // demais a responder, impedindo que o servidor fique bloqueado.
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`${URL_API}?${parametros}`, { signal: controlador.signal });
    if (!resposta.ok) throw new Error('Servico remoto respondeu ' + resposta.status);
    const dados = await resposta.json();
    const atual = dados.current || {};
    return {
      pm2_5: atual.pm2_5 ?? null,
      pm10: atual.pm10 ?? null,
      no2: atual.nitrogen_dioxide ?? null,
      o3: atual.ozone ?? null,
      origem: 'API'
    };
  } finally {
    clearTimeout(temporizador);
  }
}

// Modo de contingencia: reaproveita a ultima medicao conhecida da cidade,
// aplicando uma pequena variacao. Se nao houver historico, usa um valor
// tipico de area urbana.
async function gerarContingencia(idCidade) {
  const linhas = await consultar(
    'SELECT pm2_5, pm10, no2, o3 FROM medicao WHERE id_cidade = $1 ORDER BY data_hora DESC LIMIT 1',
    [idCidade]
  );
  const base = linhas[0] || { pm2_5: 18, pm10: 32, no2: 24, o3: 45 };
  const variar = valor => Math.max(0, Number(valor) * (0.9 + Math.random() * 0.2));
  return {
    pm2_5: Number(variar(base.pm2_5).toFixed(2)),
    pm10: Number(variar(base.pm10).toFixed(2)),
    no2: Number(variar(base.no2).toFixed(2)),
    o3: Number(variar(base.o3).toFixed(2)),
    origem: 'CONTINGENCIA'
  };
}

// Funcao publica do modulo: tenta o servico remoto e, em caso de falha,
// recorre a contingencia. O chamador nao precisa saber qual caminho foi
// usado - a origem fica registrada junto da medicao.
async function coletarMedicao(cidade) {
  try {
    return await buscarNaApiExterna(cidade.latitude, cidade.longitude);
  } catch (erro) {
    console.warn(`[contingencia] ${cidade.nome}: ${erro.message}`);
    return await gerarContingencia(cidade.id_cidade);
  }
}

module.exports = { coletarMedicao, calcularIndice, classificar };
