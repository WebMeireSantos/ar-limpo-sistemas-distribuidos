# AR LIMPO — APS de Sistemas Distribuídos

Aplicativo móvel com arquitetura de sistema distribuído para gerenciamento de
informações ambientais urbanas (qualidade do ar + ocorrências colaborativas).

## O que você precisa instalar

| Programa | Onde baixar |
|---|---|
| Node.js 20 ou superior | nodejs.org |
| PostgreSQL 16 + pgAdmin | postgresql.org/download |
| Expo Go (no celular) | Play Store / App Store |

---

## Passo 1 — Criar o banco de dados

1. Abra o **pgAdmin**.
2. Botão direito em **Databases** → **Create** → **Database** → nome: `ar_limpo`.
3. Clique no banco `ar_limpo` → **Tools** → **Query Tool**.
4. Abra o arquivo `servidor/banco/esquema.sql` e execute tudo (**F5**).

Devem ser criadas 4 tabelas: `cidade`, `medicao`, `ocorrencia`, `alerta`.

---

## Passo 2 — Configurar e rodar o servidor

Abra o terminal na pasta `servidor` e execute:

```bash
copy .env.example .env      # no Windows
cp .env.example .env        # no Linux/macOS
```

Abra o arquivo `.env` e coloque a **senha do seu PostgreSQL** em `PGPASSWORD`.

Depois:

```bash
npm install
npm start
```

Se aparecer `[banco] conexao estabelecida` e `[servidor] ouvindo na porta 3000`,
está funcionando. Teste no navegador: http://localhost:3000/api/cidades

---

## Passo 3 — Descobrir o IP do computador

No Windows, abra o prompt e digite `ipconfig`. Procure o **Endereço IPv4**
(algo como `192.168.0.15`).

No Linux/macOS: `ip addr` ou `ifconfig`.

---

## Passo 4 — Configurar e rodar o aplicativo

Abra o arquivo `app/src/api.js` e troque a linha:

```js
export const ENDERECO_SERVIDOR = 'http://192.168.0.10:3000';
```

pelo IP que você descobriu no passo 3.

> ⚠️ **Não use `localhost`.** Para o celular, `localhost` é o próprio celular.
> O computador e o celular precisam estar **na mesma rede Wi-Fi**.

Depois, no terminal, dentro da pasta `app`:

```bash
npm install
npx expo start
```

Vai aparecer um **QR Code**. Abra o app **Expo Go** no celular e leia o código.
O AR LIMPO abre no aparelho.

---

## Como demonstrar na apresentação

1. Deixe o servidor rodando e mostre o terminal com os logs de coleta.
2. Abra o app em **dois celulares** ao mesmo tempo.
3. Registre uma ocorrência no celular A.
4. O aviso aparece **sozinho** no celular B em poucos segundos.

Isso mostra o WebSocket funcionando — é o ponto alto da apresentação,
porque prova que os componentes estão realmente distribuídos e se comunicando.

Para forçar uma coleta na hora (sem esperar 15 minutos), acesse no navegador
ou pelo Postman: `POST http://localhost:3000/api/coletar`

---

## Se der problema

| Problema | Causa provável | Solução |
|---|---|---|
| `[banco] nao foi possivel conectar` | Senha errada no `.env` ou PostgreSQL parado | Confira a senha e se o serviço do PostgreSQL está rodando |
| App diz "sem conexao" | IP errado ou redes diferentes | Refaça o passo 3 e confirme o Wi-Fi |
| `relation "cidade" does not exist` | O `esquema.sql` não foi executado | Repita o passo 1 |
| Medições aparecem como "estimado" | Sem internet ou API fora do ar | Normal — é o modo de contingência funcionando |

---

## Estrutura do projeto

```
servidor/   → Node.js + Express + Socket.IO + PostgreSQL
app/        → React Native + Expo
```

Detalhes completos estão no documento `APS_AR_LIMPO_Sistemas_Distribuidos.docx`.
