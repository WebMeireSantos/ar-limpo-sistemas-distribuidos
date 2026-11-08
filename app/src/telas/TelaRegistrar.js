// =====================================================================
// Tela 3 - Registro de uma nova ocorrencia ambiental.
// O usuario escolhe o local, o tipo e a gravidade, descreve o ocorrido
// e envia ao servidor. Quando o aparelho permite, a localizacao e
// obtida automaticamente pelo GPS.
// =====================================================================
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api';
import { estilos, cores } from '../estilos';

const TIPOS = ['ALAGAMENTO', 'FUMACA', 'QUEIMADA', 'ODOR', 'DESCARTE', 'OUTRO'];
const GRAVIDADES = ['BAIXA', 'MEDIA', 'ALTA'];

export default function TelaRegistrar({ aoEnviar }) {
  const [cidades, setCidades] = useState([]);
  const [idCidade, setIdCidade] = useState(null);
  const [tipo, setTipo] = useState('ALAGAMENTO');
  const [gravidade, setGravidade] = useState('MEDIA');
  const [descricao, setDescricao] = useState('');
  const [autor, setAutor] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.cidades()
      .then(lista => { setCidades(lista); if (lista[0]) setIdCidade(lista[0].id_cidade); })
      .catch(() => {});
    obterLocalizacao();
  }, []);

  // A obtencao da posicao e opcional: se o usuario negar a permissao,
  // o registro continua funcionando sem as coordenadas.
  async function obterLocalizacao() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const posicao = await Location.getCurrentPositionAsync({});
      setCoordenadas({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude });
    } catch (e) {
      // Sem GPS o aplicativo segue normalmente.
    }
  }

  async function enviar() {
    if (descricao.trim().length < 5) {
      Alert.alert('Atencao', 'Descreva a ocorrencia com pelo menos 5 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      await api.registrar({
        id_cidade: idCidade, tipo, descricao, gravidade,
        autor: autor.trim() || 'Anonimo',
        latitude: coordenadas ? coordenadas.latitude : null,
        longitude: coordenadas ? coordenadas.longitude : null
      });
      setDescricao('');
      Alert.alert('Pronto', 'Ocorrencia registrada e enviada aos demais usuarios.');
      if (aoEnviar) aoEnviar();
    } catch (e) {
      Alert.alert('Nao foi possivel registrar', e.message);
    } finally {
      setEnviando(false);
    }
  }

  function Seletor({ itens, valor, aoEscolher, rotulos }) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {itens.map((item, indice) => {
          const chave = rotulos ? item.id_cidade : item;
          const texto = rotulos ? item.nome : item;
          const ativo = chave === valor;
          return (
            <TouchableOpacity key={chave} onPress={() => aoEscolher(chave)}
              style={[estilos.opcao, ativo && estilos.opcaoAtiva]}>
              <Text style={{ color: ativo ? '#0f172a' : cores.texto, fontSize: 12, fontWeight: '600' }}>
                {texto}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.titulo}>Registrar ocorrencia</Text>
      <Text style={estilos.subtitulo}>Seu relato e enviado na hora para os outros usuarios</Text>

      <Text style={estilos.rotulo}>Local</Text>
      <Seletor itens={cidades} valor={idCidade} aoEscolher={setIdCidade} rotulos />

      <Text style={estilos.rotulo}>Tipo</Text>
      <Seletor itens={TIPOS} valor={tipo} aoEscolher={setTipo} />

      <Text style={estilos.rotulo}>Gravidade</Text>
      <Seletor itens={GRAVIDADES} valor={gravidade} aoEscolher={setGravidade} />

      <Text style={estilos.rotulo}>Descricao</Text>
      <TextInput style={[estilos.campo, { height: 90, textAlignVertical: 'top' }]}
        multiline placeholder="Descreva o que esta acontecendo e onde"
        placeholderTextColor={cores.textoFraco}
        value={descricao} onChangeText={setDescricao} />

      <Text style={estilos.rotulo}>Seu nome (opcional)</Text>
      <TextInput style={estilos.campo} placeholder="Anonimo"
        placeholderTextColor={cores.textoFraco}
        value={autor} onChangeText={setAutor} />

      <Text style={[estilos.rotulo, { marginBottom: 12 }]}>
        {coordenadas
          ? `Localizacao obtida: ${coordenadas.latitude.toFixed(4)}, ${coordenadas.longitude.toFixed(4)}`
          : 'Localizacao nao disponivel (o registro funciona mesmo assim)'}
      </Text>

      <TouchableOpacity style={[estilos.botao, enviando && { opacity: 0.6 }]}
        onPress={enviar} disabled={enviando}>
        <Text style={estilos.botaoTexto}>{enviando ? 'Enviando...' : 'Enviar ocorrencia'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
