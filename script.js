/**
 * SISTEMA FINANCEIRO 2026 - LOGICA CORE
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

// --- UTILITÁRIOS ---
function parseVal(v) {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

async function save() {
  const user = window.auth.currentUser;
  
  if (user) {
    // Se o usuário estiver logado, salva no banco de dados do Google
    await window.firebase.firestore().collection("usuarios").doc(user.uid).set(state);
    console.log("Dados salvos na nuvem!");
  } else {
    // Se não estiver logado, continua salvando no navegador
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  build();
}

// --- CÁLCULOS ---
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

    const cartaoField = document.getElementById(`total-cartao-${m}`);
    if (cartaoField) cartaoField.value = brFormatter.format(totalCartao);

    document.getElementById(`total-${m}`).value = brFormatter.format(mG);
    document.getElementById(`saldo-${m}`).value = brFormatter.format(inc - mG);
    
    const perc = inc > 0 ? (mG / inc) * 100 : 0;
    const bar = document.getElementById(`bar-${m}`);
    const label = document.getElementById(`label-${m}`);
    
    if(bar) {
      bar.style.width = Math.min(100, perc) + '%';
      bar.className = 'usage-bar ' + (perc > 85 ? 'warning' : '');
    }
    if(label) {
      label.textContent = inc > 0 ? perc.toFixed(0) + '%' : '0%';
      label.style.color = perc > 50 ? '#ffffff' : '#1e293b';
    }

    tR += inc; tG += mG; if(inc > 0 || mG > 0) mA++;
  });

  document.getElementById('totalRenda').textContent = brFormatter.format(tR);
  document.getElementById('totalGasto').textContent = brFormatter.format(tG);
  document.getElementById('mediaSaldo').textContent = brFormatter.format((tR - tG) / (mA || 1));
  document.getElementById('mediaPerc').textContent = tR > 0 ? ((tG / tR) * 100).toFixed(1) + '%' : '0%';
}

// --- RENDERIZAÇÃO ---
function build() {
  const head = document.getElementById('tableHead');
  const groups = {};
  state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

  let h1 = `<tr><th colspan="2" style="background:none; border:none"></th>`;
  Object.keys(groups).forEach(type => {
    let span = groups[type];
    if (type === "Cartão") span += 1; 
    h1 += `<th colspan="${span}" class="group-header">${type}</th>`;
  });
  h1 += `<th colspan="3" style="background:none; border:none"></th></tr>`;

  let h2 = `<tr><th>Mês</th><th>Renda</th>`;
  state.categories.forEach((c, index) => {
    h2 += `<th>
      <div style="font-weight:600; color:#334155; cursor:pointer" onclick="editColumn('${c.id}')">${c.name}</div>
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
          onblur="this.value=state.data[${m}].income?brFormatter.format(state.data[${m}].income):''"></td>
      ${state.categories.map((c, index) => {
        let html = `<td><input id="e-${m}-${c.id}" class="input" 
            value="${state.data[m].expenses[c.id] ? brFormatter.format(state.data[m].expenses[c.id]) : ''}" 
            oninput="calculate()" onfocus="this.value=state.data[${m}].expenses['${c.id}']||''" 
            onblur="this.value=state.data[${m}].expenses['${c.id}']?brFormatter.format(state.data[${m}].expenses['${c.id}']):''"></td>`;
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

// --- INTERAÇÕES ---
function addExpense() {
  const name = prompt("Nome da despesa:"); if (!name) return;
  const catMsg = PRESET_CATEGORIES.map((c, i) => `${i+1}. ${c}`).join('\n');
  const choice = prompt("Escolha a categoria (número):\n" + catMsg);
  const type = PRESET_CATEGORIES[choice - 1] || "Outros";
  state.categories.push({ id: 'ex_' + Date.now(), name, type });
  save();
}

function editColumn(id) {
  const cat = state.categories.find(c => c.id === id);
  const newName = prompt("Novo nome:", cat.name);
  if (newName) { cat.name = newName; save(); }
}

function deleteColumn(id) {
  if (confirm("Excluir esta coluna?")) { state.categories = state.categories.filter(c => c.id !== id); save(); }
}

// --- GRÁFICO ---
let myChart = null;
function openMonthChart(mIdx) {
  const mData = state.data[mIdx];
  const catTotals = {};
  let total = 0;
  state.categories.forEach(c => {
    const v = mData.expenses[c.id] || 0;
    if(v > 0) { catTotals[c.type] = (catTotals[c.type] || 0) + v; total += v; }
  });
  if(total === 0) return alert("Sem gastos registrados em " + months[mIdx]);

  document.getElementById('modalTitle').textContent = "Resumo: " + months[mIdx];
  document.getElementById('modalTotal').textContent = "Total Gasto: " + brFormatter.format(total);
  document.getElementById('chartModal').style.display = 'flex';

  const ctx = document.getElementById('categoryChart').getContext('2d');
  if(myChart) myChart.destroy();
  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catTotals),
      datasets: [{
        data: Object.values(catTotals),
        backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#334155'],
        borderWidth: 4, borderColor: '#ffffff'
      }]
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom', align: 'center', labels: { padding: 20, boxWidth: 12 } },
        tooltip: { callbacks: { label: (i) => ` ${i.label}: ${brFormatter.format(i.parsed)}` } }
      } 
    }
  });
}

function closeModal() { document.getElementById('chartModal').style.display = 'none'; }

// --- DADOS ---
function exportData() {
  const blob = new Blob([JSON.stringify(state)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `financeiro_2026.json`; a.click();
}

function importData() {
  const input = document.createElement('input'); input.type = 'file';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => { state = JSON.parse(ev.target.result); save(); };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function resetAll() { if(confirm("Deseja apagar todos os dados definitivamente?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }

window.onclick = (e) => { if(e.target.id === 'chartModal') closeModal(); }

// Inicialização
build();