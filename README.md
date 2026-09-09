# Sports Vault

Biblioteca pessoal para acompanhar times, competições, jogos e resultados.

## MVP atual

- Dashboard responsivo para futebol e NBA.
- Próximos jogos e resultados recentes.
- Busca de times.
- Favoritos persistidos localmente e sincronizados no Firebase quando o login Google está configurado.
- PWA instalável.
- `SportsProvider` desacoplado com `MockSportsProvider`.

## Dados

O aplicativo usa a API-SPORTS por uma rota serverless Vercel em `/api/sports`. O frontend continua desacoplado por `SportsProvider`; componentes de UI não chamam APIs externas diretamente.

## Executar

```bash
cd frontend
npm install
npm run dev
```

## Validar

```bash
cd frontend
npm run lint
npm run build
```

## API esportiva

Crie uma conta em API-SPORTS e configure a chave como variável de servidor, sem prefixo `VITE_`:

```env
SPORTS_API_KEY=
```

No Vercel, configure `SPORTS_API_KEY` em Environment Variables. Localmente, use `vercel dev` na raiz do projeto para executar o frontend junto com a rota `/api/sports`.

Variáveis opcionais:

```env
SPORTS_API_FOOTBALL_SEASON=2026
SPORTS_API_NBA_SEASON=2025
```

O provider real consulta futebol em `v3.football.api-sports.io` e NBA em `v2.nba.api-sports.io`. Para voltar ao provider mock durante desenvolvimento:

```env
VITE_USE_MOCK_SPORTS=true
```

## Firebase

O app já usa Firebase Authentication com Google e Firestore para sincronizar o Vault entre dispositivos. O documento salvo é:

```text
users/{uid}/vault/favorites
```

### Configuração do projeto

1. Crie um projeto no Firebase Console.
2. Em Authentication, ative o provider Google.
3. Em Firestore Database, crie o banco em modo production.
4. Publique as regras:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

As regras em `firestore.rules` permitem que cada usuário autenticado leia e grave apenas o próprio Vault em `users/{uid}/vault/favorites`.

### Variáveis locais

Crie `frontend/.env` a partir de `frontend/.env.example` e preencha os valores do Web App criado no Firebase:

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

`frontend/.env` não deve ser versionado. Em produção, configure os mesmos valores como variáveis do ambiente de deploy.

### Teste manual

1. Rode `cd frontend && npm run dev`.
2. Abra o app, clique em `Entrar` e autentique com Google.
3. Adicione ou remova um time do Vault.
4. Abra o app em outro navegador/dispositivo com a mesma conta.
5. Confirme que o Vault sincroniza em tempo real.
6. Clique no avatar para sair e confirme que o app volta ao estado sem sessão.
