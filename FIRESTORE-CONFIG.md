# 🔥 CONFIGURAÇÃO COMPLETA DO FIRESTORE

## ⚠️ IMPORTANTE: Siga TODOS os passos nesta ordem

---

## PASSO 1: Ativar o Firestore Database

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **mmrpages-controle-financeiro**
3. No menu lateral, clique em **"Firestore Database"**
4. Se aparecer um botão "Create database", clique nele
5. Escolha:
   - **Modo:** Production mode (ou Test mode temporariamente)
   - **Localização:** southamerica-east1 (São Paulo) ou us-central1
6. Clique em "Enable"

---

## PASSO 2: Configurar Regras de Segurança

### Opção A: Regras CORRETAS (Recomendado)

1. Vá em **Firestore Database** > Aba **"Rules"**
2. **DELETE TUDO** que estiver lá
3. Cole exatamente isto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite que cada usuário acesse APENAS seus próprios dados
    match /usuarios/{userId} {
      // Permite ler e escrever apenas se:
      // - O usuário está autenticado (request.auth != null)
      // - O ID do usuário autenticado é igual ao ID do documento
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
    
    // Bloqueia tudo que não seja da coleção "usuarios"
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Clique em **"Publish"** (Publicar)
5. Aguarde a mensagem de sucesso

### Opção B: Regras de TESTE (Apenas para DEBUG - expira em 30 dias)

⚠️ **USE APENAS PARA TESTAR! INSEGURO PARA PRODUÇÃO!**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 3, 15);
    }
  }
}
```

---

## PASSO 3: Verificar Authentication

1. No menu lateral, clique em **"Authentication"**
2. Clique na aba **"Sign-in method"**
3. Verifique se **"Email/Password"** está **ENABLED** (ativado)
4. Se não estiver:
   - Clique em "Email/Password"
   - Toggle "Enable"
   - Save

---

## PASSO 4: Testar Manualmente no Console do Firebase

### Teste de Escrita:

1. Vá em **Firestore Database** > Aba **"Data"**
2. Clique em **"Start collection"**
3. Collection ID: `usuarios`
4. Document ID: `teste123`
5. Adicione um campo:
   - Field: `nome`
   - Type: `string`
   - Value: `Teste`
6. Clique em "Save"

Se conseguir salvar: ✅ Firestore está funcionando!
Se der erro: ❌ Há problema na configuração

### Teste de Leitura:

1. Ainda em **Firestore Database** > **Data**
2. Você deve ver a coleção `usuarios`
3. Deve ver o documento `teste123`
4. Clique nele e veja o campo `nome: Teste`

---

## PASSO 5: Testar no Seu App

### Abra o Console do Navegador (F12) e cole:

```javascript
// Teste 1: Ver se Firebase está conectado
console.log('Auth:', window.auth);
console.log('DB:', window.db);
console.log('Usuário:', window.auth?.currentUser);

// Teste 2: Tentar salvar manualmente
async function testarSalvar() {
  if (!window.auth.currentUser) {
    console.error('❌ Não está logado!');
    return;
  }
  
  try {
    const { doc, setDoc } = window.fbOps;
    await setDoc(
      doc(window.db, "usuarios", window.auth.currentUser.uid),
      {
        teste: true,
        data: new Date().toISOString(),
        mensagem: "Teste de escrita"
      }
    );
    console.log('✅ Salvou com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    console.error('Código do erro:', error.code);
    console.error('Mensagem:', error.message);
  }
}

testarSalvar();

// Teste 3: Tentar ler manualmente
async function testarLer() {
  if (!window.auth.currentUser) {
    console.error('❌ Não está logado!');
    return;
  }
  
  try {
    const { doc, getDoc } = window.fbOps;
    const docSnap = await getDoc(
      doc(window.db, "usuarios", window.auth.currentUser.uid)
    );
    
    if (docSnap.exists()) {
      console.log('✅ Dados lidos:', docSnap.data());
    } else {
      console.log('⚠️ Documento não existe ainda');
    }
  } catch (error) {
    console.error('❌ Erro ao ler:', error);
    console.error('Código do erro:', error.code);
    console.error('Mensagem:', error.message);
  }
}

testarLer();
```

---

## 📋 ERROS COMUNS E SOLUÇÕES

### ❌ Erro: "Missing or insufficient permissions"

**Causa:** Regras do Firestore bloqueando acesso

**Solução:**
1. Vá em Firestore > Rules
2. Use as regras do PASSO 2
3. Clique em "Publish"
4. Aguarde 1-2 minutos
5. Tente novamente

### ❌ Erro: "PERMISSION_DENIED"

**Causa:** Usuário não está autenticado ou regras incorretas

**Solução:**
1. Faça logout e login novamente
2. Verifique se `window.auth.currentUser` não é null
3. Confira as regras do Firestore

### ❌ Erro: "Firebase: Error (auth/network-request-failed)"

**Causa:** Problema de internet ou bloqueio

**Solução:**
1. Verifique sua conexão
2. Desative VPN se estiver usando
3. Desative AdBlock/extensões
4. Tente outro navegador

### ❌ Erro: "Cannot read property 'uid' of null"

**Causa:** Tentando salvar antes de autenticar

**Solução:**
1. Certifique-se de estar logado
2. Aguarde o login completar
3. Verifique se `onAuthStateChanged` disparou

### ❌ Dados salvam mas não aparecem

**Causa:** Cache ou sincronização

**Solução:**
1. Force refresh: `Ctrl + F5`
2. Limpe cache do navegador
3. Verifique no Firebase Console se os dados estão lá

---

## 🎯 CHECKLIST FINAL

Marque cada item após completar:

- [ ] Firestore Database está ativado
- [ ] Regras de segurança estão configuradas
- [ ] Email/Password authentication está ativado
- [ ] Consegui criar documento "teste123" manualmente
- [ ] Consegui ver o documento no console
- [ ] `testarSalvar()` retornou ✅
- [ ] `testarLer()` retornou ✅
- [ ] Estou usando servidor local (não file://)
- [ ] Console do navegador não mostra erros vermelhos

---

## 🔍 DIAGNÓSTICO AVANÇADO

Se NADA funcionar, cole isto no Console (F12) e me envie o resultado:

```javascript
async function diagnosticoCompleto() {
  console.log('=== DIAGNÓSTICO COMPLETO ===');
  
  // 1. Firebase
  console.log('1. Firebase carregado?', typeof firebase !== 'undefined' ? '✅' : '❌');
  console.log('   Auth disponível?', window.auth ? '✅' : '❌');
  console.log('   DB disponível?', window.db ? '✅' : '❌');
  
  // 2. Autenticação
  const user = window.auth?.currentUser;
  console.log('2. Usuário logado?', user ? '✅' : '❌');
  if (user) {
    console.log('   UID:', user.uid);
    console.log('   Email:', user.email);
  }
  
  // 3. Configuração
  console.log('3. Configuração Firebase:');
  console.log('   Project ID:', window.db?._databaseId?.projectId || 'N/A');
  
  // 4. Teste de conexão
  console.log('4. Testando conexão...');
  if (user) {
    try {
      const { doc, getDoc } = window.fbOps;
      const testDoc = await getDoc(doc(window.db, "usuarios", user.uid));
      console.log('   Conexão:', '✅');
      console.log('   Documento existe?', testDoc.exists() ? '✅' : '❌');
      if (testDoc.exists()) {
        console.log('   Dados:', testDoc.data());
      }
    } catch (e) {
      console.log('   Conexão:', '❌');
      console.log('   Erro:', e.code, e.message);
    }
  }
  
  console.log('=== FIM DO DIAGNÓSTICO ===');
}

diagnosticoCompleto();
```

---

## 📞 PRECISA DE AJUDA?

Envie para mim:

1. ✅ Screenshot das Regras do Firestore
2. ✅ Resultado do `diagnosticoCompleto()`
3. ✅ Screenshot do Console (F12) mostrando os erros
4. ✅ Confirmação de que está usando servidor local

---

**Última atualização:** Fevereiro 2026
