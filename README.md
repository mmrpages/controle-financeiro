# 💰 Sistema Financeiro 2026 - Versão Otimizada

## 🎉 Melhorias Implementadas

### 🔒 Segurança
- ✅ Comentários sobre proteção das chaves do Firebase
- ✅ Instruções de configuração de regras de segurança
- ✅ Validação rigorosa de inputs
- ✅ Tratamento de erros melhorado em todas as operações
- ✅ Proteção contra valores negativos e muito grandes

### ⚡ Performance
- ✅ **Debounce** nos cálculos (300ms) - evita recálculos excessivos
- ✅ **Debounce** no salvamento (1s) - reduz chamadas ao Firebase
- ✅ Apenas Firebase como fonte de dados (removido localStorage duplicado)
- ✅ Cálculos otimizados
- ✅ Validações antes de processar dados

### 🎨 Interface & UX
- ✅ Encoding UTF-8 corrigido (todos os caracteres especiais funcionando)
- ✅ Loading spinner durante operações assíncronas
- ✅ Notificações toast para feedback visual
- ✅ Mensagens de erro específicas e amigáveis
- ✅ Placeholders nos inputs
- ✅ Hover effects melhorados
- ✅ Animações suaves
- ✅ Botões com estados desabilitados
- ✅ Validação visual de formulários
- ✅ Gráfico de pizza por mês (clique no nome do mês!)

### 🐛 Bugs Corrigidos
- ✅ Caracteres acentuados quebrados (FinanÃ§as → Finanças)
- ✅ Falta de validação de dados
- ✅ Erros silenciosos
- ✅ Duplicação de armazenamento
- ✅ Recálculos excessivos

### 📱 Responsividade
- ✅ Layout adaptativo para mobile
- ✅ Botões responsivos
- ✅ Cards empilhados em telas pequenas
- ✅ Toasts responsivos

## 🚀 Como Usar

### 1. Configuração Inicial

**IMPORTANTE - Segurança do Firebase:**

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto `mmrpages-controle-financeiro`
3. Vá em **Firestore Database** > **Rules**
4. Cole estas regras de segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      // Apenas o próprio usuário pode ler/escrever seus dados
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Clique em **Publicar**

### 2. Arquivos do Projeto

```
financeiro-2026/
├── index.html       - Página principal
├── login.html       - Página de autenticação
├── config.js        - Configuração do Firebase
├── script.js        - Lógica da aplicação
├── style.css        - Estilos
└── README.md        - Este arquivo
```

### 3. Testando Localmente

Você precisa de um servidor web local porque o projeto usa ES6 modules. Opções:

**Opção 1 - Live Server (VS Code):**
1. Instale a extensão "Live Server"
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

**Opção 2 - Python:**
```bash
# Python 3
python -m http.server 8000

# Acesse: http://localhost:8000
```

**Opção 3 - Node.js:**
```bash
npx serve
```

### 4. Usando o Sistema

1. **Primeiro Acesso:**
   - Clique em "Criar agora"
   - Cadastre-se com e-mail e senha (mín. 6 caracteres)

2. **Adicionar Despesas:**
   - Clique em "+ Despesa"
   - Digite o nome (ex: "Internet")
   - Escolha a categoria
   - Clique em "Salvar"

3. **Preencher Valores:**
   - Digite a renda de cada mês
   - Preencha os valores das despesas
   - Os totais são calculados automaticamente

4. **Ver Gráficos:**
   - Clique no nome de qualquer mês
   - Veja a distribuição das despesas em pizza

5. **Editar/Excluir:**
   - Clique no nome da categoria para editar
   - Clique em "Excluir" para remover

## 🎯 Recursos Principais

### ✨ Funcionalidades

- ✅ Autenticação com Firebase
- ✅ Salvamento automático na nuvem
- ✅ Múltiplas categorias personalizáveis
- ✅ Cálculo automático de totais e saldos
- ✅ Barra de percentual de uso da renda
- ✅ Gráficos por mês
- ✅ Resumo anual
- ✅ Interface moderna e intuitiva

### 🎨 Design

- **Tema:** Sky Edition (azul e branco)
- **Fontes:** Inter (system-ui fallback)
- **Cores:** CSS Variables para fácil customização
- **Responsivo:** Funciona em desktop, tablet e mobile

## 🔧 Customização

### Alterar Cores

Edite as variáveis CSS em `style.css`:

```css
:root {
  --bg: #f0f4f8;              /* Fundo da página */
  --card-bg: #ffffff;         /* Fundo dos cards */
  --text-main: #1e293b;       /* Texto principal */
  --text-muted: #64748b;      /* Texto secundário */
  --accent-blue: #0ea5e9;     /* Cor de destaque */
  --success: #10b981;         /* Verde (sucesso) */
  --danger: #ef4444;          /* Vermelho (perigo) */
  --warning: #f59e0b;         /* Amarelo (aviso) */
}
```

### Adicionar Categorias Padrão

Edite o array `presets` em `script.js`:

```javascript
presets: [
  "Fixa", 
  "Variável", 
  "Lazer", 
  "Saúde", 
  "Moradia", 
  "Transporte", 
  "Cartão de Crédito", 
  "Outros",
  "Educação",      // Adicione aqui
  "Investimentos"  // E aqui
]
```

## 📊 Estrutura de Dados

Os dados são salvos no Firebase Firestore assim:

```javascript
{
  presets: ["Fixa", "Variável", ...],
  categories: [
    { id: "ex_1234567890", name: "Internet", type: "Fixa" },
    { id: "ex_1234567891", name: "Uber", type: "Transporte" }
  ],
  data: [
    {
      income: 5000,
      expenses: {
        "ex_1234567890": 100,
        "ex_1234567891": 200
      }
    },
    // ... para cada mês
  ],
  settings: { showTotals: {} }
}
```

## 🚨 Próximos Passos Recomendados

### Alta Prioridade
- [ ] Implementar backup/export de dados (CSV/Excel)
- [ ] Adicionar modo escuro
- [ ] Implementar comparação entre meses
- [ ] Adicionar metas de gastos por categoria

### Média Prioridade
- [ ] Gráficos de evolução anual
- [ ] Relatórios personalizados
- [ ] Notificações de gastos excessivos
- [ ] Import de dados bancários

### Baixa Prioridade
- [ ] PWA (Progressive Web App)
- [ ] Modo offline
- [ ] Compartilhamento de orçamento (família)
- [ ] Integração com bancos

## 🐛 Solução de Problemas

### Problema: Não consigo fazer login
**Solução:** 
- Verifique sua conexão com internet
- Certifique-se que o e-mail está correto
- A senha deve ter no mínimo 6 caracteres
- Tente redefinir a senha pelo Firebase Console

### Problema: Dados não salvam
**Solução:**
- Verifique as regras de segurança do Firestore
- Abra o Console do navegador (F12) e veja se há erros
- Confirme que está autenticado

### Problema: Caracteres estranhos
**Solução:**
- Certifique-se que todos os arquivos estão salvos como UTF-8
- No VS Code: clique em "UTF-8" no canto inferior direito

### Problema: "Cannot use import outside module"
**Solução:**
- Use um servidor web local (não abra o arquivo diretamente)
- Veja a seção "Testando Localmente" acima

## 📞 Suporte

Se encontrar bugs ou tiver sugestões:
1. Verifique a seção "Solução de Problemas"
2. Abra o Console do navegador (F12) e veja os erros
3. Verifique as regras do Firestore

## 📝 Licença

Este projeto é de uso pessoal e educacional.

## 🎉 Créditos

- **Desenvolvedor Original:** Você
- **Melhorias e Otimização:** Claude AI
- **Framework CSS:** Custom (CSS Variables)
- **Backend:** Firebase (Auth + Firestore)
- **Gráficos:** Chart.js

---

**Versão:** 2.0 Otimizada  
**Data:** Fevereiro 2026  
**Status:** ✅ Produção
