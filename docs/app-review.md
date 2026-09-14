# Revisão do Sports Vault

Data: 14/09/2026. Revisão do código local; não certifica os serviços publicados.

## O que está implementado

| Área | Implementação existente | Limite atual |
| --- | --- | --- |
| Login | Google via Firebase Auth, popup com fallback para redirect, observador de sessão e saída | Depende da configuração e dos domínios autorizados no Firebase; não foi autenticado nesta revisão |
| Onboarding | Busca, seleção de esportes e times, conclusão persistida | Atletas não têm favoritos independentes; indicação de etapas não corresponde a um fluxo completo de três telas |
| Início | Carrossel de partidas, placares, acesso ao resumo da partida | Filtros superiores, notificações e menu ainda não executam ações; seções editoriais e classificações são demonstrações |
| Meu Vault | Adicionar/remover times e listar favoritos | Persistência local e documento completo na nuvem; faltam isolamento local por conta e estratégia de conflitos |
| Jogos | Filtros funcionais por esporte e status, lista, data, local e detalhes | Sem atualização periódica; horários fixados em UTC |
| Buscar | Busca por time, cidade e competição, acesso à ficha do time | Sem busca global de atletas ou página própria de competição |
| Time | Ficha, favorito e acesso a atletas do elenco disponível | Abas sem ação; ranking, forma, eficiência e parte do elenco/métricas são ilustrativos |
| Atleta | Ficha, seleção de temporada, métricas, gráficos e títulos quando presentes | Compartilhar/favoritar sem ação; alguns indicadores são derivados artificialmente |
| Resumo de partida | Consulta sob demanda, estatísticas, líderes, carregamento, erro e indisponibilidade | Depende da cobertura da fonte esportiva |
| Comparação | Código de diálogo com histórico, filtros e médias | Fluxo principal não abre a seleção de comparação; histórico limitado ao lote carregado; percentual exibido não constitui modelo preditivo |
| API | Rota Vercel `/api/sports`, ESPN, normalização, cache de 10 minutos e resumo por evento | Lote de até 80 partidas, de três dias atrás a dez dias adiante; falhas por liga são descartadas sem aviso ao usuário |
| Cobertura | Configuração de 15 competições: futebol brasileiro/internacional, NBA e NFL | Atletas reais são carregados apenas para ligas de futebol compatíveis; disponibilidade não garantida por configuração |
| Firebase | SDK modular, `onSnapshot`, gravação do Vault e regras restritas ao proprietário | Publicação das regras e sincronização entre aparelhos não foram verificadas |
| PWA | Manifesto standalone, registro do service worker, cache de interface/API e convite de instalação Chromium | Cache não equivale a sincronização offline completa; instalação física e atualização do service worker pendentes de validação |

O backend existente é `api/sports.js`. Não há diretório `backend/` ou aplicação FastAPI neste checkout.

## Ajustes realizados

- Tokens globais em `frontend/src/index.css`: fundo `#0f131c`, superfície `#1c2028`, destaque lavanda `#c5d0ff`, texto, bordas e cores de estado.
- Substituição das cores e bordas divergentes no CSS das telas, preservando cores dinâmicas de times e competições.
- Cartões com raio de 12px; controles com raio de 8px; avatares e indicadores circulares preservados.
- Controles principais e botões de ícone com área mínima de 44px; campos com 16px; títulos de seção com 18px.
- Mesma largura de conteúdo mobile, até 448px, para onboarding, listas e detalhes; conteúdo desktop permanece responsivo.
- Navegação inferior única com quatro destinos reais, incluindo saída das fichas ao trocar de página. Removido o destino aparente de perfil que redirecionava ao Vault.
- Espaço para notch e gestos do sistema; diálogos acima da navegação fixa; foco visível e respeito a movimento reduzido.
- Carrossel horizontal no desktop e mobile; cards de partidas operáveis por teclado.
- Estado de erro inicial com botão de nova tentativa e carregamento anunciado por `role="status"`.
- Fonte de dados exibida de acordo com o provider configurado; modo sem Firebase chamado de “Modo local”.
- Posse de bola inventada a partir das siglas removida. Avisos identificam as seções que ainda contêm dados ilustrativos.

## Logo e instalação

O escudo lavanda/verde já existente em `frontend/public/maskable-icon.svg` foi preservado e adotado também no login, marca do feed, ícone padrão e favicon. O favicon anterior ainda era a marca do template Vite.

| Arquivo em `frontend/public/` | Uso |
| --- | --- |
| `icon.svg` e `favicon.svg` | Marca vetorial e navegador |
| `icon-192.png` | Manifesto, 192 × 192 |
| `icon-512.png` | Manifesto, 512 × 512 |
| `maskable-icon-512.png` | Android, propósito `maskable`, fundo opaco |
| `apple-touch-icon.png` | iPhone/iPad, 180 × 180 |

Os PNGs são exportações da mesma fonte vetorial. O escudo e suas barras ficam dentro da área circular segura; os círculos externos são decoração recortável. O manifesto declara os PNGs, um identificador estável e mantém as cores do tema. O HTML referencia o PNG Apple e usa `viewport-fit=cover`. Os ícones são incluídos no build/precache; navegações `/api` foram excluídas do fallback HTML do service worker.

Referências: [manifesto e ícones PWA](https://web.dev/learn/pwa/web-app-manifest), [área segura para ícones maskable](https://web.dev/articles/maskable-icon), [ícones de tela inicial Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## O que precisa ser implementado

### Prioridade 1 — dados confiáveis e persistência

1. Substituir valores ilustrativos de classificação, forma, escalação, velocidade, eficiência e liderança por dados reais; representar ausência como indisponível, sem números fictícios.
2. Separar o armazenamento local por usuário e validar o JSON local. Hoje o parse aceita qualquer estrutura e todas as contas compartilham a mesma chave.
3. Corrigir a primeira sincronização: um documento inexistente não deve apagar o cache local; migração de favoritos deve ser explícita. Resolver conflitos de edição entre dispositivos e comportamento offline.
4. Retirar gravações de dentro dos atualizadores de estado do React; esses atualizadores devem ser puros.
5. Atualizar partidas periodicamente, invalidar promises/cache vencidos e informar horário da última atualização. A promise inicial do provider fica retida durante toda a sessão, inclusive após falha.
6. Validar relações entre eventos, times e ligas antes de renderizar. Os leitores atuais usam asserções de não nulidade e podem quebrar com cobertura incompleta da API.
7. Exibir falhas parciais das ligas; adicionar timeout e controle de concorrência às consultas de elenco.

### Prioridade 2 — completar os fluxos

1. Implementar os filtros do feed e as abas da ficha do time.
2. Implementar menu, notificações, compartilhamento e favoritos de atletas; conectar as ações ao estado real.
3. Criar classificações reais e páginas de competições; conectar o histórico/comparação ao fluxo principal.
4. Substituir o feed editorial demonstrativo por conteúdo publicado; só apresentar previsões após implementar e validar o modelo.
5. Implementar rotas e histórico do navegador para links de times/atletas/partidas, recarga e botão Voltar.
6. Usar o fuso do usuário, com indicação clara, e tratar datas inválidas.
7. Completar a instalação: instruções específicas para iOS, captura antecipada do evento de instalação, tratamento de falhas e possibilidade de reabrir o convite dispensado.
8. Completar acessibilidade dos diálogos: foco inicial, contenção e devolução do foco, além do comportamento de Escape em camadas.

### Prioridade 3 — manutenção e operação

1. Dividir `App.tsx` em páginas, componentes e hooks; remover componentes e estilos sem uso após mapear consumidores.
2. Ampliar modelos específicos de futebol, NBA e NFL para não reutilizar métricas de futebol em todos os esportes.
3. Adicionar testes direcionados de normalização, persistência, sincronização e navegação.
4. Validar responsividade e PWA em produção, incluindo cache vencido, ausência de rede, atualização e troca de usuário.

## Validação desta revisão

- `npm run lint`: aprovado.
- `npm run build`: aprovado, com TypeScript, bundle e geração do service worker. A execução final exigiu o build autorizado fora do sandbox após `spawn EPERM`.
- Conferência visual do PNG 512 × 512 realizada; dimensões, opacidade e referências dos arquivos verificados no build.
- Playwright MCP retornou `Must setup test before interacting with the page`; não foram criados testes, seeds ou locators por aproximação.
- Não foi feita validação visual interativa de todas as telas, instalação física Android/iOS, execução offline do service worker, login real ou sincronização entre aparelhos. Essas verificações continuam pendentes; build e lint não comprovam esses comportamentos.
- Nenhum deploy executado e nenhuma credencial alterada.

Após publicar, conferir o app em 320px, 390px, 768px e desktop, passando por login, onboarding, Início, Meu Vault vazio/preenchido, Jogos, Buscar vazio/preenchido, time, atleta e resumo de partida. Conferir a instalação Android/iOS e abertura offline a partir de um build de produção já carregado. Instalações existentes podem manter o ícone antigo até atualização ou reinstalação.
