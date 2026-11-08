-- =====================================================================
-- APS - Sistemas Distribuidos - Ciencia da Computacao - UNIP
-- Aplicativo AR LIMPO - esquema do banco de dados (PostgreSQL)
--
-- Para criar o banco, execute no pgAdmin ou no psql:
--    CREATE DATABASE ar_limpo;
-- Depois conecte-se ao banco ar_limpo e execute este arquivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabela CIDADE: pontos de monitoramento acompanhados pelo sistema.
-- ---------------------------------------------------------------------
CREATE TABLE cidade (
    id_cidade  SERIAL PRIMARY KEY,
    nome       VARCHAR(100)  NOT NULL,
    uf         CHAR(2)       NOT NULL,
    latitude   NUMERIC(9,6)  NOT NULL,
    longitude  NUMERIC(9,6)  NOT NULL
);

-- ---------------------------------------------------------------------
-- Tabela MEDICAO: leituras de qualidade do ar coletadas pelo servidor.
-- Cada medicao pertence a uma cidade (relacionamento 1:N).
-- ---------------------------------------------------------------------
CREATE TABLE medicao (
    id_medicao  SERIAL PRIMARY KEY,
    id_cidade   INTEGER NOT NULL REFERENCES cidade(id_cidade),
    data_hora   TIMESTAMP NOT NULL DEFAULT NOW(),
    pm2_5       NUMERIC(6,2),
    pm10        NUMERIC(6,2),
    no2         NUMERIC(6,2),
    o3          NUMERIC(6,2),
    indice_aqi  INTEGER,
    origem      VARCHAR(20) NOT NULL DEFAULT 'API'   -- API ou CONTINGENCIA
);

-- ---------------------------------------------------------------------
-- Tabela OCORRENCIA: registros colaborativos enviados pelos usuarios
-- (alagamento, fumaca, queimada, entre outros).
-- ---------------------------------------------------------------------
CREATE TABLE ocorrencia (
    id_ocorrencia SERIAL PRIMARY KEY,
    id_cidade     INTEGER NOT NULL REFERENCES cidade(id_cidade),
    tipo          VARCHAR(30)  NOT NULL,
    descricao     VARCHAR(300) NOT NULL,
    gravidade     VARCHAR(10)  NOT NULL DEFAULT 'MEDIA',
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    autor         VARCHAR(80)  NOT NULL DEFAULT 'Anonimo',
    data_hora     TIMESTAMP    NOT NULL DEFAULT NOW(),
    confirmacoes  INTEGER      NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- Tabela ALERTA: avisos gerados automaticamente pelo servidor quando
-- um limite de qualidade do ar e ultrapassado.
-- ---------------------------------------------------------------------
CREATE TABLE alerta (
    id_alerta  SERIAL PRIMARY KEY,
    id_cidade  INTEGER NOT NULL REFERENCES cidade(id_cidade),
    mensagem   VARCHAR(200) NOT NULL,
    nivel      VARCHAR(10)  NOT NULL,
    data_hora  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Indices para acelerar as consultas mais frequentes
CREATE INDEX idx_medicao_cidade_data ON medicao (id_cidade, data_hora DESC);
CREATE INDEX idx_ocorrencia_data     ON ocorrencia (data_hora DESC);

-- ---------------------------------------------------------------------
-- Carga inicial: pontos de monitoramento da Regiao Metropolitana de SP
-- ---------------------------------------------------------------------
INSERT INTO cidade (nome, uf, latitude, longitude) VALUES
    ('Sao Paulo - Centro',   'SP', -23.550520, -46.633308),
    ('Sao Paulo - Zona Sul', 'SP', -23.650000, -46.700000),
    ('Guarulhos',            'SP', -23.454000, -46.533000),
    ('Osasco',               'SP', -23.532500, -46.791600),
    ('Santo Andre',          'SP', -23.663900, -46.538300);
