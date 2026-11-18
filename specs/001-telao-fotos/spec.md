# Feature Specification: Telão de Fotos do Chá de Casa Nova

**Feature Branch**: `001-telao-fotos`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Quando uma pessoa enviar uma foto para meu número de WhatsApp ou postar marcando meu @ do Instagram, o sistema puxa essa foto e coloca em uma TV. Passa por uma IA que verifica a foto antes de enviar para a TV. Na TV vão passando as fotos já adicionadas com motion/carrossel e algumas telas com todas as fotos, bem interativo e bonito. Ter um PDF para imprimir com QR code e passo a passo para enviar a foto. Usar o design do convite que já tenho. Vão ser dois dias, 21 e 22, então fotos separadas por dia. Uma interface web para configurar algumas coisas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convidado manda foto pelo WhatsApp e ela aparece na TV (Priority: P1)

Durante a festa, um convidado aponta a câmera para o QR code, o WhatsApp abre já na
conversa com o número da festa, ele envia uma foto (com ou sem um recadinho escrito).
A foto é verificada automaticamente e, estando adequada, aparece em destaque na TV em
poucos segundos, com o nome do convidado e o recadinho. O convidado recebe uma resposta
no próprio WhatsApp confirmando.

**Why this priority**: É o coração do sistema. Sem isso não há telão.

**Independent Test**: Enviar uma foto para o número da festa a partir de um celular
qualquer e ver a foto surgir na TV; enviar uma imagem imprópria e confirmar que ela não
aparece.

**Acceptance Scenarios**:

1. **Given** a TV ligada no telão, **When** um convidado envia uma foto adequada pelo WhatsApp, **Then** a foto aparece na TV em até 30 segundos, com o primeiro nome do convidado.
2. **Given** um convidado que envia foto com legenda, **When** a foto é aprovada, **Then** a legenda aparece como recadinho junto da foto.
3. **Given** uma foto com conteúdo impróprio, **When** a verificação a reprova, **Then** ela não aparece na TV, fica visível apenas no painel do anfitrião, e o convidado recebe uma resposta educada.
4. **Given** a verificação automática fora do ar, **When** chega uma foto, **Then** ela fica aguardando aprovação manual e não aparece na TV até o anfitrião aprovar.
5. **Given** um convidado que envia várias fotos de uma vez, **When** todas são aprovadas, **Then** todas entram no telão, uma após a outra.
6. **Given** uma mensagem que não é foto (texto, áudio, figurinha, vídeo), **When** ela chega, **Then** nada vai para a TV e o convidado recebe uma orientação curta de como participar (no máximo uma vez a cada poucos minutos, para não incomodar).

---

### User Story 2 - Telão bonito e animado, separado por dia (Priority: P1)

A TV mostra, em tela cheia e sem ninguém operar, as fotos do dia em um espetáculo
contínuo que alterna entre cenas: um carrossel em destaque (uma foto por vez, com
movimento suave, nome e recadinho) e cenas de conjunto com todas as fotos (mural em
movimento, parede de polaroides). Quando chega foto nova, ela "invade" a tela com uma
animação de boas-vindas. Um cantinho fixo mostra o QR code e o convite para participar.
Tudo com a cara do convite.

**Why this priority**: É o que os convidados veem. Uma foto que chega e aparece numa
tela feia não cumpre o objetivo.

**Independent Test**: Abrir o telão com um conjunto de fotos de exemplo e observar por
alguns minutos: as cenas se alternam, todas as fotos aparecem, o visual bate com o convite.

**Acceptance Scenarios**:

1. **Given** fotos aprovadas no dia atual, **When** a TV fica ligada, **Then** as cenas se alternam sozinhas e todas as fotos do dia são exibidas em rotação.
2. **Given** o telão no dia 22, **When** ele roda, **Then** mostra apenas as fotos do dia 22 (por padrão), e as do dia 21 continuam guardadas e podem ser exibidas se o anfitrião escolher.
3. **Given** uma foto recém-aprovada, **When** ela chega, **Then** interrompe a cena atual com um destaque de "foto nova" e depois entra na rotação normal.
4. **Given** nenhuma foto ainda, **When** a TV é ligada, **Then** aparece uma tela de boas-vindas com o monograma, o QR code grande e o passo a passo.
5. **Given** a rede caiu por alguns minutos, **When** ela volta, **Then** o telão continua do ponto em que estava e recebe as fotos que chegaram, sem precisar recarregar.
6. **Given** fotos em retrato e em paisagem, **When** são exibidas, **Then** nenhuma é cortada de forma a esconder rostos nem distorcida.

---

### User Story 3 - Painel do anfitrião (Priority: P2)

O anfitrião abre uma página protegida por senha, no celular ou notebook, e vê todas as
fotos recebidas por dia e por situação (na TV, aguardando, reprovada). Pode aprovar,
remover da TV, ajustar o comportamento do telão e ver se o WhatsApp está conectado.

**Why this priority**: O sistema funciona sem o painel, mas sem ele não há como corrigir
um erro da IA nem tirar uma foto do ar.

**Independent Test**: Entrar no painel, remover uma foto e ver ela sumir da TV; aprovar
uma foto retida e ver ela aparecer.

**Acceptance Scenarios**:

1. **Given** uma foto na TV, **When** o anfitrião a remove no painel, **Then** ela some do telão em até 5 segundos.
2. **Given** uma foto reprovada ou aguardando, **When** o anfitrião a aprova, **Then** ela entra no telão.
3. **Given** o painel aberto, **When** o anfitrião muda uma configuração (tempo por foto, dia exibido, rigor da moderação, pausar recebimento, textos de resposta), **Then** a mudança vale imediatamente, sem reiniciar nada.
4. **Given** o WhatsApp desconectado, **When** o anfitrião abre o painel, **Then** vê o aviso e consegue reconectar lendo um QR code ali mesmo.
5. **Given** alguém sem a senha, **When** tenta abrir o painel, **Then** não vê fotos nem configurações.
6. **Given** o fim de um dia de festa, **When** o anfitrião pede, **Then** baixa todas as fotos aprovadas daquele dia em um único arquivo.

---

### User Story 4 - Cartaz para imprimir com QR code (Priority: P2)

O anfitrião gera um PDF A4 com a cara do convite, contendo o QR code que abre o WhatsApp
da festa e um passo a passo em três passos, para imprimir e espalhar pelas mesas.

**Why this priority**: É como os convidados descobrem que podem participar; mas o QR
também aparece na própria TV, então a festa funciona sem o impresso.

**Independent Test**: Abrir o PDF, imprimir, ler o QR code impresso com um celular e
cair na conversa certa do WhatsApp.

**Acceptance Scenarios**:

1. **Given** o número da festa configurado, **When** o anfitrião abre o cartaz, **Then** obtém um PDF A4 pronto para imprimir, legível em preto e branco.
2. **Given** o cartaz impresso, **When** um convidado lê o QR code, **Then** o WhatsApp abre na conversa com o número da festa com uma mensagem inicial sugerida.
3. **Given** o Instagram ativado, **When** o cartaz é gerado, **Then** ele também mostra o @ a ser marcado; com o Instagram desativado, essa parte não aparece.

---

### User Story 5 - Foto pelo Instagram marcando o @ (Priority: P3)

Um convidado publica uma foto (post ou story) marcando o @ da festa. O sistema recebe
essa foto e ela segue o mesmo caminho das fotos do WhatsApp: verificação, TV, dia.

**Why this priority**: É um segundo canal de entrada. Depende de liberações da própria
plataforma que estão fora do controle do anfitrião, então o sistema precisa estar
completo sem ele.

**Independent Test**: Publicar um story marcando o @ a partir de outra conta e ver a
foto surgir no telão.

**Acceptance Scenarios**:

1. **Given** o Instagram conectado, **When** alguém marca o @ em um story com foto, **Then** a foto entra no fluxo de verificação e, aprovada, aparece na TV com o @ de quem postou.
2. **Given** o Instagram conectado, **When** alguém marca o @ na legenda de um post com foto, **Then** a foto também entra no fluxo.
3. **Given** o Instagram não conectado ou com erro, **When** o sistema roda, **Then** o WhatsApp e o telão funcionam normalmente e o painel indica que o Instagram está inativo.

---

### Edge Cases

- A mesma foto chega duas vezes (reenvio, ou entrega duplicada pelo canal): aparece uma só vez.
- Foto chega fora dos dias 21 e 22 (testes antes, atrasadas depois): antes do dia 22 conta como dia 21; a partir do dia 22, como dia 22.
- Foto enviada às 23h58 do dia 21 e processada depois da meia-noite: pertence ao dia em que foi recebida, não ao dia em que foi processada.
- Um convidado manda dezenas de fotos seguidas: todas são aceitas, mas o telão não deixa um único remetente monopolizar a sequência.
- Mensagens enviadas em grupos de WhatsApp ou pelo próprio número da festa: ignoradas.
- Centenas de fotos no mesmo dia: as cenas de conjunto continuam fluidas (mostram um recorte rotativo em vez de tudo de uma vez).
- Vídeos: fora do escopo; o convidado é orientado a mandar foto.
- Servidor reiniciado no meio da festa: nenhuma foto recebida é perdida e a TV volta sozinha.

## Requirements *(mandatory)*

### Functional Requirements

**Recebimento**

- **FR-001**: O sistema MUST receber fotos enviadas por conversa direta ao número de WhatsApp da festa.
- **FR-002**: O sistema MUST guardar, para cada foto, o canal de origem, o nome de exibição do remetente, o recadinho (legenda), o momento do recebimento e o dia do evento.
- **FR-003**: O sistema MUST ignorar mensagens de grupos, mensagens do próprio número e entregas duplicadas.
- **FR-004**: O sistema MUST responder ao convidado no mesmo canal quando a foto é recebida/aprovada e quando não pode ser exibida, com textos configuráveis.
- **FR-005**: O sistema MUST receber fotos de publicações e stories do Instagram que marquem o @ da festa, quando esse canal estiver conectado.
- **FR-006**: O anfitrião MUST poder pausar e retomar o recebimento de fotos.

**Moderação**

- **FR-007**: Toda foto MUST ser verificada automaticamente antes de poder aparecer na TV, resultando em: aprovada, reprovada (com motivo) ou aguardando revisão.
- **FR-008**: A verificação MUST reprovar nudez ou conteúdo sexual, violência, gestos ou símbolos ofensivos, e imagens que não sejam fotos da festa quando o rigor "alto" estiver ativo (prints de tela, memes, propagandas).
- **FR-009**: Quando a verificação automática falhar ou ficar em dúvida, a foto MUST ficar aguardando revisão manual — nunca aprovada por padrão.
- **FR-010**: O recadinho escrito MUST passar pela mesma verificação; recado impróprio é omitido sem reprovar a foto.
- **FR-011**: O anfitrião MUST poder aprovar ou remover qualquer foto manualmente, e a decisão manual prevalece sobre a automática.

**Telão**

- **FR-012**: O telão MUST rodar em tela cheia sem interação, alternando automaticamente entre uma cena de destaque (uma foto por vez) e pelo menos duas cenas de conjunto com muitas fotos.
- **FR-013**: O telão MUST exibir por padrão apenas as fotos do dia corrente do evento, com opção de exibir o dia 21, o dia 22 ou ambos.
- **FR-014**: Uma foto recém-aprovada MUST aparecer com destaque especial em até 30 segundos após o envio, e depois entrar na rotação.
- **FR-015**: Fotos removidas MUST sair do telão em até 5 segundos.
- **FR-016**: O telão MUST mostrar o nome de quem enviou (apenas primeiro nome ou @), o recadinho, um contador de fotos do dia e um QR code permanente para participar. Números de telefone nunca são exibidos.
- **FR-017**: O telão MUST seguir a identidade visual do convite (cores, tipografia, monograma, ramos).
- **FR-018**: O telão MUST se reconectar sozinho após queda de rede ou reinício do servidor, e continuar exibindo as fotos já carregadas enquanto estiver sem conexão.
- **FR-019**: O telão MUST exibir uma tela de boas-vindas com instruções quando não houver fotos.

**Painel e cartaz**

- **FR-020**: O painel MUST exigir senha e listar as fotos por dia e por situação, com ações de aprovar e remover.
- **FR-021**: O painel MUST permitir configurar: dia exibido, tempo por foto, rigor da moderação, pausa do recebimento, textos de resposta, número/@ exibidos, e ver o estado de conexão dos canais (reconectando o WhatsApp por QR code).
- **FR-022**: O painel MUST permitir baixar todas as fotos aprovadas de um dia em um único arquivo.
- **FR-024**: O sistema MUST oferecer uma página de envio pelo navegador como alternativa ao WhatsApp, e o anfitrião MUST poder escolher para onde o QR code aponta.
- **FR-023**: O sistema MUST gerar um cartaz A4 em PDF com QR code para o WhatsApp da festa, passo a passo e a identidade visual do convite.

### Key Entities

- **Foto**: imagem recebida; canal (WhatsApp/Instagram), remetente (nome de exibição), recadinho, momento do recebimento, dia do evento (21 ou 22), situação (aguardando, aprovada, reprovada, removida), motivo da decisão, identificador de origem (para evitar duplicatas).
- **Configuração**: preferências do anfitrião — dia exibido, tempo por foto, rigor da moderação, recebimento pausado, textos de resposta, número e @ divulgados.
- **Canal**: estado de conexão de cada entrada (WhatsApp, Instagram).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um convidado consegue ir do QR code até a foto enviada em menos de 1 minuto, sem instalar nada e sem pedir ajuda.
- **SC-002**: 95% das fotos adequadas aparecem na TV em até 30 segundos após o envio.
- **SC-003**: Nenhuma foto reprovada pela verificação aparece na TV sem aprovação manual do anfitrião.
- **SC-004**: O telão roda por 8 horas seguidas sem intervenção, travamento ou tela preta.
- **SC-005**: O anfitrião consegue tirar uma foto do ar em menos de 15 segundos a partir do celular.
- **SC-006**: O telão permanece fluido com pelo menos 500 fotos em um mesmo dia.
- **SC-007**: O cartaz impresso em A4 tem o QR code legível a 1 metro de distância.
- **SC-008**: Com o Instagram indisponível, 100% das demais funções continuam operando.

## Assumptions

- O anfitrião tem um número de WhatsApp dedicado (ou aceita usar o próprio) conectado por leitura de QR code, como no WhatsApp Web; o serviço de conexão já existe no projeto.
- O servidor roda em uma máquina do anfitrião, e a TV abre o telão por um navegador (TV smart, notebook ligado por HDMI ou similar) na mesma rede ou pela internet.
- O Instagram só entrega fotos de marcações para contas profissionais (Business/Creator) ligadas a um app aprovado pela Meta e com endereço público. Com a festa a 3 dias, esse canal pode não ficar pronto a tempo; por isso é P3 e o restante não depende dele. Stories e posts de contas privadas não são entregues pela plataforma.
- A verificação por IA depende de internet e de uma chave de serviço paga pelo anfitrião (custo estimado de centavos por foto).
- Volume esperado: até algumas centenas de fotos por dia, poucas dezenas de convidados simultâneos.
- Vídeos, enquetes, recados só de texto e ranking de convidados ficam fora desta versão (ver ideias em `ideias.md`).
- Envio por página web (sem WhatsApp) foi incluído como plano B: o QR pode apontar para ela pelo painel, caso o WhatsApp falhe.
- A instância de WhatsApp usada é a `Denilson`, já pareada; a versão atual do serviço de conexão não consegue parear aparelhos novos (ver research.md).
- As fotos ficam guardadas no servidor do anfitrião após a festa, até ele apagar.
