# Niko-Pixel — para agentes de IA / for AI agents

O Niko-Pixel é um escritório virtual em pixel art que mostra, em tempo real, o que os agentes do Claude Code e do Codex
estão fazendo: servidor Node sem dependências de runtime (`server/`), página no navegador (`client/`) e código comum
(`shared/`). Todo texto visível passa por `tr('texto em PT')`, com as traduções em `shared/locales/` (`npm run
i18n:check`), e toda mudança visível entra em "Não lançado" no `CHANGELOG.md`. O resto está no `CONTRIBUTING.md`.
