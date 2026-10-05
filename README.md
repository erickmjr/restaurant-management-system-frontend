Frontend with NextJs for a Restaurant management system

## Como rodar

A API precisa estar de pé. Por padrão o frontend espera por ela em `http://localhost:3333`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

O app abre em `http://localhost:3000`.

A API ainda não tem CORS, então o navegador nunca fala com ela direto. Ele chama `/api/*` no próprio Next, e o Next repassa para o endereço em `API_URL`. Essa variável é lida quando o servidor sobe em `pnpm dev`, e na hora do `pnpm build` em produção.

Para entrar é preciso um restaurante e um primeiro dono, que são criados direto na API com `POST /restaurants` e `POST /restaurants/:restaurantId/operators/bootstrap`. O `restaurantId` devolvido é o "código do restaurante" que a tela de login pede na primeira vez.

## Ver as telas sem login e sem API

Com o `pnpm dev` rodando, abra `http://localhost:3000/demo`. O app entra como dono, com dados de mentira que vivem só no navegador, e nenhuma chamada vai para a API. Para ver como funcionário, abra `/demo/funcionario`. A demonstração só abre por esses dois endereços, e nada na tela avisa que os dados são de mentira.

Os dados ficam no `sessionStorage`, então duram enquanto a aba estiver aberta. "Sair" encerra a demonstração e volta para o login de verdade.

Esse modo existe só em desenvolvimento. Num build de produção as rotas `/demo` respondem 404, a não ser que o build seja feito com `NEXT_PUBLIC_DEMO=1`.

## Nome do restaurante

A moldura mostra o nome do restaurante, mas a API ainda não tem como devolvê-lo depois do cadastro. O frontend já pede `GET /restaurants/me` e espera `{ restaurantId, name }`. Enquanto essa rota não existir, a chamada volta 404 e a tela mostra "Livro de caixa" no lugar. No modo de demonstração o nome aparece.

## Filtro por tags no painel

Tag pertence a método de pagamento, então o filtro vale para entradas. Com tags marcadas, o painel conta só as entradas dos métodos que têm qualquer uma delas, e as saídas ficam de fora.

A API não filtra o relatório por tag nem quebra o dia por método. Os totais filtrados saem de `byPaymentMethod`, que já vem por método. O detalhe por dia sai de `GET /balances/:competence`, um pedido por dia com lançamento, e por isso só é buscado em períodos de até 93 dias. Acima disso o painel mostra os totais filtrados e avisa que os gráficos por dia não estão disponíveis. Se a API ganhar um filtro por tag no relatório, isso vira um pedido só. O código está em `src/lib/api/tagged.ts`.

## Stack

- Next.js com App Router e TypeScript em modo estrito
- zustand para o estado do cliente, que é a sessão, o período do painel e o uso das pastilhas
- TanStack Query para o estado do servidor, com cache e invalidação depois de lançar
- CSS Modules com variáveis, sem Tailwind e sem biblioteca de componentes
- Gráficos em SVG próprio, sem biblioteca de gráficos

## Onde fica cada coisa

- `src/app/globals.css`, tokens de cor, tipografia e forma
- `src/lib/money.ts` e `src/lib/dates.ts`, as regras de centavos e de competência
- `src/lib/api/`, cliente, tipos e chamadas da API
- `src/stores/`, as stores do zustand
- `src/lib/demo/`, a API de mentira do modo de demonstração
- `src/components/Shell.tsx`, a moldura, com o nome do restaurante, as abas do celular e a barra lateral do computador
- `src/components/DayPage.tsx`, a página do dia, e `DayPicker.tsx`, a busca de dia por calendário
- `src/components/Calendar.tsx`, o calendário do mês, com o que entrou e saiu em cada dia
- `src/components/Register.tsx` e `Keypad.tsx`, a máquina de registrar
- `src/components/Dashboard.tsx`, o painel, com os números do período e a comparação com o período anterior
- `src/components/charts/`, os gráficos do painel e a moldura comum de ponteiro, toque e teclado
- `src/components/PeriodBar.tsx`, os filtros do painel, com o período e com o que ele é comparado
- `src/components/ComparisonTable.tsx`, os dois períodos lado a lado, medida por medida
- `src/lib/analytics.ts`, as contas do painel, todas em cima do relatório de fluxo de caixa
- `src/components/Catalogs.tsx` e `NewOperator.tsx`, o apêndice do dono
