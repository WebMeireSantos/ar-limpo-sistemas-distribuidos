// =====================================================================
// Camada de comunicacao do aplicativo com o servidor.
//
// Concentra as chamadas HTTP e a conexao WebSocket em um unico modulo,
// de modo que as telas nao precisem conhecer detalhes de rede.
//
// IMPORTANTE: troque o endereco abaixo pelo IP do computador onde o
// servidor esta rodando. O celular e o computador precisam estar na
// mesma rede Wi-Fi. Para descobrir o IP no Windows, execute "ipconfig"
// no prompt de comando e procure por "Endereco IPv4".
// =====================================================================
import { io } from 'socket.io-client';

export const ENDERECO_SERVIDOR = 'http://192.168.0.10:3000';

const TEMPO_LIMITE_MS = 10000;

// Executa uma requisicao HTTP com tempo limite e tratamento de erro.
async function requisitar(caminho, opcoes = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(ENDERECO_SERVIDOR + caminho, {
      ...opcoes,
      signal: controlador.signal,
      headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) }
    });
    const corpo = await resposta.json();
    if (!resposta.ok) throw new Error(corpo.erro || 'Falha na comunicacao com o servidor.');
    return corpo;
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Error('O servidor demorou a responder.');
    throw erro;
  } finally {
    clearTimeout(temporizador);
  }
}

export const api = {
  saude:       ()            => requisitar('/api/saude'),
  cidades:     ()            => requisitar('/api/cidades'),
  historico:   (id)          => requisitar(`/api/cidades/${id}/historico?limite=12`),
  ocorrencias: ()            => requisitar('/api/ocorrencias'),
  alertas:     ()            => requisitar('/api/alertas'),
  estatisticas:()            => requisitar('/api/estatisticas'),
  confirmar:   (id)          => requisitar(`/api/ocorrencias/${id}/confirmar`, { method: 'POST' }),
  registrar:   (dados)       => requisitar('/api/ocorrencias', {
                                  method: 'POST', body: JSON.stringify(dados)
                                })
};

// Cria a conexao WebSocket usada para receber avisos em tempo real.
export function conectarTempoReal() {
  return io(ENDERECO_SERVIDOR, { transports: ['websocket'], reconnection: true });
}
