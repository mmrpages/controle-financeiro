// config.js
// ATENÇÃO: este arquivo é apenas para desenvolvimento local.
// NÃO envie este arquivo para repositórios públicos nem para produção.
// Em produção, use variáveis de ambiente e App Check no Firebase.

const firebaseConfig = {
    apiKey: "AIzaSyCEhMZcmsklTArvDk2AMDg3Vm6RxzE2a8c",
    authDomain: "mmrpages-controle-financeiro.firebaseapp.com",
    projectId: "mmrpages-controle-financeiro",
    storageBucket: "mmrpages-controle-financeiro.firebasestorage.app",
    messagingSenderId: "415288375426",
    appId: "1:415288375426:web:fd5e211ca0bc6324da9c9b"
};

// Próximos passos de segurança (obrigatórios para produção):
// - Ativar App Check no Firebase Console
// - Configurar regras de segurança do Firestore para restringir por UID:

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
