# Novidades

O que entrou em cada versão do Niko-Pixel. Cada versão tem a sua seção aqui, e o texto dela vira as notas da
[release no GitHub](https://github.com/LordSigfrid/niko-pixel/releases) (`npm run release`), que o Niko-Pixel abre em
**Configurações › Sobre › Ver o que mudou**.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e os números seguem o
[versionamento semântico](https://semver.org/lang/pt-BR/): correção sobe o último número (1.0.**1**), novidade sobe o
do meio (1.**1**.0).

O Niko-Pixel nasceu do [Habblaud](https://github.com/marmottajr/habblaud), de Márcio Junior (MIT). O histórico de
versões anterior a ele está no [CHANGELOG do Habblaud](https://github.com/marmottajr/habblaud/blob/main/CHANGELOG.md).

## [Não lançado]

## [1.1.0] - 2026-11-22

### Adicionado

- **Rádio arrastável.** Arraste a placa (fora dos botões) para levar a pilha de alertas para onde quiser; a posição
  fica salva para os próximos alertas, mesmo depois de reiniciar. Duplo clique volta ao topo e centro da tela.

### Alterado

- **Ferramentas de desenvolvimento atualizadas** (vite, vitest, playwright-core e a imagem do Node no Docker). Nada muda
  para quem usa.

### Corrigido

- **Testes automáticos do GitHub (CI) voltaram a passar**: rodam no Node 24, o mesmo do Docker, e esperam os textos do
  vocabulário tático.

## [1.0.0] - 2026-11-22

Primeira versão do Niko-Pixel: o quartel-general tático dos seus agentes de IA.

### Adicionado

- **Niko-Pixel: o projeto mudou de nome e de cara.** Tudo o que era “Habblaud” virou Niko-Pixel (textos, logotipo,
  variáveis `NIKO_PIXEL_*`, pasta `~/.niko-pixel`, plugins `niko-pixel-*`, Docker) e o escritório virou um
  **quartel-general tático**: pisos de areia, chapa de aço e concreto de bunker; paredes de bloco com faixa de alerta e
  de contêiner; móveis de campanha (mesas com monitor robusto, cadeiras de lona, racks de munição, sacos de areia,
  barreiras com alambrado, mesa de briefing, rancho, checkpoint); operadores de uniforme em duas equipes (azul-marinho
  e cáqui) com capacete, gorro ou balaclava; HUD preto-oliva com filetes âmbar, cantos chanfrados e ícones militares;
  emblema de escudo com mira; vocabulário tático (Zona, Operador, Equipe, Aguardando ordem, Objetivo concluído…). O
  visual clássico volta com `TACTICAL_THEME = false` (`client/src/art/theme.ts`), `TACTICAL_UNIFORMS = false`
  (`client/src/art/character/tactical.ts`) e sem o import de `ui/tactical-hud.css`. Com o tema tático, o Natal e o
  Halloween automáticos ficam desligados (a escolha fixa nas configurações continua valendo).
- **Tema do quartel-general: Guerra e Destruição (tema tático).** Nas configurações, o tema passa a ser Automático,
  Nenhum, Guerra ou Destruição (Natal e Halloween seguem no visual clássico; uma escolha antiga de Natal/Halloween vale
  como Automático). **Guerra** põe a base em alerta: caixotes de munição sob rede de camuflagem e postos de sacos de
  areia no lugar das plantas, lonas camufladas no lugar dos tapetes, arame farpado e flâmulas com insígnia inventada
  nas paredes, fita em X nas janelas, sirenes giratórias, tom vermelho de alerta e, à noite, holofotes varrendo o piso.
  **Destruição** mostra a base atingida: entulho, piso rachado, marcas de queimado, focos de fogo, fumaça subindo,
  buracos e fuligem nas paredes e vidros quebrados. No **Automático**, cada zona segue os seus operadores: Guerra quando
  alguém aguarda ordem, Destruição quando algo falha (alarme de CI, atividade com erro ou shell que falhou; a falha vence
  a espera) e a base limpa no resto; as áreas comuns ficam limpas e cada zona segura o estado por pelo menos 10 s. Com
  prefers-reduced-motion, fogo, fumaça, sirenes e holofotes ficam parados.
- **Rua de guerra (tema tático).** No lugar dos carrinhos passam tanques (torre, canhão e esteiras andando), blindados
  de rodas, caminhões com lona e jipes em verde-oliva, areia ou cinza, com faróis pequenos à noite; de vez em quando um
  helicóptero cruza o mapa por cima dos prédios, com sombra no chão, rotores girando, luz vermelha piscando e holofote
  varrendo o chão à noite. A cada 45–120 s um avião de transporte cruza o céu bem alto em 3–5 s, por cima do
  helicóptero, com sombra pálida longe no chão, rastro de condensação de dia e luzes de navegação e estrobo à noite
  (com prefers-reduced-motion o rastro fica curto e parado e nada pisca). Cada direção tem a sua faixa e os veículos
  nunca passam um por cima do outro: só entram quando cabem atrás do último da faixa e quem alcança o da frente freia
  e segue atrás dele com folga, mesmo depois de a aba ficar oculta. O asfalto ficou castigado: rachaduras, remendos, buracos, crateras com entulho e marcas de
  queimado, faixa central desbotada e falhada; sacos de areia, barreiras de concreto e ouriços tchecos nas calçadas;
  alguns postes piscam e outros foram atingidos e estão apagados.
- **Rádio: alerta no topo da tela.** Quando um operador aguarda ordem, uma placa tática aparece no topo da tela, sempre
  por cima das outras janelas e sem roubar o foco, mesmo com o navegador minimizado ou fechado. Num pedido de
  permissão, **Autorizar** e **Negar** respondem ali mesmo (o terminal continua valendo: vale o que vier primeiro);
  **Abrir** abre o Niko-Pixel; o ✕ dispensa até o próximo pedido. Vários pedidos se empilham. Só no Windows, fora do
  Docker (janela WPF pelo PowerShell que já vem no sistema); `NIKO_PIXEL_RADIO=0` desliga.
- **Instalador para Windows.** `powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1` instala,
  compila, põe o mod no Claude Code, cria o atalho de inicialização (o Niko-Pixel sobe sozinho, sem janela) e já o
  inicia; `-Desinstalar` desfaz. O `npm run mod:install` agora acha sozinho o Claude Code instalado pelo npm no
  Windows (o atalho `claude.cmd`).

- **OpenCode, Gemini CLI e Qwen Code no escritório (só leitura).** O Niko-Pixel lê as sessões que essas ferramentas
  gravam no computador (OpenCode: `~/.local/share/opencode`, o `opencode.db` ou a pasta `storage/`; Gemini CLI:
  `~/.gemini`; Qwen Code: `~/.qwen`) e mostra cada uma como um agente, com o que está fazendo, quando espera você e o
  modelo no papel do agente (ex.: “Agente principal (OpenCode · DeepSeek)”). Cada ferramenta vira uma conta própria
  (“OpenCode”, “Gemini CLI”, “Qwen Code”). Pastas: `NIKO_PIXEL_OPENCODE_DIRS`, `NIKO_PIXEL_GEMINI_DIRS` e
  `NIKO_PIXEL_QWEN_DIRS`; `NIKO_PIXEL_OPENCODE=0`, `NIKO_PIXEL_GEMINI=0` e `NIKO_PIXEL_QWEN=0` desligam; uma sessão
  ociosa fica no escritório por 30 min (`NIKO_PIXEL_RECENT_MIN`). Sem terminal, mensagens nem aprovações por elas.
  O OpenCode com banco SQLite pede o Node 22.13 ou mais novo (`node:sqlite`).

### Removido

- **Cidade online removida.** O serviço online que vinha do Habblaud (botão Mundo, conta, visitas, envio do prédio ao
  servidor dele) saiu inteiro: o Niko-Pixel funciona só no seu computador, sem nenhuma conexão externa além do aviso
  opcional de versão nova.

### Alterado

- **Uma conta só aparece como “Claude”** (letra C). Com várias contas do Claude Code, continuam Equipe A, B…

[Não lançado]: https://github.com/LordSigfrid/niko-pixel/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/LordSigfrid/niko-pixel/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/LordSigfrid/niko-pixel/releases/tag/v1.0.0
