// =====================================================================
// Tela 2 - Ocorrencias registradas pela comunidade.
// Mostra os relatos enviados pelos usuarios e permite confirmar um
// relato, aumentando a confiabilidade da informacao coletiva.
// =====================================================================
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { api } from '../api';
import { estilos, cores } from '../estilos';

const CORES_GRAVIDADE = { BAIXA: cores.BOM, MEDIA: cores.MODERADO, ALTA: cores.MUITO_RUIM };

// Converte a data recebida do servidor para o formato brasileiro.
function formatarData(texto) {
  const data = new Date(texto);
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit',
                                        hour: '2-digit', minute: '2-digit' });
}

export default function TelaOcorrencias({ ultimaOcorrencia }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setOcorrencias(await api.ocorrencias());
    } catch (e) { setErro(e.message); }
  }, []);

  useEffect(() => { carregar(); }, []);
  useEffect(() => { if (ultimaOcorrencia) carregar(); }, [ultimaOcorrencia]);

  async function confirmar(id) {
    try {
      await api.confirmar(id);
      carregar();
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={cores.destaque} />}>

      <Text style={estilos.titulo}>Ocorrencias da comunidade</Text>
      <Text style={estilos.subtitulo}>Relatos enviados pelos usuarios do aplicativo</Text>

      {erro && <View style={estilos.aviso}><Text style={estilos.avisoTexto}>{erro}</Text></View>}

      {ocorrencias.length === 0 && !erro && (
        <View style={estilos.cartao}>
          <Text style={estilos.valor}>Nenhuma ocorrencia registrada ate o momento.</Text>
        </View>
      )}

      {ocorrencias.map(item => (
        <View key={item.id_ocorrencia} style={estilos.cartao}>
          <View style={estilos.linha}>
            <Text style={estilos.cartaoTitulo}>{item.tipo}</Text>
            <Text style={[estilos.etiqueta, { backgroundColor: CORES_GRAVIDADE[item.gravidade] || cores.INDEFINIDO }]}>
              {item.gravidade}
            </Text>
          </View>
          <Text style={[estilos.valor, { marginVertical: 6 }]}>{item.descricao}</Text>
          <Text style={estilos.rotulo}>
            {item.cidade} | {formatarData(item.data_hora)} | por {item.autor}
          </Text>
          <View style={[estilos.linha, { marginTop: 10 }]}>
            <Text style={estilos.rotulo}>{item.confirmacoes} confirmacao(oes)</Text>
            <TouchableOpacity style={[estilos.opcao, { marginRight: 0, marginBottom: 0 }]}
              onPress={() => confirmar(item.id_ocorrencia)}>
              <Text style={{ color: cores.destaque, fontSize: 12, fontWeight: '600' }}>
                Confirmo que procede
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
