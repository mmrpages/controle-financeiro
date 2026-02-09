// config.js
// IMPORTANTE: Em produção, use variáveis de ambiente
// Para desenvolvimento local, este arquivo funciona, mas NÃO commite em repositórios públicos

const firebaseConfig = {
  apiKey: "AIzaSyCEhMZcmsklTArvDk2AMDg3Vm6RxzE2a8c",
  authDomain: "mmrpages-controle-financeiro.firebaseapp.com",
  projectId: "mmrpages-controle-financeiro",
  storageBucket: "mmrpages-controle-financeiro.firebasestorage.app",
  messagingSenderId: "415288375426",
  appId: "1:415288375426:web:fd5e211ca0bc6324da9c9b"
};

// PRÓXIMO PASSO DE SEGURANÇA:
// 1. Vá em Firebase Console > Project Settings > General
// 2. Role até "Your apps" e clique no ícone de configurações
// 3. Em "App Check", ative a proteção
// 4. Configure as regras de segurança do Firestore:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/

export default firebaseConfig;
