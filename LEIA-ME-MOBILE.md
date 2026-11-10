# ZapiaEngine / Painel Frota — Versão Exclusiva para Celular

Esta é a versão otimizada para dispositivos móveis do Painel Frota (ZapiaEngine v4).

## O que foi feito

1. **CSS de responsividade mobile ativado**  
   O arquivo `css/responsivo-mobile.css` (já existente no projeto original) agora é carregado em **todas as páginas**.

2. **Meta tags mobile / PWA**
   - `theme-color`
   - `apple-mobile-web-app-capable`
   - `mobile-web-app-capable`
   - `format-detection`
   - Link para `manifest.json`

3. **Manifest PWA** (`manifest.json`)  
   Permite instalar o app na tela inicial do celular (Android / iOS Safari).

## Como usar

1. Faça o deploy dos arquivos (mesmo servidor / hospedagem do projeto original).
2. Acesse pelo navegador do celular.
3. No Android: menu → "Adicionar à tela inicial".
4. No iOS Safari: Compartilhar → "Adicionar à Tela de Início".

## Observações

- O layout desktop continua funcionando; a responsividade entra automaticamente em telas ≤ 760px.
- Tabelas mantêm todas as colunas com rolagem horizontal no próprio bloco (não escondem dados).
- Touch targets e tipografia foram ajustados no CSS mobile.

## Arquivos principais alterados

- Todos os `*.html` (inclusão do CSS mobile + meta tags)
- Novo: `manifest.json`
- Novo: este `LEIA-ME-MOBILE.md`

