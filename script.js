/**
 * SISTEMA FINANCEIRO 2026 - LOGICA COM TOTAIS DINÂMICOS
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
  data: months.map(() => ({ income: 0, expenses: {} })),
  settings: { showTotals: { "Cartão": true } } // Configuração inicial
};

let currentEditId = null; 
let myChart = null; 

// --- SINCRONIZAÇÃO ---
window.updateStateFromFirebase = (newData) => {
  state = newData;
  if (!state.settings) state.settings = { showTotals: { "Cartão": true } };
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

// --- MODAIS DE DADOS ---
function setupCategorySelect() {
  const select = document.getElementById('inputExpenseCategory');
  if (select) select.innerHTML = PRESET_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function openDataModal(id = null) {
  currentEditId = id;
  setupCategorySelect();
  const modal = document.getElementById('dataModal');
  const nameInput = document.getElementById('inputExpenseName');
  const catSelect = document.getElementById('inputExpenseCategory');

  if (id) {
    const cat = state.categories.find(c => c.id === id);
    document.getElementById('dataModalTitle').innerText = "Editar Coluna";
    nameInput.value = cat.name;
    catSelect.value = cat.type;
  } else {
    document.getElementById('dataModalTitle').innerText = "Nova Despesa";
    nameInput.value = "";
    catSelect.selectedIndex = 0;
  }
  modal.style.display = 'flex';
  document.getElementById('btnSaveData').onclick = processDataModal;
}

function closeDataModal() { document.getElementById('dataModal').style.display = 'none'; }

async function processDataModal() {
  const name = document.getElementById('inputExpenseName').value.trim();
  const type = document.getElementById('inputExpenseCategory').value;
  if (!name) return alert("Insira um nome.");

  if (currentEditId) {
    const cat = state.categories.find(c => c.id === currentEditId);
    cat.name = name; cat.type = type;
  } else {
    state.categories.push({ id: 'ex_' + Date.now(), name, type });
  }
  closeDataModal();
  await save();
}

// --- MODAL DE CONFIGURAÇÃO DE TOTAIS ---
function toggleTotalsMenu() {
  const modal = document.getElementById('totalsModal');
  const list = document.getElementById('totalsOptionsList');
  const types = [...new Set(state.categories.map(c => c.type))];
  
  list.innerHTML = types.map(type => `
    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px; font-size: 14px;">
      <input type="checkbox" id="chk-${type}" ${state.settings.showTotals[type] ? 'checked' : ''} 
             onchange="updateTotalVisibility('${type}', this.checked)">
      <label for="chk-${type}" style="cursor:pointer">Exibir total de <b>${type}</b></label>
    </div>
  `).join('');
  
  modal.style.display = 'flex';
}

async function updateTotalVisibility(type, isVisible) {
  state.settings.showTotals[type] = isVisible;
  await save();
}

function closeTotalsModal() {
  document.getElementById('totalsModal').style.display = 'none';
  build();
}

// --- GRÁFICOS ---

function openMonthChart(m) {
  const modal = document.getElementById('chartModal');
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  modal.style.display = 'flex';
  document.getElementById('modalTitle').innerText = `Resumo por Categoria: ${months[m]}`;

  // Consolidação por TIPO (Ex: Soma tudo que é "Moradia" em um único item)
  const typeTotals = {};
  state.categories.forEach(c => {
    const val = state.data[m].expenses[c.id] || 0;
    if (val > 0) {
      typeTotals[c.type] = (typeTotals[c.type] || 0) + val;
    }
  });

  const labels = Object.keys(typeTotals);
  const values = Object.values(typeTotals);
  const totalGeral = values.reduce((a, b) => a + b, 0);

  document.getElementById('modalTotal').innerText = totalGeral > 0 ? `Total: ${brFormatter.format(totalGeral)}` : "Sem gastos.";

  if (myChart) myChart.destroy();
  if (totalGeral > 0) {
    myChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#334155'],
          borderWidth: 2, borderColor: '#ffffff'
        }]
      },
      options: { 
        responsive: true, maintainAspectRatio: false, 
        plugins: { 
          legend: { position: 'bottom', labels: {
            generateLabels: (chart) => chart.data.labels.map((label, i) => ({
              text: `${label}: ${brFormatter.format(chart.data.datasets[0].data[i])}`,
              fillStyle: chart.data.datasets[0].backgroundColor[i], index: i
            }))
          }},
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${brFormatter.format(ctx.parsed)}` }}
        } 
      }
    });
  }
}

function closeModal() { document.getElementById('chartModal').style.display = 'none'; }

// --- CÁLCULOS E CONSTRUÇÃO DA TABELA ---
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

    // Atualiza colunas de totais de grupo se estiverem visíveis
    Object.keys(typeSums).forEach(type => {
      const el = document.getElementById(`total-group-${type}-${m}`);
      if (el) el.value = brFormatter.format(typeSums[type]);
    });

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);
    const perc = inc > 0 ? (mG / inc) * 100 : 0;
    const bar = document.getElementById(`bar-${m}`);
    if(bar) { bar.style.width = Math.min(100, perc) + '%'; bar.className = perc > 100 ? 'usage-bar warning' : 'usage-bar'; }
    if(document.getElementById(`label-${m}`)) document.getElementById(`label-${m}`).textContent = perc.toFixed(0) + '%';
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
  if(!state.settings) state.settings = { showTotals: {} };

  // 1. Agrupar categorias por tipo para calcular o span correto
  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2" style="background:none; border:none">
    <button class="btn" style="font-size:10px; padding:4px 8px" onclick="toggleTotalsMenu()">⚙️ Totais</button>
  </th>`;
  
  Object.keys(groups).forEach(type => {
    let span = groups[type];
    // Adiciona +1 ao span se o total daquela categoria estiver ativo
    if (state.settings.showTotals[type]) span += 1; 
    h1 += `<th colspan="${span}" class="group-header">${type}</th>`;
  });
  h1 += `</tr>`;

  let h2 = `<tr><th>Mês</th><th>Renda</th>`;
  state.categories.forEach((c, index) => {
    // Renderiza a coluna do item individual
    h2 += `<th>
      <div style="font-weight:600; cursor:pointer" onclick="editColumn('${c.id}')">${c.name}</div>
      <div style="font-size:9px; color:var(--danger); cursor:pointer" onclick="deleteColumn('${c.id}')">Excluir</div>
    </th>`;
    
    // VERIFICAÇÃO: Só insere a coluna de Total se for o ÚLTIMO item deste tipo
    const nextCat = state.categories[index + 1];
    if ((!nextCat || nextCat.type !== c.type) && state.settings.showTotals[c.type]) {
      h2 += `<th style="background: rgba(239, 68, 68, 0.05); color: var(--danger)">Total ${c.type}</th>`;
    }
  });
  h2 += `<th>Total Geral</th><th>Saldo Livre</th><th>Uso (%)</th></tr>`;
  head.innerHTML = h1 + h2;

  // Renderização do Corpo da Tabela
  document.getElementById('tableBody').innerHTML = months.map((n, m) => `
    <tr>
      <td><span class="month-label" onclick="openMonthChart(${m})">${n}</span></td>
      <td><input id="inc-${m}" class="input" style="color:#7c3aed; font-weight:bold" 
          value="${state.data[m].income ? brFormatter.format(state.data[m].income) : ''}" 
          oninput="calculate()" onfocus="this.value=state.data[${m}].income||''" onblur="save()"></td>
      ${state.categories.map((c, index) => {
        let html = `<td><input id="e-${m}-${c.id}" class="input" 
                    value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}" 
                    oninput="calculate()" onfocus="this.value=state.data[${m}].expenses['${c.id}']||''" onblur="save()"></td>`;
        
        const nextCat = state.categories[index + 1];
        // Insere a célula de valor total apenas no final do grupo
        if ((!nextCat || nextCat.type !== c.type) && state.settings.showTotals[c.type]) {
          html += `<td><input id="total-group-${c.type}-${m}" class="input input-readonly" style="font-weight:bold; color:var(--danger)" readonly></td>`;
        }
        return html;
      }).join('')}
      <td><input id="total-${m}" class="input input-readonly" style="color:var(--danger)" readonly></td>
      <td><input id="saldo-${m}" class="input input-readonly" style="color:var(--success)" readonly></td>
      <td><div class="usage-wrapper"><div class="usage-bar" id="bar-${m}"></div><div class="usage-text" id="label-${m}">0%</div></div></td>
    </tr>`).join('');
  calculate();
}

function addExpense() { openDataModal(); }
function editColumn(id) { openDataModal(id); }
async function deleteColumn(id) { if (confirm("Excluir coluna?")) { state.categories = state.categories.filter(c => c.id !== id); await save(); } }
async function resetAll() { if (confirm("Resetar tudo?")) { state.categories = [{ id: 'c1', name: 'Aluguel', type: 'Moradia' }, { id: 'c2', name: 'Alimentação', type: 'Variável' }]; state.data = months.map(() => ({ income: 0, expenses: {} })); state.settings = { showTotals: {} }; localStorage.removeItem(STORAGE_KEY); await save(); } }

build();