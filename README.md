# Sports Vault

Biblioteca pessoal para acompanhar times, competições, jogos e resultados.

## MVP atual

- Dashboard responsivo para futebol e NBA.
- Próximos jogos e resultados recentes.
- Busca de times.
- Favoritos persistidos localmente no navegador.
- PWA instalável.
- `SportsProvider` desacoplado com `MockSportsProvider`.

## Dados

O aplicativo usa dados locais de demonstração. Nenhuma API esportiva externa foi aprovada ou integrada. Adaptadores futuros devem implementar `SportsProvider`; componentes de UI não devem chamar APIs externas diretamente.

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

## Firebase

As variáveis públicas de cliente estão documentadas em `frontend/.env.example`. A integração de autenticação e sincronização em nuvem será conectada antes de habilitar Firebase em produção.