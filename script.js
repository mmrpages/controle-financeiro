/**
 * SISTEMA FINANCEIRO 2026 - GESTÃO DE GRUPOS DINÂMICOS
 */
const STORAGE_KEY = 'fin_v2026_sky_final';
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// O 'state' agora guarda a lista de grupos (presets)
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  presets: ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão", "Outros"],
  categories: [],
  data: months.map(() => ({ income: 0, expenses: {} })),
  settings: { showTotals: {} }
};

let currentEditId = null;
let myChart = null;

// --- SINCRONIZAÇÃO ---
window.updateStateFromFirebase = (newData) => {
  state = newData;
  if (!state.presets) state.presets = ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão", "Outros"];
  if (!state.settings) state.settings = { showTotals: {} };
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

// --- GESTÃO DE GRUPOS (NOVO) ---

window.openSettingsModal = () => {
  const modal = document.getElementById('settingsModal');
  const list = document.getElementById('presetsList');
  
  // Renderiza a lista de grupos atuais com botão de excluir
  list.innerHTML = state.presets.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee; color: #333;">
      <span>${p}</span>
      <button onclick="removePreset('${p}')" style="background:none; border:none; color:red; cursor:pointer; font-size: 1.2rem;">🗑️</button>
    </div>
  `).join('');
  
  modal.style.display = 'flex';
};

window.closeSettingsModal = () => {
  document.getElementById('settingsModal').style.display = 'none';
  build();
};

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
  const inUse = state.categories.some(c => c.type === type);
  if (inUse) {
    alert(`O grupo "${type}" está em uso. Mude as despesas de grupo antes de o excluir.`);
    return;
  }
  
  if (confirm(`Deseja apagar o grupo "${type}"?`)) {
    state.presets = state.presets.filter(p => p !== type);
    await save();
    openSettingsModal();
  }
};

// --- MODAL DE DESPESAS ---

function openDataModal(id = null) {
  currentEditId = id;
  const modal = document.getElementById('dataModal');
  const select = document.getElementById('inputExpenseCategory');
  const inputName = document.getElementById('inputExpenseName');
  
  // Popula o select com os grupos do state
  select.innerHTML = state.presets.map(p => `<option value="${p}">${p}</option>`).join('');

  if (id) {
    const cat = state.categories.find(c => c.id === id);
    inputName.value = cat.name;
    select.value = cat.type;
  } else {
    inputName.value = "";
  }
  
  modal.style.display = 'flex';

  document.getElementById('btnSaveData').onclick = async () => {
    const name = inputName.value.trim();
    const type = select.value;

    if (!name) return;

    if (currentEditId) {
      const cat = state.categories.find(c => c.id === currentEditId);
      cat.name = name; cat.type = type;
    } else {
      state.categories.push({ id: 'ex_' + Date.now(), name, type });
    }
    
    closeDataModal();
    await save();
  };
}

// --- CÁLCULOS E TABELA ---

function calculate() {
  let tR = 0, tG = 0, mA = 0;
  months.forEach((_, m) => {
    const inc = parseVal(document.getElementById(`inc-${m}`).value);
    state.data[m].income = inc;
    let mG = 0;
    const typeSums = {};

    state.categories.forEach(c => {
      const val = parseVal(document.getElementById(`e-${m}-${c.id}`).value);
      state.data[m].expenses[c.id] = val;
      mG += val;
      typeSums[c.type] = (typeSums[c.type] || 0) + val;
    });

    Object.keys(typeSums).forEach(type => {
      const el = document.getElementById(`total-group-${type}-${m}`);
      if (el) el.value = brFormatter.format(typeSums[type]);
    });

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);
    const perc = inc > 0 ? (mG / inc) * 100 : 0;
    const bar = document.getElementById(`bar-${m}`);
    if(bar) bar.style.width = Math.min(100, perc) + '%';
    tR += inc; tG += mG; if(inc > 0 || mG > 0) mA++;
  });
  document.getElementById('totalRenda').textContent = brFormatter.format(tR);
  document.getElementById('totalGasto').textContent = brFormatter.format(tG);
}

function build() {
  const head = document.getElementById('tableHead');
  if(!head) return;

  state.categories.sort((a, b) => a.type.localeCompare(b.type));

  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2" style="border:none"></th>`;
  Object.keys(groups).forEach(type => {
    let span = groups[type] + (state.settings.showTotals[type] ? 1 : 0);
    h1 += `<th colspan="${span}" class="group-header">${type}</th>`;
  });
  h1 += `</tr><tr><th>Mês</th><th>Renda</th>`;

  state.categories.forEach((c, index) => {
    h1 += `<th><div onclick="editColumn('${c.id}')" style="cursor:pointer">${c.name}</div><div class="delete-btn" onclick="deleteColumn('${c.id}')" style="font-size:9px; color:red; cursor:pointer">Excluir</div></th>`;
    const next = state.categories[index + 1];
    if ((!next || next.type !== c.type) && state.settings.showTotals[c.type]) {
      h1 += `<th class="total-col">Total ${c.type}</th>`;
    }
  });
  h1 += `<th>Total Geral</th><th>Saldo</th><th>%</th></tr>`;
  head.innerHTML = h1;

  document.getElementById('tableBody').innerHTML = months.map((n, m) => `
    <tr>
      <td>${n}</td>
      <td><input id="inc-${m}" class="input" value="${state.data[m].income ? brFormatter.format(state.data[m].income) : ''}" oninput="calculate()" onblur="save()"></td>
      ${state.categories.map((c, index) => {
        let html = `<td><input id="e-${m}-${c.id}" class="input" value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}" oninput="calculate()" onblur="save()"></td>`;
        const next = state.categories[index + 1];
        if ((!next || next.type !== c.type) && state.settings.showTotals[c.type]) {
          html += `<td><input id="total-group-${c.type}-${m}" class="input-readonly" readonly></td>`;
        }
        return html;
      }).join('')}
      <td><input id="total-${m}" class="input-readonly" readonly></td>
      <td><input id="saldo-${m}" class="input-readonly" readonly></td>
      <td><div class="usage-bar" id="bar-${m}"></div></td>
    </tr>`).join('');
  calculate();
}

// Funções de Modal e UI
window.closeDataModal = () => { document.getElementById('dataModal').style.display = 'none'; };
window.addExpense = () => { openDataModal(); };
window.editColumn = (id) => { openDataModal(id); };
window.deleteColumn = async (id) => { if (confirm("Excluir esta coluna?")) { state.categories = state.categories.filter(c => c.id !== id); await save(); } };
window.resetAll = async () => { if (confirm("Limpar todos os dados?")) { state.categories = []; state.presets = ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão", "Outros"]; state.data = months.map(() => ({ income: 0, expenses: {} })); await save(); } };

build();