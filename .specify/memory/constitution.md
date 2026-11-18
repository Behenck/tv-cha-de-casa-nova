<!--
Sync Impact Report (rascunho para revisão; remover antes de commitar)
- Versão: (template) → 1.0.0 — primeira ratificação
- Princípios adicionados: I. A festa não para; II. Nada vai para a TV sem moderação;
  III. Simplicidade; IV. Fidelidade ao convite; V. Respeito aos convidados
- Seções adicionadas: Restrições Técnicas; Fluxo de Desenvolvimento; Governança
- Seções removidas: nenhuma
- TODOs pendentes: nenhum
-->

# Constituição — Telão do Chá de Casa Nova (Milene & Denilson)

## Core Principles

### I. A festa não para

O telão MUST continuar exibindo as fotos já aprovadas mesmo que qualquer serviço externo
(WhatsApp, Instagram, IA, internet) falhe. Nenhuma falha de entrada ou de moderação pode
derrubar ou congelar a tela da TV. A TV MUST se recuperar sozinha após queda de rede ou
reinício do servidor, sem ninguém precisar tocar nela.

Motivo: o sistema roda ao vivo, em dois dias de festa, sem técnico de plantão.

### II. Nada vai para a TV sem moderação

Toda foto MUST passar pela verificação de IA antes de ser exibida. Se a IA estiver
indisponível ou em dúvida, a foto MUST ficar retida para aprovação manual — nunca é
aprovada automaticamente. O anfitrião MUST poder remover qualquer foto da TV a qualquer
momento, com efeito em segundos.

Motivo: a TV fica à vista de família e crianças; um erro aqui não tem conserto.

### III. Simplicidade

É um sistema para um evento de dois dias. Um único serviço de aplicação, o mínimo de
dependências, nada de abstrações ou configurações para necessidades hipotéticas.
Recurso nativo da plataforma vence biblioteca; biblioteca já instalada vence nova.
Toda complexidade extra MUST ser justificada no plano.

### IV. Fidelidade ao convite

Toda tela e todo impresso MUST usar a identidade visual do convite: paleta creme/marrom,
tipografia EB Garamond (títulos), Jost (interface) e Pinyon Script (assinatura), monograma
M&D e ramos de folhas. Os valores vivem em um único lugar (tokens de design) e são
reutilizados por TV, painel e cartaz.

### V. Respeito aos convidados

Enviar uma foto MUST ser possível sem instalar nada e sem cadastro. Números de telefone
nunca aparecem na TV. Segredos (chaves de API, senha do painel) vivem apenas em variáveis
de ambiente, nunca no repositório. As fotos ficam somente no servidor do anfitrião.

## Restrições Técnicas

- Tudo sobe com um único `docker compose up`, junto do Evolution API já existente.
- Interface e mensagens em português do Brasil; datas no fuso `America/Sao_Paulo`.
- A tela da TV é uma página web em tela cheia, 16:9, legível a 3–4 metros.
- O evento tem dois dias (21 e 22 de novembro de 2026); toda foto pertence a um dia.

## Fluxo de Desenvolvimento

- Fluxo Spec Kit: constituição → especificação → plano → tarefas → implementação.
- Lógica não trivial (classificação de dia, decisão de moderação, parsing de webhook)
  deixa um teste executável mínimo; telas são validadas rodando o sistema de verdade.
- Cada história de usuário é entregue funcionando de ponta a ponta antes da próxima.

## Governance

Esta constituição prevalece sobre preferências de implementação. Emendas são feitas
editando este arquivo, com incremento de versão semântica (MAJOR: remoção/redefinição de
princípio; MINOR: novo princípio ou seção; PATCH: redação) e atualização da data. Todo
plano MUST conter uma verificação explícita contra estes princípios.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
