import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const STORAGE_KEY = 'fin_v2026_sky_final';
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let state = {
  presets: ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão", "Outros"],
  categories: [],
  data: months.map(() => ({ income: 0, expenses: {} }))
};

let currentEditId = null;

// Monitor de Autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (docSnap.exists()) {
      state = docSnap.data();
    }
    document.getElementById('mainContainer').style.display = 'block';
    build();
  } else {
    window.location.href = 'login.html';
  }
});

// Funções de Persistência
async function save() {
  if (auth.currentUser) {
    await setDoc(doc(db, "usuarios", auth.currentUser.uid), state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  build();
}

function parseVal(v) {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Lógica de Interface
function calculate() {
  let tR = 0, tG = 0;
  months.forEach((_, m) => {
    const incInput = document.getElementById(`inc-${m}`);
    const inc = parseVal(incInput.value);
    state.data[m].income = inc;
    
    let mG = 0;
    state.categories.forEach(c => {
      const val = parseVal(document.getElementById(`e-${m}-${c.id}`).value);
      state.data[m].expenses[c.id] = val;
      mG += val;
    });

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);
    
    const perc = inc > 0 ? (mG / inc) * 100 : 0;
    const bar = document.getElementById(`bar-${m}`);
    if (bar) {
      bar.style.width = Math.min(100, perc) + '%';
      bar.className = perc > 100 ? 'usage-bar warning' : 'usage-bar';
    }
    tR += inc; tG += mG;
  });

  document.getElementById('totalRenda').textContent = brFormatter.format(tR);
  document.getElementById('totalGasto').textContent = brFormatter.format(tG);
  document.getElementById('mediaSaldo').textContent = brFormatter.format(tR - tG);
  document.getElementById('mediaPerc').textContent = (tR > 0 ? (tG / tR * 100) : 0).toFixed(1) + '%';
}

function build() {
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  if(!head || !body) return;

  state.categories.sort((a, b) => a.type.localeCompare(b.type));
  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2"></th>`;
  Object.keys(groups).forEach(type => {
    h1 += `<th colspan="${groups[type]}" class="group-header">${type}</th>`;
  });
  h1 += `</tr><tr><th>Mês</th><th>Renda</th>`;

  state.categories.forEach(c => {
    h1 += `<th><div class="col-edit" data-id="${c.id}">${c.name}</div></th>`;
  });
  h1 += `<th>Total</th><th>Saldo</th><th>%</th></tr>`;
  head.innerHTML = h1;

  body.innerHTML = months.map((n, m) => `
    <tr>
      <td class="month-label">${n}</td>
      <td><input id="inc-${m}" class="input" value="${state.data[m].income ? brFormatter.format(state.data[m].income) : ''}"></td>
      ${state.categories.map(c => `<td><input id="e-${m}-${c.id}" class="input" value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}"></td>`).join('')}
      <td><input id="total-${m}" class="input-readonly" readonly></td>
      <td><input id="saldo-${m}" class="input-readonly" readonly></td>
      <td><div class="usage-wrapper"><div class="usage-bar" id="bar-${m}"></div></div></td>
    </tr>`).join('');
  
  // Adicionar listeners após build
  document.querySelectorAll('.input').forEach(i => {
    i.addEventListener('input', calculate);
    i.addEventListener('blur', save);
  });
  
  document.querySelectorAll('.col-edit').forEach(el => {
    el.addEventListener('click', () => openDataModal(el.dataset.id));
  });

  calculate();
}

// Gerenciamento de Modais e Eventos
function openDataModal(id = null) {
  currentEditId = id;
  const select = document.getElementById('inputExpenseCategory');
  select.innerHTML = state.presets.map(p => `<option value="${p}">${p}</option>`).join('');
  
  if (id) {
    const cat = state.categories.find(c => c.id === id);
    document.getElementById('inputExpenseName').value = cat.name;
    select.value = cat.type;
  } else {
    document.getElementById('inputExpenseName').value = "";
  }
  document.getElementById('dataModal').style.display = 'flex';
}

document.getElementById('btnSaveData').onclick = async () => {
  const name = document.getElementById('inputExpenseName').value.trim();
  const type = document.getElementById('inputExpenseCategory').value;
  if (!name) return;
  if (currentEditId) {
    const cat = state.categories.find(c => c.id === currentEditId);
    cat.name = name; cat.type = type;
  } else {
    state.categories.push({ id: 'ex_' + Date.now(), name, type });
  }
  document.getElementById('dataModal').style.display = 'none';
  await save();
};

// Eventos de Botões
document.getElementById('btnAddExpense').onclick = () => openDataModal();
document.getElementById('btnLogout').onclick = () => signOut(auth);
document.getElementById('btnSettings').onclick = () => {
    const list = document.getElementById('presetsList');
    list.innerHTML = state.presets.map(p => `
      <div class="preset-item">
        <span>${p}</span>
        <button class="remove-p" data-p="${p}">🗑️</button>
      </div>
    `).join('');
    document.getElementById('settingsModal').style.display = 'flex';
    
    document.querySelectorAll('.remove-p').forEach(b => {
      b.onclick = async () => {
        if (state.categories.some(c => c.type === b.dataset.p)) return alert("Grupo em uso!");
        state.presets = state.presets.filter(p => p !== b.dataset.p);
        await save();
        document.getElementById('btnSettings').onclick();
      }
    });
};

document.getElementById('btnCloseSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('btnCloseData').onclick = () => document.getElementById('dataModal').style.display = 'none';
document.getElementById('btnAddNewPreset').onclick = async () => {
  const val = document.getElementById('newPresetName').value.trim();
  if(val && !state.presets.includes(val)) {
    state.presets.push(val);
    document.getElementById('newPresetName').value = "";
    await save();
    document.getElementById('btnSettings').onclick();
  }
};
document.getElementById('btnReset').onclick = async () => {
  if(confirm("Apagar tudo?")) {
    state.categories = [];
    state.data = months.map(() => ({ income: 0, expenses: {} }));
    await save();
  }
};