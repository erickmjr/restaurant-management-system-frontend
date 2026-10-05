# Briefing do frontend

Você vai construir o frontend de um sistema de fluxo de caixa para restaurantes. A referência da API está no outro documento. Este aqui é sobre produto, condições de uso e design.

Leia a seção de antipadrões antes de escrever a primeira linha de CSS.

---

## 1. Quem usa, quando e em que estado

Isso não é contexto decorativo. É daqui que sai o design inteiro, então leia com atenção.

**O funcionário** registra as entradas e as saídas do dia. Ele faz isso **no fim do turno**, entre 21h e 23h, de pé, no balcão ou na cozinha, no celular, com pressa, cansado, possivelmente com a mão suja ou molhada, no barulho, com luz ruim. Ele não quer explorar o sistema. Ele quer digitar quatro números e ir para casa. Cada toque extra que você colocar no caminho dele é uma chance de ele desistir e anotar no papel.

**O dono** olha o resultado. Ele faz isso de manhã tomando café, ou à noite no sofá, no celular, e às vezes no computador quando vai levar a sério. A pergunta dele é uma só e é sempre a mesma, **"quanto entrou e quanto sobrou"**. Em segundo lugar vem "em que dia foi diferente" e "para onde foi o dinheiro".

São dois produtos diferentes no mesmo app. Um é **instrumento de digitação**. O outro é **documento de leitura**. Eles não devem parecer a mesma tela, e nenhum dos dois é um dashboard.

Não existe terceiro tipo de usuário. Ninguém vai "administrar" nada, ninguém vai configurar nada, ninguém vai explorar relatórios cruzados. Se você se pegar desenhando uma tela de configurações, parou de resolver o problema.

---

## 2. Antipadrões, o que eu não quero ver

Esta lista existe porque o default da indústria hoje é um visual específico e eu não quero ele. Se qualquer item abaixo aparecer, o trabalho precisa ser refeito.

**Não use biblioteca de componentes pronta.** Nem shadcn/ui, nem MUI, nem Chakra, nem Ant, nem daisyUI. Elas são a causa principal de tudo parecer igual. Escreva os componentes.

**Não use nada disso visualmente.**

- Gradiente roxo, índigo, violeta, ou qualquer gradiente de duas cores em botão ou cabeçalho
- Glassmorphism, blur de fundo, cartão translúcido
- Fundo escuro com acento neon, verde-limão ou ciano
- Blobs desfocados, formas orgânicas flutuando, malha de gradiente
- Cartão branco com `border-radius` grande e sombra difusa empilhado em grade de três colunas
- Quatro cartões de métrica em linha no topo da tela
- Gráfico de rosca, gráfico de pizza, gauge
- Número que anima contando de zero até o valor
- Emoji como ícone
- Ícone de biblioteca em toda label
- Inter, Poppins, Montserrat, DM Sans, Plus Jakarta
- Paleta default do Tailwind, principalmente `slate`, `indigo`, `emerald-500`
- Microcópia animada, "Welcome back 👋", "Let's get started"
- Página de login centralizada com logo acima e card flutuando no meio de um fundo com gradiente

**Não invente funcionalidade que a API não tem.** Sem notificações, sem avatar, sem tema customizável, sem busca global, sem exportar PDF, sem convidar por email, sem onboarding de boas-vindas. A lista do que não existe está no fim da doc da API. Respeite.

---

## 3. A direção, e de onde ela vem

O sistema que este app substitui é **o caderno**. Todo restaurante pequeno no Brasil tem um caderno de caixa, ou uma planilha que imita um caderno. Linhas, data no alto da página, valores numa coluna à direita, total no pé, caneta.

Esse caderno é a direção. Não como decoração nostálgica, e sim porque a estrutura dele já resolve o problema. Uma página por dia. Uma linha por lançamento. Valores alinhados para o olho somar sozinho. Total no pé. E uma página que em algum momento **fecha**, que é exatamente a janela de três dias da regra de negócio.

Então o produto tem duas metáforas, uma para cada modo.

**Ler é um livro.** Página do dia, régua, coluna de valores, soma no pé, dupla linha antes do total como em contabilidade de verdade. Densidade alta, porque livro é denso. Autoridade tipográfica, porque é um documento financeiro.

**Escrever é uma máquina de registrar.** Teclado numérico, display grande, valor crescendo da direita para a esquerda conforme digita, confirmação seca. Nada de formulário com cinco campos e um botão Salvar no fim da rolagem.

A tensão entre as duas é o que vai dar personalidade. O app é um livro contábil que, quando você vai escrever nele, vira calculadora.

Uma coisa que ajuda a não cair no genérico, pense nisso como **um instrumento, não como um site**. Instrumento tem mostrador, tem marca, tem travamento, tem precisão. Site tem herói, tem cartão e tem call to action.

---

## 4. Sistema visual concreto

Está tudo decidido abaixo de propósito, para você não precisar inventar e cair no default.

### Tipografia

Três famílias, todas no Google Fonts, cada uma com um papel que não se mistura.

- **Instrument Serif**, peso 400, só para a data da página, o total do dia e o total do período. É a voz do documento. Use em tamanho grande, nunca em label, nunca em botão.
- **IBM Plex Sans**, pesos 400, 500 e 600, para tudo que é interface. Label, botão, navegação, texto de ajuda.
- **IBM Plex Mono**, pesos 400 e 500, para **todo valor monetário**, todo horário, todo id. Mono garante que os dígitos tenham a mesma largura, e é isso que faz a coluna de valores ficar alinhada e somável a olho. Isso não é estética, é função.

Escala, em pixels, e só esta. `12, 14, 16, 20, 28, 44, 64`.

### Cores

Tinta sobre papel. Nada de cinza azulado.

```
--papel            #F5F1E8
--papel-alto       #FBF9F4
--tinta            #17140F
--tinta-media      #6B6459
--regua            #DED5C4
--regua-forte      #C4B79F
--entrada          #2F6B4A
--saida            #A32E26
--janela           #B5781F
--travado          #9A9388
```

Modo noite existe, e **não é dark mode genérico**. É papel carbono.

```
--papel            #15120E
--papel-alto       #1E1A14
--tinta            #EFE8DA
--tinta-media      #A09684
--regua            #332C22
--regua-forte      #4A4133
--entrada          #6FAE88
--saida            #D9736A
--janela           #D9A24A
--travado          #6E675B
```

Regras de uso de cor, e elas importam mais que os valores.

- Verde e vermelho são **carimbo, não preenchimento**. Eles aparecem no sinal do valor, numa barra fina de 2px, numa borda lateral. Nunca como fundo de cartão inteiro, nunca como botão grande colorido.
- O ocre `--janela` é exclusivo da contagem da janela de três dias. Não use para mais nada. Quando o usuário vê ocre, ele aprende que é sobre tempo acabando.
- O botão de ação principal é **tinta sobre papel**, retangular, raio 2px, sem sombra. Autoridade vem do contraste e do peso, não de cor.
- Nada de sombra difusa. Separação é feita com régua de 1px em `--regua`.

### Forma e densidade

- Raio de borda máximo `2px`. Em quase tudo, `0`.
- Sem sombra. A única exceção é o teclado numérico, que pode ter uma sombra dura de 2px deslocada, tipo tecla física.
- Linha de lançamento tem **48px de altura no celular**, porque o dedo do funcionário cansado precisa acertar. No desktop pode cair para 36px.
- Espaçamento base de 4px, e use múltiplos. Entre blocos, 24px. Dentro de bloco, 8px.
- Largura máxima de conteúdo 560px no modo leitura. É uma página, não um painel.

### Como escrever dinheiro

Esta é a regra mais importante do documento inteiro.

- Sempre `R$ 1.250,00`, nunca `1250`, nunca `R$1250.00`
- Sempre em IBM Plex Mono com `font-variant-numeric: tabular-nums`
- Sempre **alinhado à direita** em qualquer lista ou tabela
- O `R$` vai em `--tinta-media`, dois pixels menor, e os centavos também vão em `--tinta-media`. Os reais ficam em `--tinta` cheia. O olho lê o que importa primeiro e os centavos existem sem gritar
- Entrada recebe o valor em `--entrada`. Saída recebe **sinal de menos visível** e `--saida`. Saldo negativo vem com parênteses, `(R$ 320,00)`, que é como contabilidade escreve e é mais legível que um menos solto

### Movimento

Praticamente nenhum, e mecânico quando existir.

- Transições de 120ms, `ease-out`. Nada de 300ms com mola.
- Lançamento novo **assenta** na lista, entra 4px acima e cai. Não desliza da lateral, não escala, não faz fade longo.
- Número **nunca** anima contando. Ele aparece pronto.
- Teclado numérico tem feedback de 60ms na tecla, como tecla afundando.

---

## 5. As telas

### Entrar

Uma coluna, alinhada ao topo e à esquerda, não centralizada no meio do nada. Fundo papel, sem card flutuando. Nome do restaurante em Instrument Serif grande, campos empilhados com label acima em caixa alta pequena, botão de tinta cheia.

Lembre que o login pede `restaurantId` junto com email e senha. Não jogue isso na cara do usuário como um campo de UUID. Guarde o último `restaurantId` usado no `localStorage` e mostre o campo como "código do restaurante", colapsado atrás de um link "entrar em outro restaurante" quando já houver um salvo.

### A página do dia, que é a tela inicial

É aqui que o funcionário vive. Ela é a página do caderno.

No alto, a data em Instrument Serif, tamanho 44, por extenso, "terça, 10 de março". Abaixo dela, pequena, em mono, a competência em ISO para não deixar dúvida.

Logo abaixo da data, **a nota da margem**. Um texto curto em ocre dizendo quanto falta para a página fechar, "esta página fecha em 2 dias e 4 horas". Isso não é um banner nem um alerta com ícone. É uma anotação, alinhada à esquerda, 14px, e a régua vertical da esquerda da página fica em ocre enquanto a janela está aberta.

No corpo, duas seções separadas por régua, entradas e saídas, cada uma como lista de linhas. Cada linha tem o nome do método ou da categoria à esquerda em Plex Sans, a observação abaixo em 12px `--tinta-media` quando existir, e o valor à direita em mono. Régua de 1px entre linhas, como papel pautado.

No pé, o total, e aqui você faz contabilidade de verdade. Régua simples acima de cada subtotal, **régua dupla** acima do saldo final. Saldo em Instrument Serif tamanho 44. Isso é o momento de autoridade da tela.

Quando a página está travada, a tela ganha um **carimbo**. SVG, contorno, sem preenchimento, rotacionado uns 6 graus, texto "FECHADO" e abaixo a data em que fechou, em `--travado`, posicionado sobre o canto superior direito do bloco de totais, parcialmente sobre o conteúdo. As linhas caem para `--travado`. Os botões de editar desaparecem, não ficam desabilitados. A página virou documento histórico.

Dia sem lançamento nenhum não é erro, a API devolve 404 e isso significa página em branco. Mostre **a página pautada vazia**, com as réguas visíveis e a data no alto, e uma linha em `--tinta-media` dizendo "nada lançado ainda". Nunca uma ilustração de caixa vazia.

### Lançar, que é a máquina de registrar

Chega por um botão fixo no pé da página do dia, retangular, tinta cheia, largura total menos as margens, texto "Lançar entrada". Ao lado, menor e só com contorno, "saída".

A tela de lançamento é **uma tela só**, não um passo a passo, e ocupa tudo.

No alto, o display. O valor em IBM Plex Mono, tamanho 64, alinhado à direita, começando em `R$ 0,00`.

Abaixo, a escolha do método de pagamento como **fileira de pastilhas** retangulares roláveis na horizontal, não um select. O funcionário conhece os três ou quatro que usa, e eles têm que estar a um toque. Pastilha selecionada fica tinta cheia.

Abaixo, o teclado numérico. Nove teclas, zero, e apagar. Teclas grandes, no mínimo 64px de altura, régua entre elas, sem raio.

**A regra de digitação é de máquina registradora.** Não existe tecla de vírgula. Os dígitos entram pela direita, em centavos. Digitar `1 2 5 0 0 0` mostra `R$ 1,25`, depois `R$ 12,50`, depois `R$ 125,00`, depois `R$ 1.250,00`. Isso casa exatamente com a API, que recebe `amountInCents` inteiro, então você nunca converte decimal e nunca tem bug de arredondamento. É a melhor ideia deste documento, não a troque por um input de texto.

A competência é hoje por default. Trocar fica atrás de um link discreto "outro dia", porque é o caso raro. Quando trocado, mostre a data escolhida em ocre perto do display, porque lançar no dia errado é o erro mais caro que o usuário pode cometer aqui.

A observação é um campo opcional, uma linha, colapsado atrás de "+ observação".

Confirmar é uma tecla no canto do teclado, larga, tinta cheia, escrita "Lançar". Depois de lançar, **volta para a página do dia** e a linha nova assenta na lista. Sem toast, sem modal de sucesso. O usuário vê a linha aparecer e o total mudar, e isso é a confirmação.

### O livro do mês, para o dono

Nada de dashboard. Isto é o extrato.

No alto, o período, com dois atalhos, "este mês" e "mês passado", e a escolha livre atrás de "outro período".

Abaixo, **os totais do período** em três linhas, não em três cartões. Entrou, saiu, sobrou. Rótulo à esquerda em Plex Sans, valor à direita em mono, régua dupla acima do saldo. O saldo em Instrument Serif 44.

Abaixo, **a coluna de dias**, que é o coração desta tela. Uma linha por dia com lançamento. Cada linha tem o dia em mono à esquerda, o saldo do dia em mono à direita, e entre os dois uma **barra fina de 2px** cuja largura é proporcional ao maior saldo do período, verde para positivo saindo da esquerda, vermelha para negativo. A barra vive dentro da linha, não é um gráfico separado. O dono rola e vê o mês inteiro no formato que ele já entende, uma coluna.

Tocar num dia abre a página daquele dia.

Mais abaixo, duas listas pequenas, por método de pagamento e por categoria de saída. A API já devolve ordenado do maior para o menor, então respeite a ordem e não ordene de novo. Cada item é uma linha com nome à esquerda, valor em mono à direita, e a mesma barra de 2px. **Nenhuma rosca, nenhuma pizza.**

Dias sem lançamento não voltam da API. Não preencha os buracos com zero numa lista, isso só ocupa espaço. A ausência do dia já informa.

### Catálogos

Tela de administração, só para dono, e deve parecer o apêndice do livro. Lista simples, régua entre itens, nome à esquerda, e renomear acontece **no lugar**, tocando o nome e editando, não num modal. Criar é um campo no pé da lista com um botão.

Em método de pagamento, as tags aparecem como pastilhas pequenas embaixo do nome, com um `x` para remover e um `+` para anexar.

Nome repetido volta 409. Mostre o erro **debaixo do campo**, em `--saida`, e não num toast.

### Operadores

Só dono vê. Formulário curto, e o papel é uma escolha de duas pastilhas, "dono" e "funcionário", não um select.

A API não tem endpoint para listar operadores. Então esta tela só cria. Não finja que lista.

---

## 6. Regras de negócio que a interface tem que respeitar

Se qualquer uma destas quebrar, o app está errado mesmo que esteja bonito.

1. **Dinheiro é inteiro em centavos** em todo tráfego com a API. Formatar é só na exibição. Nunca envie decimal.
2. **A janela de três dias é visível antes de o usuário bater nela.** Use `isLocked` e `lockedAt` da resposta para esconder ações. Deixar o usuário tentar e tomar 422 é falha de design, não de backend.
3. **O restaurante nunca aparece em corpo de requisição nem em URL.** Ele vem do token. Se você se pegar mandando `restaurantId` em algum lugar que não seja o login e o bootstrap, parou.
4. **Funcionário não pode mexer em lançamento de outro operador.** Compare o `operatorId` da linha com o do `/me` e esconda as ações quando não for dele. O backend recusa com 403, mas o botão não devia existir.
5. **404 em balanço é estado vazio, não erro.** Página em branco, não tela de erro.
6. **Renomear catálogo reescreve o histórico.** Avise isso na tela de renomear, numa linha, porque o dono não espera que mudar "Cartão" para "Cartão de Crédito" mude o relatório do ano passado.
7. **Remover lançamento apaga de verdade**, não é cancelamento. Pergunte antes, numa confirmação inline na própria linha, não num modal centralizado.
8. **Omitir campo é diferente de mandar `null`** no PATCH. Omitido mantém, `null` limpa. Isso vale para `observation`.
9. **Token expira e não há refresh.** Em 401 com `INVALID_TOKEN`, limpe a sessão e mande para o login sem drama.

---

## 7. Stack

Sugestão, e você pode trocar se tiver motivo escrito.

- React com Vite e TypeScript em modo estrito
- TanStack Query para falar com a API, porque cache e invalidação depois de lançar você não quer escrever na mão
- Roteamento com React Router
- CSS puro com variáveis, ou Tailwind **com a paleta default desligada** e só os tokens acima no `theme`. Se usar Tailwind com a paleta padrão, o resultado vai parecer igual a todo mundo
- Zero biblioteca de componentes
- Ícones, desenhe os quatro ou cinco que precisar como SVG inline. Não instale pacote de ícones

Atenção, **a API ainda não tem CORS configurado**. Em desenvolvimento, use o proxy do Vite apontando para `http://localhost:3333` em vez de chamar direto, senão o navegador bloqueia tudo.

Acessibilidade não é opcional. Contraste mínimo de 4.5 para texto, foco visível com contorno de 2px em tinta, teclado numérico navegável por teclado de verdade, e `aria-live` discreto quando o total do dia muda.

---

## 8. Ordem de construção

Fatia vertical inteira antes de começar a próxima, igual o backend foi feito.

1. Tokens de design, fontes e os três ou quatro componentes de base, linha, régua, valor monetário, botão
2. Login e sessão, com guarda de rota
3. A página do dia, somente leitura, consumindo `GET /balances/:competence`
4. A máquina de registrar, entrada, com o teclado de centavos
5. Saída, que é espelho
6. Editar e remover lançamento, com a regra de papel
7. O livro do mês
8. Catálogos
9. Criar operador

Pare depois do item 4 e me mostre. Se o teclado de centavos e a página do dia estiverem certos, o resto é repetição.

---

## 9. Como saber que não ficou genérico

Antes de me entregar, faça estes três testes.

**Teste do print.** Tire um print, tape o nome do restaurante e pergunte se isso poderia ser qualquer SaaS. Se poderia, falhou.

**Teste da cor.** Se existir um gradiente, um roxo, ou um cartão branco com sombra difusa em grade de três colunas, falhou.

**Teste do funcionário cansado.** Conte quantos toques são necessários para lançar uma venda de mil e duzentos reais em dinheiro, abrindo o app já logado. Se for mais de seis, falhou. Meta, abrir, tocar "Lançar entrada", tocar a pastilha "Dinheiro", digitar `1 2 0 0 0 0`, tocar "Lançar".
