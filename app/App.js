// =====================================================================
// AR LIMPO - aplicativo movel de monitoramento ambiental urbano
// APS - Sistemas Distribuidos - Ciencia da Computacao - UNIP
//
// Este arquivo e o ponto de entrada do aplicativo. Ele mantem a
// conexao WebSocket com o servidor (canal de notificacoes em tempo
// real) e controla a navegacao entre as tres telas do sistema.
// =====================================================================
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { conectarTempoReal } from './src/api';
import { estilos, cores } from './src/estilos';
import TelaPainel from './src/telas/TelaPainel';
import TelaOcorrencias from './src/telas/TelaOcorrencias';
import TelaRegistrar from './src/telas/TelaRegistrar';

export default function App() {
  const [aba, setAba] = useState('painel');
  const [conectado, setConectado] = useState(false);
  const [ultimaMedicao, setUltimaMedicao] = useState(null);
  const [ultimaOcorrencia, setUltimaOcorrencia] = useState(null);
  const [alerta, setAlerta] = useState(null);

  // A conexao e criada uma unica vez, quando o aplicativo abre, e
  // encerrada quando ele e fechado.
  useEffect(() => {
    const socket = conectarTempoReal();

    socket.on('connect',    () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Eventos publicados pelo servidor:
    socket.on('medicao',    dados => setUltimaMedicao(dados));
    socket.on('ocorrencia', dados => { setUltimaOcorrencia(dados);
                                       setAlerta(`Nova ocorrencia: ${dados.tipo} em ${dados.cidade}`); });
    socket.on('alerta',     dados => setAlerta(dados.mensagem));

    return () => socket.disconnect();
  }, []);

  // O aviso aparece por alguns segundos e desaparece sozinho.
  useEffect(() => {
    if (!alerta) return;
    const tempo = setTimeout(() => setAlerta(null), 6000);
    return () => clearTimeout(tempo);
  }, [alerta]);

  const abas = [
    { chave: 'painel',      titulo: 'Qualidade do ar' },
    { chave: 'ocorrencias', titulo: 'Ocorrencias' },
    { chave: 'registrar',   titulo: 'Registrar' }
  ];

  return (
    <SafeAreaView style={[estilos.tela, Platform.OS === 'android' && { paddingTop: 28 }]}>
      <StatusBar barStyle="light-content" backgroundColor={cores.fundo} />

      {/* Cabecalho com o estado da conexao em tempo real */}
      <View style={[estilos.linha, { paddingHorizontal: 16, paddingVertical: 10 }]}>
        <Text style={{ color: cores.destaque, fontSize: 18, fontWeight: 'bold' }}>AR LIMPO</Text>
        <Text style={{ color: conectado ? cores.BOM : cores.MUITO_RUIM, fontSize: 11 }}>
          {conectado ? 'conectado ao servidor' : 'sem conexao'}
        </Text>
      </View>

      {/* Faixa de aviso recebida em tempo real pelo WebSocket */}
      {alerta && (
        <View style={{ backgroundColor: cores.MODERADO, padding: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '600' }}>{alerta}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {aba === 'painel'      && <TelaPainel ultimaMedicao={ultimaMedicao} />}
        {aba === 'ocorrencias' && <TelaOcorrencias ultimaOcorrencia={ultimaOcorrencia} />}
        {aba === 'registrar'   && <TelaRegistrar aoEnviar={() => setAba('ocorrencias')} />}
      </View>

      {/* Barra inferior de navegacao entre as telas */}
      <View style={estilos.barra}>
        {abas.map(item => (
          <TouchableOpacity key={item.chave} style={estilos.aba} onPress={() => setAba(item.chave)}>
            <Text style={[estilos.abaTexto, aba === item.chave && estilos.abaAtiva]}>
              {item.titulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
