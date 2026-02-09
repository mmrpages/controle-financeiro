# 🔧 Guia de Troubleshooting - Financeiro 2026

## ❌ Problema: Página não carrega após login

### 🔍 Como Debugar

1. **Abra o Console do Navegador:**
   - Chrome/Edge: Pressione `F12` ou `Ctrl+Shift+J`
   - Firefox: Pressione `F12` ou `Ctrl+Shift+K`
   - Safari: `Cmd+Option+C`

2. **Verifique os Logs:**
   Você deve ver mensagens assim:
   ```
   📊 Carregando dados do usuário: [seu-uid]
   ✅ Dados encontrados no Firebase
   OU
   🆕 Novo usuário - inicializando dados padrão
   ✅ Dados carregados com sucesso!
   ```

3. **Erros Comuns e Soluções:**

---

## 🚨 Erro: "Cannot use import statement outside a module"

**Causa:** Você está abrindo o arquivo HTML diretamente (file://)

**Solução:** Use um servidor web local

### Opção 1: Live Server (VS Code)
```bash
1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em index.html
3. Selecione "Open with Live Server"
```

### Opção 2: Python
```bash
# No terminal, na pasta do projeto:
python -m http.server 8000

# Acesse: http://localhost:8000
```

### Opção 3: Node.js
```bash
npx serve
# Ou
npm install -g http-server
http-server
```

---

## 🔥 Erro: "Permission denied" no Firestore

**Causa:** Regras de segurança não configuradas

**Solução:**

1. Vá em https://console.firebase.google.com/
2. Selecione seu projeto
3. Firestore Database > Rules
4. Cole o conteúdo do arquivo `firestore.rules`
5. Clique em "Publicar"

**Regras necessárias:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🌐 Erro: "Failed to fetch" ou "Network error"

**Causa:** Problema de conexão ou CORS

**Soluções:**

1. **Verifique sua internet**
2. **Use HTTPS ao invés de HTTP** (se em produção)
3. **Desative extensões** (AdBlock pode bloquear Firebase)
4. **Limpe o cache:**
   - Chrome: `Ctrl+Shift+Delete`
   - Selecione "Cache" e "Cookies"
   - Limpe

---

## ⚪ Página fica em branco após login

**Causa:** JavaScript travou ou DOM não carregou

**Solução:**

1. Abra o Console (F12)
2. Verifique se há erros em vermelho
3. Procure por:
   - `Uncaught TypeError`
   - `Cannot read property`
   - `undefined is not a function`

**Se ver "Elementos da tabela não encontrados":**
- Recarregue a página (`F5`)
- Limpe o cache (`Ctrl+F5`)

---

## 🔐 Erro: "auth/user-not-found" após login

**Causa:** Email não cadastrado

**Solução:**
1. Na tela de login, clique em "Criar agora"
2. Cadastre-se primeiro
3. Depois faça login

---

## 💾 Dados não salvam

**Causa:** Regras do Firestore ou erro de conexão

**Debug:**

1. Console (F12) > Aba "Network"
2. Faça uma alteração
3. Procure por requisições para "firestore"
4. Se estiver vermelho, veja o erro

**Soluções:**
- Verifique regras do Firestore
- Confirme que está autenticado
- Verifique internet

---

## 🎯 Teste Passo a Passo

Execute este checklist:

### ✅ Checklist de Funcionamento

- [ ] **Servidor local rodando?**
  - URL deve ser `http://localhost:XXXX`
  - NÃO `file:///`

- [ ] **Regras do Firestore configuradas?**
  - Vá em Firebase Console > Firestore > Rules
  - Deve ter a regra de `usuarios/{userId}`

- [ ] **Console sem erros vermelhos?**
  - F12 > Console
  - Deve estar limpo ou só avisos amarelos

- [ ] **Consegue fazer login?**
  - Email e senha funcionam
  - Redireciona para index.html

- [ ] **Container aparece?**
  - Deve ver "Finanças 2026" no topo
  - Tabela vazia aparece

- [ ] **Pode adicionar despesa?**
  - Botão "+ Despesa" funciona
  - Modal abre

---

## 🆘 Se nada funcionar

### Opção 1: Reset Completo

1. Limpe cache do navegador
2. Delete pasta do projeto
3. Descompacte o ZIP novamente
4. Suba com servidor local
5. Tente criar nova conta

### Opção 2: Modo Debug

Adicione isto no Console (F12):

```javascript
// Ver estado atual
console.log('Estado:', state);

// Ver autenticação
console.log('Usuário:', window.auth.currentUser);

// Ver Firebase
console.log('Firebase:', window.db);

// Testar manualmente
window.showToast('Teste', 'success');
```

---

## 📧 Informações para Reportar Bugs

Se pedir ajuda, inclua:

1. **Navegador e versão** (ex: Chrome 120)
2. **Sistema operacional** (Windows/Mac/Linux)
3. **Como está rodando** (servidor local? qual?)
4. **Mensagens de erro** (F12 > Console)
5. **Screenshot** da tela/erro

---

## 🎓 Dicas Extras

### Desenvolvimento Local
- Use sempre um servidor local
- Mantenha o Console (F12) aberto
- Recarregue com `Ctrl+F5` para limpar cache

### Produção
- Use HTTPS sempre
- Configure domínio nas regras do Firebase
- Ative App Check para segurança extra

### Performance
- Dados salvam automaticamente após 1 segundo
- Cálculos acontecem após 300ms sem digitar
- Gráficos são gerados sob demanda

---

## ✅ Tudo Funcionando?

Se chegou aqui e tudo está ok:

1. ✨ Adicione suas categorias
2. 💰 Preencha suas rendas
3. 📊 Digite suas despesas
4. 🎉 Aproveite o sistema!

---

**Versão:** 2.0  
**Última atualização:** Fevereiro 2026
