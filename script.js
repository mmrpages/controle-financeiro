/**
 * SISTEMA FINANCEIRO 2026 - VERSÃO OTIMIZADA
 * Melhorias: Validação, Debounce, Tratamento de Erros, Performance
 */

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const brFormatter = new Intl.NumberFormat('pt-BR', { 
  style: 'currency', 
  currency: 'BRL' 
});

let state = {
  presets: ["Fixa", "Variável", "Lazer", "Saúde", "Moradia", "Transporte", "Cartão de Crédito", "Outros"],
  categories: [],
  data: months.map(() => ({ income: 0, expenses: {} })),
  settings: { showTotals: {} }
};

let currentEditId = null;
let chartInstance = null;

// ===== UTILITÁRIOS =====

/**
 * Debounce - Evita chamadas excessivas de funções
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Parse de valor monetário com validação
 */
function parseVal(v) {
  if (v === null || v === undefined || v === '') return 0;
  
  const cleaned = v.toString()
    .trim()
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  
  // Validação: retorna 0 se não for número ou for negativo
  if (isNaN(parsed) || parsed < 0) return 0;
  
  // Validação: limita valores muito grandes
  if (parsed > 999999999) return 999999999;
  
  return parsed;
}

/**
 * Formata valor para exibição
 */
function formatCurrency(value) {
  return brFormatter.format(value || 0);
}

// ===== UI FEEDBACK =====

window.showLoading = () => {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';
};

window.hideLoading = () => {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
};

window.showToast = (message, type = 'info') => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

// ===== SINCRONIZAÇÃO COM FIREBASE =====

window.updateStateFromFirebase = (newData) => {
  console.log('🔄 updateStateFromFirebase chamado');
  console.log('📦 Dados recebidos:', newData);
  
  try {
    state = {
      ...state,
      ...newData,
      presets: newData.presets || state.presets,
      categories: newData.categories || [],
      data: newData.data || state.data,
      settings: newData.settings || { showTotals: {} }
    };
    
    console.log('✅ State atualizado:', state);
    console.log('🏗️ Chamando build()...');
    
    build();
    
    console.log('✅ build() concluído');
    
    if (window.showToast) {
      window.showToast('Dados carregados com sucesso!', 'success');
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar state:', error);
    if (window.showToast) {
      window.showToast('Erro ao carregar dados', 'error');
    }
  }
};

window.saveToFirebase = async () => {
  if (!window.auth || !window.auth.currentUser) {
    console.warn('Usuário não autenticado - não é possível salvar');
    return;
  }
  
  try {
    const { doc, setDoc } = window.fbOps;
    await setDoc(
      doc(window.db, "usuarios", window.auth.currentUser.uid), 
      state,
      { merge: true }
    );
    console.log('Dados salvos com sucesso no Firebase');
  } catch (error) {
    console.error('Erro ao salvar no Firebase:', error);
    window.showToast('Erro ao salvar dados', 'error');
    throw error;
  }
};

// Debounced save
const debouncedSave = debounce(async () => {
  await window.saveToFirebase();
}, 1000);

async function save() {
  calculate(); // Recalcula antes de salvar
  await debouncedSave();
}

// ===== CÁLCULOS =====

function calculate() {
  let totalReceita = 0;
  let totalGasto = 0;

  months.forEach((_, monthIndex) => {
    const incomeInput = document.getElementById(`inc-${monthIndex}`);
    if (!incomeInput) return;
    
    const income = parseVal(incomeInput.value);
    state.data[monthIndex].income = income;
    
    let monthGasto = 0;

    state.categories.forEach(category => {
      const expenseInput = document.getElementById(`e-${monthIndex}-${category.id}`);
      if (!expenseInput) return;
      
      const val = parseVal(expenseInput.value);
      state.data[monthIndex].expenses[category.id] = val;
      monthGasto += val;
    });

    // Atualiza totais do mês
    const totalInput = document.getElementById(`total-${monthIndex}`);
    const saldoInput = document.getElementById(`saldo-${monthIndex}`);
    
    if (totalInput) totalInput.value = formatCurrency(monthGasto);
    if (saldoInput) saldoInput.value = formatCurrency(income - monthGasto);

    // Atualiza barra de percentual
    updateUsageBar(monthIndex, income, monthGasto);

    totalReceita += income;
    totalGasto += monthGasto;
  });

  // Atualiza resumos
  updateSummary(totalReceita, totalGasto);
}

function updateUsageBar(monthIndex, income, gasto) {
  const bar = document.getElementById(`bar-${monthIndex}`);
  const text = document.getElementById(`text-${monthIndex}`);
  if (!bar) return;
  
  const percentage = income > 0 ? (gasto / income) * 100 : 0;
  const cappedPercentage = Math.min(100, percentage);
  
  bar.style.width = cappedPercentage + '%';
  bar.className = percentage > 100 ? 'usage-bar warning' : 'usage-bar';
  
  // Atualiza o texto do percentual
  if (text) {
    text.textContent = percentage.toFixed(0) + '%';
    // Muda cor do texto se estourar o orçamento
    text.style.color = percentage > 100 ? '#991b1b' : '#1e293b';
  }
}

function updateSummary(totalReceita, totalGasto) {
  const totalRendaEl = document.getElementById('totalRenda');
  const totalGastoEl = document.getElementById('totalGasto');
  const mediaSaldoEl = document.getElementById('mediaSaldo');
  const mediaPercEl = document.getElementById('mediaPerc');
  
  if (totalRendaEl) totalRendaEl.textContent = formatCurrency(totalReceita);
  if (totalGastoEl) totalGastoEl.textContent = formatCurrency(totalGasto);
  if (mediaSaldoEl) mediaSaldoEl.textContent = formatCurrency(totalReceita - totalGasto);
  if (mediaPercEl) {
    const percentage = totalReceita > 0 ? (totalGasto / totalReceita * 100) : 0;
    mediaPercEl.textContent = percentage.toFixed(1) + '%';
  }
}

// ===== CONSTRUÇÃO DA TABELA =====

function build() {
  console.log('🏗️ build() iniciado');
  
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  
  console.log('📍 Elementos encontrados:', { head: !!head, body: !!body });
  
  if (!head || !body) {
    console.warn('⚠️ Elementos da tabela não encontrados - aguardando DOM');
    // Se os elementos não existem ainda, tenta novamente em 100ms
    setTimeout(build, 100);
    return;
  }

  console.log('📊 Categorias:', state.categories.length);
  
  // Ordena categorias por tipo
  state.categories.sort((a, b) => a.type.localeCompare(b.type));
  
  // Agrupa por tipo
  const groups = {};
  state.categories.forEach(cat => {
    groups[cat.type] = (groups[cat.type] || 0) + 1;
  });

  console.log('📁 Grupos:', groups);

  // Constrói cabeçalho
  buildTableHeader(head, groups);
  
  // Constrói corpo
  buildTableBody(body);
  
  // Calcula valores
  calculate();
  
  console.log('✅ build() concluído com sucesso');
}

function buildTableHeader(head, groups) {
  let headerRow1 = '<tr><th colspan="2" style="border:none"></th>';
  
  Object.keys(groups).forEach(type => {
    headerRow1 += `<th colspan="${groups[type]}" class="group-header">${type}</th>`;
  });
  
  headerRow1 += '</tr>';
  
  let headerRow2 = '<tr><th>Mês</th><th>Renda</th>';
  
  state.categories.forEach(cat => {
    headerRow2 += `
      <th>
        <div onclick="editColumn('${cat.id}')" style="cursor:pointer" title="Clique para editar">
          ${cat.name}
        </div>
        <div onclick="deleteColumn('${cat.id}')" style="font-size:9px; color:red; cursor:pointer" title="Excluir categoria">
          Excluir
        </div>
      </th>
    `;
  });
  
  headerRow2 += '<th>Total</th><th>Saldo</th><th>%</th></tr>';
  
  head.innerHTML = headerRow1 + headerRow2;
}

function buildTableBody(body) {
  body.innerHTML = months.map((monthName, monthIndex) => {
    const incomeValue = state.data[monthIndex].income;
    
    const expenseCells = state.categories.map(cat => {
      const expenseValue = state.data[monthIndex].expenses[cat.id];
      return `
        <td>
          <input 
            id="e-${monthIndex}-${cat.id}" 
            class="input" 
            value="${expenseValue ? formatCurrency(expenseValue) : ''}" 
            oninput="debouncedCalculate()" 
            onblur="save()"
            placeholder="R$ 0,00"
          >
        </td>
      `;
    }).join('');
    
    return `
      <tr>
        <td class="month-label" onclick="showMonthChart(${monthIndex})">${monthName}</td>
        <td>
          <input 
            id="inc-${monthIndex}" 
            class="input" 
            value="${incomeValue ? formatCurrency(incomeValue) : ''}" 
            oninput="debouncedCalculate()" 
            onblur="save()"
            placeholder="R$ 0,00"
          >
        </td>
        ${expenseCells}
        <td>
          <input id="total-${monthIndex}" class="input-readonly" readonly>
        </td>
        <td>
          <input id="saldo-${monthIndex}" class="input-readonly" readonly>
        </td>
        <td>
          <div class="usage-wrapper">
            <div class="usage-bar" id="bar-${monthIndex}"></div>
            <div class="usage-text" id="text-${monthIndex}">0%</div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Debounced calculate
const debouncedCalculate = debounce(calculate, 300);
window.debouncedCalculate = debouncedCalculate;

// ===== MODAIS =====

window.addExpense = () => {
  console.log('🆕 Botão + Despesa clicado');
  openDataModal();
};

window.editColumn = (id) => openDataModal(id);

window.deleteColumn = async (id) => {
  const category = state.categories.find(c => c.id === id);
  if (!category) return;
  
  if (confirm(`Tem certeza que deseja excluir "${category.name}"?`)) {
    try {
      window.showLoading();
      state.categories = state.categories.filter(c => c.id !== id);
      
      // Remove dados das despesas
      state.data.forEach(monthData => {
        delete monthData.expenses[id];
      });
      
      await window.saveToFirebase();
      build();
      window.showToast('Categoria excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      window.showToast('Erro ao excluir categoria', 'error');
    } finally {
      window.hideLoading();
    }
  }
};

window.closeDataModal = () => {
  document.getElementById('dataModal').style.display = 'none';
  currentEditId = null;
};

function openDataModal(id = null) {
  console.log('📝 openDataModal chamado', { id });
  
  currentEditId = id;
  const select = document.getElementById('inputExpenseCategory');
  
  if (!select) {
    console.error('❌ Select de categoria não encontrado!');
    return;
  }
  
  select.innerHTML = state.presets.map(preset => 
    `<option value="${preset}">${preset}</option>`
  ).join('');
  
  if (id) {
    const cat = state.categories.find(c => c.id === id);
    if (cat) {
      document.getElementById('inputExpenseName').value = cat.name;
      select.value = cat.type;
      document.getElementById('dataModalTitle').textContent = 'Editar Despesa';
      console.log('✏️ Modo edição:', cat);
    }
  } else {
    document.getElementById('inputExpenseName').value = '';
    document.getElementById('dataModalTitle').textContent = 'Nova Despesa';
    console.log('➕ Modo nova despesa');
  }
  
  const modal = document.getElementById('dataModal');
  if (modal) {
    modal.style.display = 'flex';
    console.log('✅ Modal aberto');
  } else {
    console.error('❌ Modal não encontrado!');
  }
}

// Salvar despesa - Função executada quando clicar no botão
async function saveExpenseData() {
  console.log('💾 saveExpenseData chamado');
  
  const name = document.getElementById('inputExpenseName').value.trim();
  const type = document.getElementById('inputExpenseCategory').value;
  
  console.log('📝 Nome:', name, '| Tipo:', type);
  
  if (!name) {
    window.showToast('Por favor, insira um nome para a despesa', 'warning');
    return;
  }
  
  if (name.length > 50) {
    window.showToast('Nome muito longo (máx. 50 caracteres)', 'warning');
    return;
  }
  
  try {
    if (window.showLoading) window.showLoading();
    
    if (currentEditId) {
      const cat = state.categories.find(c => c.id === currentEditId);
      if (cat) {
        cat.name = name;
        cat.type = type;
      }
      console.log('✏️ Despesa atualizada');
      if (window.showToast) window.showToast('Despesa atualizada!', 'success');
    } else {
      const newCategory = { 
        id: 'ex_' + Date.now(), 
        name, 
        type 
      };
      state.categories.push(newCategory);
      console.log('➕ Nova despesa criada:', newCategory);
      if (window.showToast) window.showToast('Despesa criada!', 'success');
    }
    
    window.closeDataModal();
    await window.saveToFirebase();
    build();
  } catch (error) {
    console.error('❌ Erro ao salvar despesa:', error);
    if (window.showToast) window.showToast('Erro ao salvar despesa', 'error');
  } finally {
    if (window.hideLoading) window.hideLoading();
  }
}

// Associa a função ao botão
function initSaveButton() {
  const btnSave = document.getElementById('btnSaveData');
  if (btnSave) {
    console.log('✅ Botão de salvar encontrado, associando função');
    btnSave.onclick = saveExpenseData;
  } else {
    console.warn('⚠️ Botão btnSaveData não encontrado');
  }
}

// Tenta associar o botão imediatamente e quando o DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSaveButton);
} else {
  initSaveButton();
}

// ===== RESET =====

window.resetAll = async () => {
  if (confirm('⚠️ ATENÇÃO: Isso apagará TODAS as suas categorias e dados. Esta ação não pode ser desfeita!\n\nDeseja realmente continuar?')) {
    try {
      window.showLoading();
      state.categories = [];
      state.data = months.map(() => ({ income: 0, expenses: {} }));
      await window.saveToFirebase();
      build();
      window.showToast('Todos os dados foram apagados', 'info');
    } catch (error) {
      console.error('Erro ao resetar:', error);
      window.showToast('Erro ao resetar dados', 'error');
    } finally {
      window.hideLoading();
    }
  }
};

// ===== GRÁFICO POR MÊS =====

window.showMonthChart = (monthIndex) => {
  const monthData = state.data[monthIndex];
  const monthName = months[monthIndex];
  
  // Agrupa despesas por categoria (tipo)
  const categoryTotals = {};
  
  state.categories.forEach(cat => {
    const value = monthData.expenses[cat.id] || 0;
    if (value > 0) {
      // Agrupa pelo tipo (categoria)
      if (!categoryTotals[cat.type]) {
        categoryTotals[cat.type] = 0;
      }
      categoryTotals[cat.type] += value;
    }
  });
  
  // Converte objeto em arrays para o gráfico
  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  
  if (data.length === 0) {
    window.showToast('Nenhuma despesa registrada neste mês', 'info');
    return;
  }
  
  const total = data.reduce((sum, val) => sum + val, 0);
  
  // Cores fixas por categoria para consistência
  const categoryColors = {
    'Fixa': '#0ea5e9',
    'Variável': '#8b5cf6',
    'Lazer': '#ec4899',
    'Saúde': '#10b981',
    'Moradia': '#f59e0b',
    'Transporte': '#3b82f6',
    'Cartão de Crédito': '#ef4444',
    'Outros': '#64748b'
  };
  
  const colors = labels.map(label => categoryColors[label] || getRandomColor());
  
  document.getElementById('modalTitle').textContent = `Despesas por Categoria - ${monthName}`;
  document.getElementById('modalTotal').textContent = `Total: ${formatCurrency(total)}`;
  
  const modal = document.getElementById('chartModal');
  modal.style.display = 'flex';
  
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 12,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = formatCurrency(context.parsed);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          }
        }
      }
    }
  });
          }
        }
      }
    }
  });
};

window.closeChartModal = () => {
  document.getElementById('chartModal').style.display = 'none';
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
};

function getRandomColor() {
  const colors = [
    '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', 
    '#10b981', '#ef4444', '#3b82f6', '#6366f1',
    '#14b8a6', '#f97316', '#84cc16', '#a855f7'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ===== INICIALIZAÇÃO =====

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', build);
} else {
  build();
}
