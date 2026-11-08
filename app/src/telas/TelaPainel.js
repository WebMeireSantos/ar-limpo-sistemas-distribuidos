// =====================================================================
// Tela 1 - Painel de qualidade do ar.
// Lista os pontos monitorados com o indice mais recente de cada um e
// exibe o historico da cidade selecionada em um grafico de barras.
// =====================================================================
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { estilos, cores, corDoNivel } from '../estilos';

export default function TelaPainel({ ultimaMedicao }) {
  const [cidades, setCidades] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const [lista, numeros] = await Promise.all([api.cidades(), api.estatisticas()]);
      setCidades(lista);
      setEstatisticas(numeros);
      if (lista.length > 0 && !selecionada) setSelecionada(lista[0]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [selecionada]);

  useEffect(() => { carregar(); }, []);

  // Sempre que o servidor envia uma nova medicao pelo WebSocket,
  // a tela se atualiza sozinha, sem o usuario precisar recarregar.
  useEffect(() => { if (ultimaMedicao) carregar(); }, [ultimaMedicao]);

  useEffect(() => {
    if (!selecionada) return;
    api.historico(selecionada.id_cidade).then(setHistorico).catch(() => setHistorico([]));
  }, [selecionada]);

  if (carregando) {
    return <View style={[estilos.tela, { justifyContent: 'center' }]}>
             <ActivityIndicator size="large" color={cores.destaque} />
           </View>;
  }

  const maiorIndice = Math.max(...historico.map(h => h.indice_aqi || 0), 1);

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.destaque} />}>

      <Text style={estilos.titulo}>Qualidade do ar</Text>
      <Text style={estilos.subtitulo}>Puxe a tela para baixo para atualizar</Text>

      {erro && <View style={estilos.aviso}><Text style={estilos.avisoTexto}>
        Nao foi possivel falar com o servidor: {erro}
      </Text></View>}

      {estatisticas && (
        <View style={estilos.cartao}>
          <Text style={estilos.cartaoTitulo}>Resumo dos ultimos 7 dias</Text>
          <View style={[estilos.linha, { marginTop: 10 }]}>
            <View><Text style={estilos.rotulo}>Medicoes</Text>
                  <Text style={estilos.valor}>{estatisticas.total_medicoes}</Text></View>
            <View><Text style={estilos.rotulo}>Indice medio</Text>
                  <Text style={estilos.valor}>{estatisticas.indice_medio ?? '-'}</Text></View>
            <View><Text style={estilos.rotulo}>Pior indice</Text>
                  <Text style={estilos.valor}>{estatisticas.pior_indice ?? '-'}</Text></View>
          </View>
        </View>
      )}

      {cidades.map(cidade => (
        <TouchableOpacity key={cidade.id_cidade} style={estilos.cartao}
          onPress={() => setSelecionada(cidade)}>
          <View style={estilos.linha}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.cartaoTitulo}>{cidade.nome}</Text>
              <Text style={estilos.rotulo}>
                PM2,5 {cidade.pm2_5 ?? '-'} ug/m3 | PM10 {cidade.pm10 ?? '-'} ug/m3
              </Text>
              <Text style={[estilos.rotulo, { marginTop: 4 }]}>
                {cidade.origem === 'CONTINGENCIA' ? 'Dado estimado (servico externo indisponivel)' : 'Dado do servico oficial'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[estilos.indice, { color: corDoNivel(cidade.nivel) }]}>
                {cidade.indice_aqi ?? '-'}
              </Text>
              <Text style={[estilos.etiqueta, { backgroundColor: corDoNivel(cidade.nivel) }]}>
                {cidade.rotulo}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {selecionada && historico.length > 0 && (
        <View style={estilos.cartao}>
          <Text style={estilos.cartaoTitulo}>Historico - {selecionada.nome}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, marginTop: 12 }}>
            {historico.map(ponto => (
              <View key={ponto.id_medicao} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 10, borderRadius: 3,
                  height: Math.max(4, ((ponto.indice_aqi || 0) / maiorIndice) * 100),
                  backgroundColor: cores.destaque
                }} />
              </View>
            ))}
          </View>
          <Text style={[estilos.rotulo, { marginTop: 8 }]}>
            Ultimas {historico.length} medicoes registradas
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
