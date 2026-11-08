// =====================================================================
// Estilos e cores compartilhados pelas telas do aplicativo.
// =====================================================================
import { StyleSheet } from 'react-native';

export const cores = {
  fundo: '#0f172a',
  cartao: '#1e293b',
  borda: '#334155',
  texto: '#e2e8f0',
  textoFraco: '#94a3b8',
  destaque: '#38bdf8',
  BOM: '#22c55e',
  MODERADO: '#eab308',
  RUIM: '#f97316',
  MUITO_RUIM: '#ef4444',
  PESSIMO: '#a21caf',
  INDEFINIDO: '#64748b'
};

// Devolve a cor correspondente ao nivel de qualidade do ar.
export function corDoNivel(nivel) {
  return cores[nivel] || cores.INDEFINIDO;
}

export const estilos = StyleSheet.create({
  tela:        { flex: 1, backgroundColor: cores.fundo },
  conteudo:    { padding: 16, paddingBottom: 32 },
  titulo:      { color: cores.texto, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitulo:   { color: cores.textoFraco, fontSize: 13, marginBottom: 16 },
  cartao:      { backgroundColor: cores.cartao, borderRadius: 12, padding: 16, marginBottom: 12,
                 borderWidth: 1, borderColor: cores.borda },
  cartaoTitulo:{ color: cores.texto, fontSize: 16, fontWeight: '600' },
  indice:      { fontSize: 34, fontWeight: 'bold' },
  rotulo:      { color: cores.textoFraco, fontSize: 12 },
  valor:       { color: cores.texto, fontSize: 14 },
  linha:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etiqueta:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11,
                 overflow: 'hidden', color: '#0f172a', fontWeight: 'bold' },
  campo:       { backgroundColor: cores.fundo, borderColor: cores.borda, borderWidth: 1,
                 borderRadius: 8, color: cores.texto, padding: 12, marginBottom: 12 },
  botao:       { backgroundColor: cores.destaque, padding: 14, borderRadius: 8, alignItems: 'center' },
  botaoTexto:  { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  opcao:       { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, paddingHorizontal: 12,
                 paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  opcaoAtiva:  { backgroundColor: cores.destaque, borderColor: cores.destaque },
  barra:       { flexDirection: 'row', backgroundColor: cores.cartao, borderTopWidth: 1,
                 borderTopColor: cores.borda },
  aba:         { flex: 1, paddingVertical: 14, alignItems: 'center' },
  abaTexto:    { color: cores.textoFraco, fontSize: 12, fontWeight: '600' },
  abaAtiva:    { color: cores.destaque },
  aviso:       { backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 12 },
  avisoTexto:  { color: '#fee2e2', fontSize: 13 }
});
