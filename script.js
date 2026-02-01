/**
 * SISTEMA FINANCEIRO 2026 - LOGICA ATUALIZADA E AJUSTADA
 */
const STORAGE_KEY = 'fin_v2026_sky_final';
const PRESET_CATEGORIES = ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão", "Outros"];
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  categories: [
    { id: 'c1', name: 'Aluguel', type: 'Moradia' },
    { id: 'c2', name: 'Alimentação', type: 'Variável' }
  ],
  data: months.map(() => ({ income: 0, expenses: {} }))
};

let currentEditId = null; 

// --- INICIALIZAÇÃO E SINCRONIZAÇÃO ---

window.updateStateFromFirebase = (newData) => {
  state = newData;
  build();
};

function parseVal(v) {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

async function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  
  if (window.auth && window.auth.currentUser) {
    try {
      const user = window.auth.currentUser;
      const { doc, setDoc } = window.fbOps;
      await setDoc(doc(window.db, "usuarios", user.uid), state);
      console.log("✅ Sincronizado com Firebase");
    } catch (e) {
      console.error("❌ Erro ao salvar na nuvem:", e);
    }
  }
  build();
}

// --- MODAL DE ENTRADA (MODERNIZAÇÃO) ---

function setupCategorySelect() {
  const select = document.getElementById('inputExpenseCategory');
  if (!select) return;
  // Preenche o select com as categorias pré-definidas
  select.innerHTML = PRESET_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function openDataModal(id = null) {
  currentEditId = id;
  const modal = document.getElementById('dataModal');
  const title = document.getElementById('dataModalTitle');
  const nameInput = document.getElementById('inputExpenseName');
  const catSelect = document.getElementById('inputExpenseCategory');

  setupCategorySelect();

  if (id) {
    const cat = state.categories.find(c => c.id === id);
    title.innerText = "Editar Coluna";
    nameInput.value = cat.name;
    catSelect.value = cat.type;
  } else {
    title.innerText = "Nova Despesa";
    nameInput.value = "";
    catSelect.selectedIndex = 0;
  }

  modal.style.display = 'flex';
  document.getElementById('btnSaveData').onclick = processDataModal;
}

function closeDataModal() {
  document.getElementById('dataModal').style.display = 'none';
}

async function processDataModal() {
  const name = document.getElementById('inputExpenseName').value.trim();
  const type = document.getElementById('inputExpenseCategory').value;

  if (!name) {
    alert("Por favor, insira um nome para a despesa.");
    return;
  }

  if (currentEditId) {
    const cat = state.categories.find(c => c.id === currentEditId);
    cat.name = name;
    cat.type = type;
  } else {
    state.categories.push({ id: 'ex_' + Date.now(), name, type });
  }

  closeDataModal();
  await save();
}

// Funções chamadas pelos botões da interface para abrir o modal em vez do prompt
function addExpense() { openDataModal(); }
function editColumn(id) { openDataModal(id); }

// --- LÓGICA DE TABELA E CÁLCULOS ---

function calculate() {
  let tR = 0, tG = 0, mA = 0;
  months.forEach((_, m) => {
    const inc = parseVal(document.getElementById(`inc-${m}`).value);
    state.data[m].income = inc;
    
    let mG = 0;
    let totalCartao = 0;
    
    state.categories.forEach(c => {
      const val = parseVal(document.getElementById(`e-${m}-${c.id}`).value);
      state.data[m].expenses[c.id] = val;
      mG += val;
      if (c.type === "Cartão") totalCartao += val;
    });

    if (document.getElementById(`total-cartao-${m}`)) 
      document.getElementById(`total-cartao-${m}`).value = brFormatter.format(totalCartao);

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);
    
    const perc = inc > 0 ? (mG / inc) * 100 : 0;
    const bar = document.getElementById(`bar-${m}`);
    const label = document.getElementById(`label-${m}`);
    
    if(bar) {
        bar.style.width = Math.min(100, perc) + '%';
        bar.className = perc > 100 ? 'usage-bar warning' : 'usage-bar';
    }
    if(label) label.textContent = perc.toFixed(0) + '%';

    tR += inc; tG += mG; if(inc > 0 || mG > 0) mA++;
  });

  document.getElementById('totalRenda').textContent = brFormatter.format(tR);
  document.getElementById('totalGasto').textContent = brFormatter.format(tG);
  document.getElementById('mediaSaldo').textContent = brFormatter.format((tR - tG) / (mA || 1));
  document.getElementById('mediaPerc').textContent = tR > 0 ? ((tG / tR) * 100).toFixed(1) + '%' : '0%';
}

function build() {
  const head = document.getElementById('tableHead');
  if(!head) return;

  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2" style="background:none; border:none"></th>`;
  Object.keys(groups).forEach(type => {
    let span = groups[type];
    if (type === "Cartão") span += 1; 
    h1 += `<th colspan="${span}" class="group-header">${type}</th>`;
  });
  h1 += `</tr>`;

  let h2 = `<tr><th>Mês</th><th>Renda</th>`;
  state.categories.forEach((c, index) => {
    h2 += `<th>
      <div style="font-weight:600; cursor:pointer" onclick="editColumn('${c.id}')">${c.name}</div>
      <div style="font-size:9px; color:var(--danger); cursor:pointer" onclick="deleteColumn('${c.id}')">Excluir</div>
    </th>`;
    const nextCat = state.categories[index + 1];
    if (c.type === "Cartão" && (!nextCat || nextCat.type !== "Cartão")) {
      h2 += `<th style="background: var(--card-sum-bg); color: var(--danger)">Total Cartão</th>`;
    }
  });
  h2 += `<th>Total Geral</th><th>Saldo Livre</th><th>Uso (%)</th></tr>`;
  head.innerHTML = h1 + h2;

  const body = document.getElementById('tableBody');
  body.innerHTML = months.map((n, m) => `
    <tr>
      <td><span class="month-label" onclick="openMonthChart(${m})">${n}</span></td>
      <td><input id="inc-${m}" class="input" style="color:#7c3aed; font-weight:bold" 
          value="${state.data[m].income ? brFormatter.format(state.data[m].income) : ''}" 
          oninput="calculate()" onfocus="this.value=state.data[${m}].income||''" 
          onblur="save()"></td>
      ${state.categories.map((c, index) => {
        let html = `<td><input id="e-${m}-${c.id}" class="input" 
            value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}" 
            oninput="calculate()" onfocus="this.value=state.data[${m}].expenses['${c.id}']||''" 
            onblur="save()"></td>`;
        const nextCat = state.categories[index + 1];
        if (c.type === "Cartão" && (!nextCat || nextCat.type !== "Cartão")) {
          html += `<td><input id="total-cartao-${m}" class="input input-readonly input-total-cartao" readonly></td>`;
        }
        return html;
      }).join('')}
      <td><input id="total-${m}" class="input input-readonly" style="color:var(--danger)" readonly></td>
      <td><input id="saldo-${m}" class="input input-readonly" style="color:var(--success)" readonly></td>
      <td>
        <div class="usage-wrapper">
          <div class="usage-bar" id="bar-${m}"></div>
          <div class="usage-text" id="label-${m}">0%</div>
        </div>
      </td>
    </tr>
  `).join('');
  calculate();
}

// --- OUTRAS AÇÕES ---

async function deleteColumn(id) {
  if (confirm("Deseja realmente excluir esta coluna de despesa?")) { 
    state.categories = state.categories.filter(c => c.id !== id); 
    await save(); 
  }
}

async function resetAll() {
  if (confirm("ATENÇÃO: Isso apagará TODOS os seus dados salvos neste navegador e na nuvem. Deseja continuar?")) {
    state = {
      categories: [
        { id: 'c1', name: 'Aluguel', type: 'Moradia' },
        { id: 'c2', name: 'Alimentação', type: 'Variável' }
      ],
      data: months.map(() => ({ income: 0, expenses: {} }))
    };
    localStorage.removeItem(STORAGE_KEY);
    if (window.auth && window.auth.currentUser) {
      const { doc, setDoc } = window.fbOps;
      await setDoc(doc(window.db, "usuarios", window.auth.currentUser.uid), state);
    }
    build();
    alert("Sistema reiniciado com sucesso!");
  }
}

// Inicializa a tabela ao carregar
build();