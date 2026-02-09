/**
 * SISTEMA FINANCEIRO 2026 - VERSÃO CORRIGIDA
 */

const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const brFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
};

let state = {
    presets: ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão de Crédito", "Outros"],
    categories: [],
    data: months.map(() => ({ income: 0, expenses: {} }))
};

let currentEditId = null;
let chartInstance = null;

/* ================= UTILITÁRIOS ================= */

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function parseVal(v) {
    if (!v) return 0;
    const cleaned = v.toString().replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) || n < 0 ? 0 : Math.min(n, 999999999);
}

function formatCurrency(v) {
    return brFormatter.format(v || 0);
}

/* ================= UI ================= */

window.showLoading = () => {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'flex';
};

window.hideLoading = () => {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'none';
};

window.showToast = (msg, type = 'info') => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast toast-${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
};

/* ================= FIREBASE ================= */

window.updateStateFromFirebase = (data) => {
    state = {
        ...state,
        ...data,
        categories: data.categories || [],
        data: data.data || state.data
    };
    build();
};

window.saveToFirebase = async () => {
    if (!window.auth?.currentUser) return;
    const { doc, setDoc } = window.fbOps;
    await setDoc(
        doc(window.db, "usuarios", window.auth.currentUser.uid),
        state,
        { merge: true }
    );
};

const debouncedSave = debounce(() => window.saveToFirebase(), 1000);

function save() {
    calculate();
    debouncedSave();
}

/* ================= CÁLCULOS ================= */

function calculate() {
    let totalR = 0;
    let totalG = 0;

    months.forEach((_, i) => {
        const incEl = document.getElementById(`inc-${i}`);
        if (!incEl) return;

        const income = parseVal(incEl.value);
        state.data[i].income = income;

        let gasto = 0;

        state.categories.forEach(cat => {
            const e = document.getElementById(`e-${i}-${cat.id}`);
            if (!e) return;
            const v = parseVal(e.value);
            state.data[i].expenses[cat.id] = v;
            gasto += v;
        });

        document.getElementById(`total-${i}`).value = formatCurrency(gasto);
        document.getElementById(`saldo-${i}`).value = formatCurrency(income - gasto);
        updateUsageBar(i, income, gasto);

        totalR += income;
        totalG += gasto;
    });

    updateSummary(totalR, totalG);
}

function updateUsageBar(i, inc, g) {
    const bar = document.getElementById(`bar-${i}`);
    const txt = document.getElementById(`text-${i}`);
    if (!bar) return;

    const p = inc > 0 ? (g / inc) * 100 : 0;
    bar.style.width = Math.min(p, 100) + '%';
    bar.className = p > 100 ? 'usage-bar warning' : 'usage-bar';
    txt.textContent = p.toFixed(0) + '%';
}

function updateSummary(r, g) {
    document.getElementById('totalRenda').textContent = formatCurrency(r);
    document.getElementById('totalGasto').textContent = formatCurrency(g);
    document.getElementById('mediaSaldo').textContent = formatCurrency(r - g);
    document.getElementById('mediaPerc').textContent =
        (r > 0 ? (g / r * 100).toFixed(1) : 0) + '%';
}

/* ================= TABELA ================= */

function build() {
    const head = document.getElementById('tableHead');
    const body = document.getElementById('tableBody');
    if (!head || !body) return;

    state.categories.sort((a, b) => a.type.localeCompare(b.type));

    const groups = {};
    state.categories.forEach(c => groups[c.type] = (groups[c.type] || 0) + 1);

    buildTableHeader(head, groups);
    buildTableBody(body);
    calculate();
}

function buildTableHeader(head, groups) {
    let h1 = '<tr><th colspan="2"></th>';
    Object.keys(groups).forEach(t => {
        h1 += `<th colspan="${groups[t]}" class="group-header">${t}</th>`;
    });
    h1 += '<th colspan="3"></th></tr>';

    let h2 = '<tr><th>Mês</th><th>Renda</th>';
    state.categories.forEach(c => {
        h2 += `<th>
      <div onclick="editColumn('${c.id}')">${c.name}</div>
      <div onclick="deleteColumn('${c.id}')" style="font-size:9px;color:red">Excluir</div>
    </th>`;
    });
    h2 += '<th>Total</th><th>Saldo</th><th>%</th></tr>';

    head.innerHTML = h1 + h2;
}

function buildTableBody(body) {
    body.innerHTML = months.map((m, i) => `
    <tr>
      <td onclick="showMonthChart(${i})">${m}</td>
      <td><input id="inc-${i}" class="input" oninput="debouncedCalculate()" onblur="save()"></td>
      ${state.categories.map(c =>
        `<td><input id="e-${i}-${c.id}" class="input" oninput="debouncedCalculate()" onblur="save()"></td>`
    ).join('')}
      <td><input id="total-${i}" readonly></td>
      <td><input id="saldo-${i}" readonly></td>
      <td>
        <div class="usage-wrapper">
          <div class="usage-bar" id="bar-${i}"></div>
          <div id="text-${i}">0%</div>
        </div>
      </td>
    </tr>
  `).join('');
}

const debouncedCalculate = debounce(calculate, 300);
window.debouncedCalculate = debouncedCalculate;

/* ================= MODAL ================= */

window.addExpense = () => openDataModal();
window.editColumn = id => openDataModal(id);

window.deleteColumn = async id => {
    if (!confirm('Excluir categoria?')) return;
    state.categories = state.categories.filter(c => c.id !== id);
    state.data.forEach(m => delete m.expenses[id]);
    await window.saveToFirebase();
    build();
};

function openDataModal(id = null) {
    currentEditId = id;
    const sel = document.getElementById('inputExpenseCategory');
    sel.innerHTML = state.presets.map(p => `<option>${p}</option>`).join('');

    if (id) {
        const c = state.categories.find(x => x.id === id);
        document.getElementById('inputExpenseName').value = c.name;
        sel.value = c.type;
    } else {
        document.getElementById('inputExpenseName').value = '';
    }

    document.getElementById('dataModal').style.display = 'flex';
}

window.closeDataModal = () => {
    document.getElementById('dataModal').style.display = 'none';
    currentEditId = null;
};

async function saveExpenseData() {
    const name = inputExpenseName.value.trim();
    const type = inputExpenseCategory.value;

    if (!name) return showToast('Nome obrigatório', 'warning');
    if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== currentEditId)) {
        return showToast('Despesa duplicada', 'warning');
    }

    if (currentEditId) {
        const c = state.categories.find(c => c.id === currentEditId);
        c.name = name;
        c.type = type;
    } else {
        state.categories.push({ id: 'ex_' + Date.now(), name, type });
    }

    closeDataModal();
    await window.saveToFirebase();
    build();
}

document.getElementById('btnSaveData').onclick = saveExpenseData;

/* ================= GRÁFICO ================= */

window.showMonthChart = i => {
    if (!window.Chart) return showToast('Erro ao carregar gráfico', 'error');

    const d = state.data[i];
    const map = {};

    state.categories.forEach(c => {
        const v = d.expenses[c.id] || 0;
        if (v > 0) map[c.type] = (map[c.type] || 0) + v;
    });

    const labels = Object.keys(map);
    const data = Object.values(map);
    if (!data.length) return showToast('Nenhuma despesa', 'info');

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(categoryChart, {
        type: 'doughnut',
        data: { labels, datasets: [{ data }] }
    });

    chartModal.style.display = 'flex';
};

window.closeChartModal = () => {
    chartModal.style.display = 'none';
    if (chartInstance) chartInstance.destroy();
};
