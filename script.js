/**
 * SISTEMA FINANCEIRO 2026 - VERSÃO FINAL COM GESTÃO DE GRUPOS
 */
const STORAGE_KEY = 'fin_v2026_sky_final';
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  presets: ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão de Crédito", "Outros"],
  categories: [],
  data: months.map(() => ({ income: 0, expenses: {} })),
  settings: { showTotals: {} }
};

let currentEditId = null;

// --- SINCRONIZAÇÃO ---
window.updateStateFromFirebase = (newData) => {
  state = newData;
    if (!state.presets) state.presets = ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão de Crédito", "Outros"];
  build();
};

function parseVal(v) {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

async function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (window.auth && window.auth.currentUser) {
    const { doc, setDoc } = window.fbOps;
    await setDoc(doc(window.db, "usuarios", window.auth.currentUser.uid), state);
  }
  build();
}

// --- GESTÃO DE GRUPOS ---
window.openSettingsModal = () => {
  const modal = document.getElementById('settingsModal');
  const list = document.getElementById('presetsList');
  list.innerHTML = state.presets.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
      <span style="color:#333">${p}</span>
      <button onclick="removePreset('${p}')" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem">🗑️</button>
    </div>
  `).join('');
  modal.style.display = 'flex';
};

window.closeSettingsModal = () => { document.getElementById('settingsModal').style.display = 'none'; build(); };

window.addNewPreset = async () => {
  const input = document.getElementById('newPresetName');
  const name = input.value.trim();
  if (name && !state.presets.includes(name)) {
    state.presets.push(name);
    input.value = "";
    await save();
    openSettingsModal();
  }
};

window.removePreset = async (type) => {
  if (state.categories.some(c => c.type === type)) {
    alert("Não pode excluir um grupo que possui despesas!");
    return;
  }
  if (confirm(`Remover o grupo "${type}"?`)) {
    state.presets = state.presets.filter(p => p !== type);
    await save();
    openSettingsModal();
  }
};

// --- CÁLCULOS E BARRA DE PERCENTUAL ---
function calculate() {
  let tR = 0, tG = 0;
  months.forEach((_, m) => {
    const inc = parseVal(document.getElementById(`inc-${m}`).value);
    state.data[m].income = inc;
    let mG = 0;

    state.categories.forEach(c => {
      const val = parseVal(document.getElementById(`e-${m}-${c.id}`).value);
      state.data[m].expenses[c.id] = val;
      mG += val;
    });

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);

    // Lógica da Barra de Percentual
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

// --- CONSTRUÇÃO DA TABELA ---
function build() {
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  if(!head || !body) return;

  state.categories.sort((a, b) => a.type.localeCompare(b.type));
  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2" style="border:none"></th>`;
  Object.keys(groups).forEach(type => {
    h1 += `<th colspan="${groups[type]}" class="group-header">${type}</th>`;
  });
  h1 += `</tr><tr><th>Mês</th><th>Renda</th>`;

  state.categories.forEach(c => {
    h1 += `<th><div onclick="editColumn('${c.id}')" style="cursor:pointer">${c.name}</div><div onclick="deleteColumn('${c.id}')" style="font-size:9px; color:red; cursor:pointer">Excluir</div></th>`;
  });
  h1 += `<th>Total</th><th>Saldo</th><th>%</th></tr>`;
  head.innerHTML = h1;

  body.innerHTML = months.map((n, m) => `
    <tr>
      <td class="month-label">${n}</td>
      <td><input id="inc-${m}" class="input" value="${state.data[m].income ? brFormatter.format(state.data[m].income) : ''}" oninput="calculate()" onblur="save()"></td>
      ${state.categories.map(c => `<td><input id="e-${m}-${c.id}" class="input" value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}" oninput="calculate()" onblur="save()"></td>`).join('')}
      <td><input id="total-${m}" class="input-readonly" readonly></td>
      <td><input id="saldo-${m}" class="input-readonly" readonly></td>
      <td><div class="usage-wrapper"><div class="usage-bar" id="bar-${m}"></div></div></td>
    </tr>`).join('');
  calculate();
}

// --- MODAIS ---
window.addExpense = () => openDataModal();
window.editColumn = (id) => openDataModal(id);
window.deleteColumn = async (id) => { if(confirm("Excluir?")) { state.categories = state.categories.filter(c => c.id !== id); await save(); } };
window.closeDataModal = () => document.getElementById('dataModal').style.display = 'none';

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
  window.closeDataModal();
  await save();
};

window.resetAll = async () => { if(confirm("Apagar tudo?")) { state.categories = []; await save(); } };

build();