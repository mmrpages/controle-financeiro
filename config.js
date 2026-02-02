<script type="module">
  import firebaseConfig from './config.js'; // Importa as chaves do arquivo externo
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
  import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

  // O restante do seu código de inicialização continua igual...
  const app = initializeApp(firebaseConfig);
  window.auth = getAuth(app);
  window.db = getFirestore(app);
  // ...
</script>