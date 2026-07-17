# J8 — Protótipo de aplicação web

Protótipo funcional para testar a lógica do negócio antes de qualquer investimento em produto real. Cobre: conta de cliente (login/senha), anamnese capilar, avaliação de harmonia (visagismo + colorimetria), menu completo de possibilidades do protocolo (sem gate de orçamento), orçamento fechado opcional por limite de gasto, ficha técnica de cada produto (modo de uso, ingredientes, plano de consumo), marcação de horário com profissional parceiro, e pedidos de produto (sem pagamento real).

## Como correr

Não precisa de `npm install` — usa só bibliotecas nativas do Node.js (sem dependências externas, de propósito, para evitar qualquer bloqueio de rede ao testar).

```bash
node server.js
```

Depois abrir `http://localhost:3000` no navegador. Cria uma conta (e-mail + senha, mínimo 6 caracteres) e testa o fluxo.

Requisito: Node.js 18 ou superior (`node -v` para confirmar).

## Publicar com link público (Render, grátis)

1. Criar um repositório novo no GitHub (ex: `j8-app`) e enviar todo este conteúdo para lá (arrastar os ficheiros na página "Add file → Upload files" do GitHub funciona, não precisa de linha de comandos).
2. Ir a `https://render.com/deploy?repo=<URL do seu repositório GitHub>` — o Render lê o `render.yaml` já incluído aqui e propõe a configuração sozinho (serviço Node grátis, comando de start já preenchido).
3. Confirmar e aguardar ~2–3 minutos. Fica com um link tipo `https://j8-app-xxxx.onrender.com`.

**Importante sobre o plano grátis do Render:** o armazenamento não é permanente — `data/db.json` (contas e fichas guardadas) pode ser apagado sempre que o serviço reinicia ou é atualizado. Bom para deixar amigas testarem o fluxo por uns dias; não é ainda base para guardar dados reais de clientes a longo prazo (para isso, mais à frente, vale a pena um disco persistente ou uma base de dados a sério).

## O que já está implementado e testado

- Criar conta / entrar / sair (senha protegida com hash `scrypt`, nunca guardada em texto simples)
- Anamnese capilar com linguagem clínica (queixa principal, género, geometria facial, subtom de pele, direção de cor)
- Avaliação de harmonia (visagismo + colorimetria pessoal), sempre com alternativa, nunca só um veredito
- Menu completo do protocolo — todas as fases e níveis (Essential/Clinical) selecionáveis livremente, sem limite de orçamento a filtrar as opções
- Ficha técnica por produto: descrição, modo de uso passo a passo, principais ingredientes, benefícios, contraindicações ("não usar se"), e plano de consumo (rendimento estimado até a próxima compra)
- Orçamento fechado por limite de gasto — **opcional**, só ativa se a cliente pedir, no fim do fluxo
- Ficha da cliente — histórico de avaliações guardado por conta
- Agenda com 3 profissionais fictícios, horários disponíveis, marcação e cancelamento
- Pedidos de produto (revenda) — regista como "pendente", sem gateway de pagamento real

## O que ficou de fora desta versão (de propósito)

Ao longo dos pedidos foi sendo acumulada uma lista grande de funcionalidades adicionais. Para este protótipo continuar testável (e não virar um projeto que nunca fecha), ficaram registadas aqui como próximos passos, não construídas às cegas:

- Painel administrativo (KPIs de vendas, lucro/perdas, inventário, sobras/faltas, alertas de clientes difíceis/reclamações)
- Gestão de stocks com preços, faltas e sobras
- Pontos de recolha (pickup points)
- Planos de pagamento parcelado
- Apple Pay / Google Pay / checkout com pagamento real
- Seguro (não está claro que tipo — de produto, de serviço, de responsabilidade civil — precisa de clarificação antes de desenhar)
- Motor de IA real (hoje as respostas de harmonia/protocolo são regras determinísticas, não chamadas a nenhum modelo de linguagem — ver a conversa sobre DeepSeek/Qwen/Kimi/GLM/MiniMax para essa integração)
- Top 10 conteúdos/produtos mais virais no TikTok (Coreia/Brasil) e módulo de maquiagem — pesquisa de mercado ainda por fazer
- Imagens e vídeos reais de produto (hoje há placeholders visuais claramente identificados como tal na ficha técnica)

Cada um destes é uma peça de trabalho real (a maioria envolve integração com serviço externo, ou dinheiro real a passar pelo sistema) — vale tratar como um pedido à parte, não como mais uma linha de código no mesmo ficheiro.

## Notas de segurança (protótipo, não produção)

- Sessões ficam em memória do servidor — reiniciar o processo desliga todas as sessões ativas (aceitável para teste, não para produção)
- Base de dados é um ficheiro JSON local (`data/db.json`) — sem encriptação em repouso, sem backup automático
- Sem HTTPS (roda em `http://localhost`) — nunca expor este servidor diretamente à internet sem TLS
- Sem limitação de tentativas de login (rate limiting) — adicionar antes de qualquer uso além do localhost
- Ver `J8_PROFESSIONAL_EDITION.md` (Secções 3–5 e 13) e `J8_FICHA_CLIENTE_IA.md` para os requisitos completos de LGPD/RGPD e Anvisa/INFARMED antes de tratar dados de clientes reais
