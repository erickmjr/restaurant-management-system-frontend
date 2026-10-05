# API do Sistema de Gestão de Restaurante

Referência para quem vai consumir esta API no frontend.

Base URL em desenvolvimento, `http://localhost:3333`. A porta vem de `PORT` no `.env`.

Todo corpo de requisição e de resposta é JSON. O limite de corpo é 100kb.

---

## Convenções que valem para a API inteira

**Dinheiro é sempre inteiro em centavos.** O campo se chama `amountInCents`. R$ 1.250,00 é `125000`. Nunca mande decimal, o servidor recusa. Formatar para exibição é trabalho do frontend.

**Competência é a data de referência do lançamento**, no formato `AAAA-MM-DD`, escolhida pelo usuário e nunca inferida do relógio do servidor. Ela é só dia, mês e ano.

**Competência e `createdAt` são coisas diferentes.** Competência é a qual dia o lançamento pertence. `createdAt` é quando a linha nasceu no sistema. A janela de edição conta do `createdAt`, nunca da competência.

**Datas e instantes voltam como string ISO 8601 em UTC**, por exemplo `2026-03-10T12:00:00.000Z`. A exceção é `competence`, que volta como `AAAA-MM-DD`.

**O restaurante nunca vai no corpo nem na URL.** Ele sai do token. Isso é proposital, é a fronteira de isolamento entre inquilinos, e por isso não existe nenhum endpoint em que você escolhe em qual restaurante escrever. A única exceção é o bootstrap e o login, que acontecem antes de existir token.

**O dia "hoje" é calculado em UTC menos três**, o fuso de Brasília. Às 21h do dia 10 em horário local o servidor ainda entende que hoje é o dia 10, não o 11.

---

## Autenticação

O fluxo para um restaurante novo tem três passos, nesta ordem.

### 1. Criar o restaurante

```http
POST /restaurants
```

Rota pública. É o primeiro endpoint que existe, porque antes dele não há token.

```json
{ "name": "Pizzaria do Zé", "photo": null }
```

`photo` é opcional e, quando informado, precisa ser uma URL válida.

**201**

```json
{
  "restaurantId": "9f1c...",
  "name": "Pizzaria do Zé",
  "createdAt": "2026-03-10T12:00:00.000Z"
}
```

### 2. Criar o primeiro dono

```http
POST /restaurants/:restaurantId/operators/bootstrap
```

Rota pública que funciona **exatamente uma vez por restaurante**, enquanto ele não tem nenhum operador. Depois disso ela devolve 403 e operadores novos passam a ser criados por `POST /operators`, autenticado como dono.

```json
{
  "name": "Érick",
  "email": "erick@pizzaria.com",
  "password": "senha-com-8-ou-mais",
  "role": "OWNER"
}
```

**201**

```json
{
  "operatorId": "3a7b...",
  "name": "Érick",
  "email": "erick@pizzaria.com",
  "role": "OWNER",
  "createdAt": "2026-03-10T12:00:00.000Z"
}
```

O hash da senha nunca aparece em resposta nenhuma.

### 3. Entrar

```http
POST /auth/login
```

```json
{
  "restaurantId": "9f1c...",
  "email": "erick@pizzaria.com",
  "password": "senha-com-8-ou-mais"
}
```

O `restaurantId` é obrigatório aqui porque o email é único dentro do restaurante e não globalmente. Guarde o `restaurantId` no frontend depois do primeiro login, ou peça ao usuário um código do restaurante.

**200**

```json
{
  "token": "eyJhbGciOi...",
  "operator": {
    "id": "3a7b...",
    "name": "Érick",
    "email": "erick@pizzaria.com",
    "role": "OWNER",
    "restaurantId": "9f1c..."
  }
}
```

### Usando o token

Todas as rotas protegidas esperam o cabeçalho.

```http
Authorization: Bearer <token>
```

O token expira conforme `JWT_EXPIRES_IN`, que em desenvolvimento é um dia. Quando expirar, a resposta é **401** com código `INVALID_TOKEN`, e o frontend deve mandar o usuário para o login.

### Quem sou eu

```http
GET /me
```

**200**

```json
{ "operatorId": "3a7b...", "restaurantId": "9f1c...", "role": "OWNER" }
```

---

## Papéis

Existem dois papéis, `OWNER` e `EMPLOYEE`.

| O que | OWNER | EMPLOYEE |
| --- | --- | --- |
| Criar lançamento de entrada e saída | sim | sim |
| Consultar balanço e relatório | sim | sim |
| Listar catálogos | sim | sim |
| Alterar e remover lançamento próprio | sim | sim |
| Alterar e remover lançamento de outro operador | sim | **não** |
| Criar operador | sim | não |
| Criar e renomear catálogos | sim | não |

Funcionário tentando mexer em lançamento de outro operador recebe **403** com `INSUFFICIENT_ROLE`. Funcionário tentando uma rota só de dono recebe o mesmo 403.

---

## A janela de três dias

Esta é a regra que mais vai aparecer na sua interface, então vale entender antes.

O balanço de um dia nasce automaticamente no primeiro lançamento daquela competência. A partir do instante em que ele nasce, começa uma janela de **três dias** para mexer naquele balanço. Passados os três dias, o balanço trava por inteiro.

Travado significa que **nada** mais entra nem muda ali, nem lançamento novo, nem correção, nem remoção. A trava não tem exceção para o dono.

A janela conta do `createdAt` do balanço, não da competência. Um balanço retroativo de janeiro criado hoje tem três dias a partir de hoje.

Toda resposta de criação de lançamento devolve `balanceLockedAt`, e a consulta de balanço devolve `lockedAt` e `isLocked`. Use esses campos para desabilitar os botões de editar na interface em vez de deixar o usuário tentar e tomar erro.

Quando o usuário tentar mexer num balanço travado, a resposta é **422** com código `BALANCE_LOCKED`, e o `details` traz `createdAt` e `now`.

---

## Lançamentos

### Registrar entrada

```http
POST /entries
```

Entrada é total de venda por método de pagamento num dia.

```json
{
  "competence": "2026-03-10",
  "paymentMethodId": "pm-1",
  "amountInCents": 125000,
  "observation": "movimento de sábado"
}
```

`observation` é opcional. String vazia ou só espaço é normalizada para `null`, não dá erro.

**201**

```json
{
  "entryId": "e1...",
  "balanceId": "b1...",
  "competence": "2026-03-10",
  "amountInCents": 125000,
  "createdAt": "2026-03-10T12:00:00.000Z",
  "balanceLockedAt": "2026-03-13T12:00:00.000Z"
}
```

O balanço é criado se ainda não existir para aquela competência. Você não cria balanço explicitamente, e não existe endpoint para isso.

### Registrar saída

```http
POST /expenses
```

Espelho da entrada, trocando método de pagamento por categoria de saída.

```json
{
  "competence": "2026-03-10",
  "expenseCategoryId": "ec-1",
  "amountInCents": 40000,
  "observation": null
}
```

**201** devolve `expenseId` no lugar de `entryId`, o resto é igual.

### Corrigir lançamento

```http
PATCH /entries/:id
PATCH /expenses/:id
```

Mande só os campos que mudam. Pelo menos um é obrigatório.

```json
{ "amountInCents": 130000, "observation": "corrigido" }
```

Campos aceitos em `/entries`, `amountInCents`, `paymentMethodId` e `observation`.
Campos aceitos em `/expenses`, `amountInCents`, `expenseCategoryId` e `observation`.

Atenção à diferença entre omitir e mandar `null`. Omitir `observation` deixa como está. Mandar `"observation": null` limpa.

**200**

```json
{
  "entryId": "e1...",
  "balanceId": "b1...",
  "amountInCents": 130000,
  "paymentMethodId": "pm-1",
  "observation": "corrigido",
  "updatedAt": "2026-03-11T09:00:00.000Z",
  "updatedBy": "3a7b..."
}
```

### Remover lançamento

```http
DELETE /entries/:id
DELETE /expenses/:id
```

**204** sem corpo. A remoção apaga de verdade, não é cancelamento, então o lançamento desaparece do balanço e dos relatórios.

---

## Consultas

### Balanço de um dia

```http
GET /balances/:competence
```

Exemplo, `GET /balances/2026-03-10`.

**200**

```json
{
  "id": "b1...",
  "restaurantId": "9f1c...",
  "competence": "2026-03-10",
  "createdAt": "2026-03-10T12:00:00.000Z",
  "updatedAt": "2026-03-10T14:20:00.000Z",
  "updatedBy": "3a7b...",
  "lockedAt": "2026-03-13T12:00:00.000Z",
  "isLocked": false,
  "totalEntriesInCents": 125000,
  "totalExpensesInCents": 40000,
  "netInCents": 85000,
  "entries": [
    {
      "id": "e1...",
      "operatorId": "3a7b...",
      "paymentMethodId": "pm-1",
      "paymentMethodName": "Dinheiro",
      "amountInCents": 125000,
      "observation": null,
      "createdAt": "2026-03-10T12:00:00.000Z",
      "updatedAt": "2026-03-10T12:00:00.000Z",
      "updatedBy": "3a7b..."
    }
  ],
  "expenses": [
    {
      "id": "x1...",
      "operatorId": "3a7b...",
      "expenseCategoryId": "ec-1",
      "expenseCategoryName": "Fornecedor",
      "amountInCents": 40000,
      "observation": null,
      "createdAt": "2026-03-10T13:00:00.000Z",
      "updatedAt": "2026-03-10T13:00:00.000Z",
      "updatedBy": "3a7b..."
    }
  ]
}
```

`netInCents` pode ser negativo quando a saída supera a entrada. Já vem com o nome e o id do método e da categoria, então o frontend não precisa de uma segunda chamada para montar a tela.

Dia sem nenhum lançamento não tem balanço, e a resposta é **404** com `BALANCE_NOT_FOUND`. Trate isso como estado vazio, não como erro.

### Relatório de fluxo de caixa

```http
GET /reports/cash-flow?from=2026-03-01&to=2026-03-31
```

Os dois parâmetros são obrigatórios, no formato `AAAA-MM-DD`, e `from` não pode ser depois de `to`.

**200**

```json
{
  "from": "2026-03-01",
  "to": "2026-03-31",
  "totalEntriesInCents": 3400000,
  "totalExpensesInCents": 1200000,
  "netInCents": 2200000,
  "days": [
    {
      "id": "b1...",
      "competence": "2026-03-10",
      "totalEntriesInCents": 125000,
      "totalExpensesInCents": 40000,
      "netInCents": 85000
    }
  ],
  "byPaymentMethod": [
    { "id": "pm-1", "name": "Dinheiro", "totalInCents": 1800000 }
  ],
  "byExpenseCategory": [
    { "id": "ec-1", "name": "Fornecedor", "totalInCents": 900000 }
  ]
}
```

`days` vem ordenado por competência crescente. `byPaymentMethod` e `byExpenseCategory` vêm ordenados por total decrescente, então o primeiro item já é o maior. Dias sem lançamento não aparecem em `days`, então se você precisa de série temporal contínua, preencha os buracos no frontend.

O relatório recalcula sempre, não existe cache nem tabela de agregação, e por isso ele reflete correções na hora.

---

## Catálogos

Três catálogos, com o mesmo formato. Método de pagamento, categoria de saída e tag de pagamento. Todos escopados pelo restaurante do token.

| Rota | Método | Papel |
| --- | --- | --- |
| `/payment-methods` | GET | qualquer |
| `/payment-methods` | POST | OWNER |
| `/payment-methods/:id` | PATCH | OWNER |
| `/payment-methods/:id/tags` | POST | OWNER |
| `/payment-methods/:id/tags/:tagId` | DELETE | OWNER |
| `/expense-categories` | GET | qualquer |
| `/expense-categories` | POST | OWNER |
| `/expense-categories/:id` | PATCH | OWNER |
| `/payment-tags` | GET | qualquer |
| `/payment-tags` | POST | OWNER |
| `/payment-tags/:id` | PATCH | OWNER |

Criar e renomear usam o mesmo corpo.

```json
{ "name": "Cartão de Crédito" }
```

**201** no POST e **200** no PATCH.

```json
{
  "id": "pm-2",
  "name": "Cartão de Crédito",
  "createdAt": "2026-03-10T12:00:00.000Z",
  "updatedAt": "2026-03-10T12:00:00.000Z",
  "tagIds": []
}
```

O campo `tagIds` só existe em método de pagamento. Categoria de saída e tag não têm.

Nome repetido dentro do mesmo restaurante é **409** com `CATALOG_NAME_IN_USE`, e a comparação ignora maiúsculas, então "Dinheiro" colide com "dinheiro".

Anexar tag espera `{ "paymentTagId": "pt-1" }` e devolve o método inteiro com `tagIds` atualizado. Anexar duas vezes a mesma tag não dá erro, é idempotente.

**Renomear um catálogo reescreve o nome no histórico.** O lançamento guarda só o id, e o nome é resolvido na consulta, então renomear "Cartão" para "Cartão de Crédito" muda o nome em todos os relatórios antigos também.

---

## Operadores

```http
POST /operators
```

Autenticado e só para dono. Cria operador no restaurante do token, então não existe como um dono criar operador em restaurante que não é o dele.

Mesmo corpo e mesma resposta do bootstrap.

---

## Modelo de erro

Toda resposta de erro tem o mesmo envelope.

```json
{
  "error": {
    "code": "BALANCE_LOCKED",
    "message": "A janela de três dias deste balanço já fechou.",
    "details": {
      "balanceId": "b1...",
      "createdAt": "2026-03-10T12:00:00.000Z",
      "now": "2026-03-14T12:00:00.000Z"
    }
  }
}
```

`code` é estável e é o que o frontend deve usar para decidir comportamento. `message` é em português e serve para exibir. `details` varia por erro e pode vir vazio.

Erro de validação de schema é o único com formato diferente dentro de `details`.

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Requisição inválida.",
    "details": {
      "issues": [
        { "path": "amountInCents", "message": "Valor deve ser inteiro em centavos." }
      ]
    }
  }
}
```

### Significado dos status

| Status | Significa |
| --- | --- |
| 400 | O pedido está malformado ou um valor é inválido em forma |
| 401 | Falta token, token inválido ou credencial errada |
| 403 | Autenticado, mas o papel não permite |
| 404 | Não existe, ou existe e é de outro restaurante |
| 409 | Conflito com algo que já existe |
| 422 | O pedido era válido em forma, e uma regra de negócio recusou |
| 500 | Bug no servidor. A mensagem é genérica de propósito |

A diferença entre 400 e 422 vale internalizar. 400 é "isso não é um pedido válido". 422 é "entendi o pedido e a regra do negócio disse não". Um 422 geralmente merece uma mensagem de negócio na tela, um 400 geralmente é erro de formulário.

**404 não distingue inexistente de pertence a outro restaurante.** Isso é intencional, para a API não virar oráculo de dados alheios. Se você pedir um método de pagamento de outro restaurante, a resposta é a mesma de um id inventado.

### Catálogo de códigos

| Código | Status | Quando |
| --- | --- | --- |
| `INVALID_REQUEST` | 400 | Schema do corpo, da query ou do parâmetro não passou |
| `ROUTE_NOT_FOUND` | 404 | Método e caminho não existem |
| `INTERNAL_ERROR` | 500 | Erro não tratado |
| `MISSING_TOKEN` | 401 | Sem cabeçalho `Authorization` ou sem `Bearer` |
| `INVALID_TOKEN` | 401 | Token malformado, expirado ou com assinatura errada |
| `INVALID_CREDENTIALS` | 401 | Login falhou. Email inexistente e senha errada respondem igual |
| `INSUFFICIENT_ROLE` | 403 | Papel não permite a operação |
| `RESTAURANT_ALREADY_BOOTSTRAPPED` | 403 | O restaurante já tem operador, use `POST /operators` |
| `RESTAURANT_NOT_FOUND` | 404 | Restaurante do bootstrap não existe |
| `BALANCE_NOT_FOUND` | 404 | Não há balanço para aquela competência |
| `ENTRY_NOT_FOUND` | 404 | Entrada não existe ou é de outro restaurante |
| `EXPENSE_NOT_FOUND` | 404 | Saída não existe ou é de outro restaurante |
| `OPERATOR_NOT_FOUND` | 404 | Operador do token não existe mais |
| `PAYMENT_METHOD_NOT_FOUND` | 404 | Método não existe ou é de outro restaurante |
| `EXPENSE_CATEGORY_NOT_FOUND` | 404 | Categoria não existe ou é de outro restaurante |
| `PAYMENT_TAG_NOT_FOUND` | 404 | Tag não existe ou é de outro restaurante |
| `OPERATOR_EMAIL_IN_USE` | 409 | Email já cadastrado neste restaurante |
| `CATALOG_NAME_IN_USE` | 409 | Nome de catálogo já usado neste restaurante |
| `BALANCE_LOCKED` | 422 | A janela de três dias fechou |
| `COMPETENCE_IN_FUTURE` | 422 | Competência depois de hoje |
| `ENTRY_AMOUNT_ZERO` | 422 | Entrada de venda com valor zero |
| `EXPENSE_AMOUNT_ZERO` | 422 | Saída com valor zero |
| `COMPETENCE_INVALID` | 400 | Data que casa com o formato e não existe, tipo `2026-02-31` |
| `RESTAURANT_NAME_EMPTY` | 400 | Nome só com espaços |
| `OPERATOR_NAME_EMPTY` | 400 | Nome só com espaços |
| `CATALOG_NAME_EMPTY` | 400 | Nome só com espaços |

### Detalhes que vão te poupar tempo

**Valor negativo e valor decimal voltam 400 `INVALID_REQUEST`, não 422.** O schema da borda barra antes de a regra de negócio ver. Valor **zero** passa o schema e é recusado pela regra, então esse sim volta 422.

**Nome só com espaços passa o schema e é recusado pela regra.** `""` volta `INVALID_REQUEST`, mas `"   "` volta `RESTAURANT_NAME_EMPTY` ou o equivalente do catálogo. Apare no frontend para o usuário nunca ver essa diferença.

**`2026-02-31` passa o schema e é recusado pela Competence**, com `COMPETENCE_INVALID` e status 400. Use um seletor de data no frontend e isso nunca acontece.

Os códigos `MONEY_NEGATIVE`, `MONEY_NOT_INTEGER`, `EMAIL_INVALID`, `PASSWORD_WEAK`, `ROLE_INVALID`, `BALANCE_ALREADY_EXISTS`, `OBSERVATION_EMPTY`, `RESTAURANT_ALREADY_DELETED` e `RESTAURANT_NOT_DELETED` existem no domínio mas não são alcançáveis por HTTP hoje, porque o schema da borda barra antes ou porque não há rota que chegue neles. Não construa tratamento para eles.

---

## Resumo de todas as rotas

| Método | Rota | Autenticação |
| --- | --- | --- |
| GET | `/health` | pública |
| POST | `/restaurants` | pública |
| POST | `/restaurants/:restaurantId/operators/bootstrap` | pública, uma vez |
| POST | `/auth/login` | pública |
| GET | `/me` | token |
| POST | `/operators` | token, OWNER |
| POST | `/entries` | token |
| PATCH | `/entries/:id` | token |
| DELETE | `/entries/:id` | token |
| POST | `/expenses` | token |
| PATCH | `/expenses/:id` | token |
| DELETE | `/expenses/:id` | token |
| GET | `/balances/:competence` | token |
| GET | `/reports/cash-flow` | token |
| GET | `/payment-methods` | token |
| POST | `/payment-methods` | token, OWNER |
| PATCH | `/payment-methods/:id` | token, OWNER |
| POST | `/payment-methods/:id/tags` | token, OWNER |
| DELETE | `/payment-methods/:id/tags/:tagId` | token, OWNER |
| GET | `/expense-categories` | token |
| POST | `/expense-categories` | token, OWNER |
| PATCH | `/expense-categories/:id` | token, OWNER |
| GET | `/payment-tags` | token |
| POST | `/payment-tags` | token, OWNER |
| PATCH | `/payment-tags/:id` | token, OWNER |

---

## Para subir a API localmente

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` precisa de um Postgres de pé com a URL que está em `DATABASE_URL`.

---

## O que ainda não existe

Antes de desenhar telas em cima disso, saiba o que falta.

- Não há CORS configurado, então um frontend em outra porta vai ser bloqueado pelo navegador até isso entrar
- Não há paginação em nenhuma listagem
- Não há endpoint para listar operadores, nem para editar ou desativar operador
- Não há endpoint para editar ou apagar restaurante
- Não há como apagar item de catálogo, só criar e renomear
- Não há endpoint de troca de senha nem de recuperação
- Não há refresh token, o token expira e o usuário entra de novo
- Não há fechamento de período, que é diferente de relatório. Relatório recalcula, fechamento congelaria
