/**
 * SISTEMA DE ATIVAÇÃO MANUAL PREMIUM
 * Permite ativar premium usando um código/ID fornecido pelo cliente
 */

// ===== INTERFACE DE ATIVAÇÃO MANUAL =====

/**
 * Abre modal para inserir código de ativação
 */
window.openActivationModal = function() {
    const modal = document.getElementById('activationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('activationCode').value = '';
        document.getElementById('activationCode').focus();
    }
};

/**
 * Fecha modal de ativação
 */
window.closeActivationModal = function() {
    const modal = document.getElementById('activationModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

/**
 * Processa o código de ativação inserido pelo usuário
 */
window.activatePremiumWithCode = async function() {
    const codeInput = document.getElementById('activationCode');
    const code = codeInput.value.trim();

    if (!code) {
        showToast('⚠️ Por favor, insira um código de ativação', 'warning');
        return;
    }

    try {
        showLoading();
        console.log('🔑 Tentando ativar com código:', code);

        // Valida o código no Firebase
        const isValid = await validateActivationCode(code);

        if (isValid.valid) {
            // Ativa o premium
            state.isPremium = true;
            state.paymentId = isValid.paymentId || code;
            state.premiumActivatedAt = new Date().toISOString();
            state.activationMethod = 'manual_code';
            state.activationCode = code;

            // Salva no Firebase
            await window.saveToFirebase();
            
            // Marca o código como usado (opcional)
            await markCodeAsUsed(code);

            // Atualiza UI
            updatePremiumUI();
            closeActivationModal();
            
            showToast('✅ Premium ativado com sucesso!', 'success');
            console.log('✅ Premium ativado via código:', code);
        } else {
            showToast(`❌ Código inválido: ${isValid.reason}`, 'error');
            console.error('❌ Código inválido:', isValid.reason);
        }
    } catch (error) {
        console.error('❌ Erro ao ativar premium:', error);
        showToast('❌ Erro ao processar código de ativação', 'error');
    } finally {
        hideLoading();
    }
};

// ===== VALIDAÇÃO DE CÓDIGOS =====

/**
 * Valida código de ativação no Firebase
 * @param {string} code - Código fornecido pelo cliente
 * @returns {Promise<{valid: boolean, reason?: string, paymentId?: string}>}
 */
async function validateActivationCode(code) {
    if (!code || code.length < 6) {
        return { valid: false, reason: 'Código muito curto' };
    }

    try {
        // Verifica se Firebase está inicializado
        const { doc, getDoc } = window.fbOps || {};
        if (!doc || !getDoc || !window.db) {
            return { valid: false, reason: 'Firebase não inicializado' };
        }

        // OPÇÃO 1: Verificar na coleção 'activation_codes'
        const codeRef = doc(window.db, "activation_codes", code);
        const codeDoc = await getDoc(codeRef);

        if (codeDoc.exists()) {
            const codeData = codeDoc.data();
            console.log('📋 Dados do código:', codeData);

            // Verifica se o código está ativo e não foi usado
            if (!codeData.active) {
                return { valid: false, reason: 'Código desativado' };
            }

            if (codeData.used) {
                return { valid: false, reason: 'Código já utilizado' };
            }

            // Verifica validade (se tiver data de expiração)
            if (codeData.expiresAt) {
                const expiryDate = codeData.expiresAt.toDate ? codeData.expiresAt.toDate() : new Date(codeData.expiresAt);
                if (expiryDate < new Date()) {
                    return { valid: false, reason: 'Código expirado' };
                }
            }

            // Código válido!
            return { 
                valid: true, 
                paymentId: codeData.paymentId || code,
                codeData: codeData
            };
        }

        // OPÇÃO 2: Verificar na coleção 'payments' diretamente
        // (se o cliente fornece o paymentId como código)
        const paymentRef = doc(window.db, "payments", code);
        const paymentDoc = await getDoc(paymentRef);

        if (paymentDoc.exists()) {
            const paymentData = paymentDoc.data();
            
            if (paymentData.status === 'approved' && paymentData.active) {
                return { 
                    valid: true, 
                    paymentId: code 
                };
            }
        }

        return { valid: false, reason: 'Código não encontrado' };
    } catch (error) {
        console.error('❌ Erro ao validar código:', error);
        return { valid: false, reason: 'Erro na validação' };
    }
}

/**
 * Marca código como usado no Firebase
 * @param {string} code - Código a ser marcado
 */
async function markCodeAsUsed(code) {
    try {
        const { doc, updateDoc } = window.fbOps || {};
        if (!doc || !updateDoc || !window.db) {
            console.warn('Firebase não disponível para marcar código');
            return;
        }

        const codeRef = doc(window.db, "activation_codes", code);
        await updateDoc(codeRef, {
            used: true,
            usedAt: new Date(),
            usedBy: window.auth?.currentUser?.uid || 'unknown',
            updatedAt: new Date()
        });

        console.log('✅ Código marcado como usado:', code);
    } catch (error) {
        console.error('⚠️ Erro ao marcar código como usado:', error);
        // Não bloqueia a ativação se falhar
    }
}

// ===== VALIDAÇÃO COM BACKEND =====

/**
 * Valida código via função do backend (mais seguro)
 * @param {string} code - Código a validar
 */
async function validateCodeViaBackend(code) {
    try {
        const response = await fetch(
            `https://validatecode-a3w2rajv7a-uc.a.run.app?code=${encodeURIComponent(code)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ Erro ao validar no backend:', error);
        return { valid: false, reason: 'Erro de conexão' };
    }
}

// ===== GERAÇÃO DE CÓDIGOS (ADMIN) =====

/**
 * Função administrativa para gerar códigos de ativação
 * Executar via console ou painel admin
 */
window.generateActivationCode = async function(options = {}) {
    const {
        prefix = 'PREM',
        length = 8,
        expiresInDays = 30,
        maxUses = 1
    } = options;

    try {
        showLoading();

        // Gera código aleatório
        const randomPart = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
        const code = `${prefix}-${randomPart}`;

        console.log('🎫 Gerando código:', code);

        // Salva no Firebase
        const { doc, setDoc } = window.fbOps || {};
        if (!doc || !setDoc || !window.db) {
            throw new Error('Firebase não inicializado');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await setDoc(doc(window.db, "activation_codes", code), {
            code: code,
            active: true,
            used: false,
            maxUses: maxUses,
            currentUses: 0,
            createdAt: new Date(),
            expiresAt: expiresAt,
            createdBy: window.auth?.currentUser?.uid || 'admin',
            type: 'manual'
        });

        console.log('✅ Código criado com sucesso!');
        alert(`✅ Código gerado:\n\n${code}\n\nExpira em: ${expiresAt.toLocaleDateString()}`);
        
        return code;
    } catch (error) {
        console.error('❌ Erro ao gerar código:', error);
        alert('❌ Erro ao gerar código: ' + error.message);
    } finally {
        hideLoading();
    }
};

// ===== FUNÇÕES DE VERIFICAÇÃO =====

/**
 * Verifica se um código está disponível
 */
window.checkCodeStatus = async function(code) {
    try {
        showLoading();
        const result = await validateActivationCode(code);
        
        const status = result.valid ? 
            `✅ Código VÁLIDO\n${JSON.stringify(result, null, 2)}` :
            `❌ Código INVÁLIDO\nMotivo: ${result.reason}`;
        
        alert(status);
        console.log('Status do código:', result);
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao verificar código');
    } finally {
        hideLoading();
    }
};

/**
 * Lista todos os códigos ativos (admin)
 */
window.listActivationCodes = async function() {
    try {
        showLoading();
        
        const { collection, query, where, getDocs } = window.fbOps || {};
        if (!collection || !query || !where || !getDocs || !window.db) {
            throw new Error('Firebase não inicializado');
        }

        const codesRef = collection(window.db, "activation_codes");
        const q = query(codesRef, where("active", "==", true));
        const snapshot = await getDocs(q);

        const codes = [];
        snapshot.forEach(doc => {
            codes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.table(codes);
        alert(`📋 Total de códigos ativos: ${codes.length}\nVerifique o console para detalhes`);
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao listar códigos');
    } finally {
        hideLoading();
    }
};

// ===== CÓDIGOS ESPECIAIS =====

/**
 * Sistema de códigos permanentes (admin/vip)
 */
const SPECIAL_CODES = {
    'ADMIN-MASTER': { permanent: true, description: 'Acesso administrativo' },
    'VIP-2026': { permanent: true, description: 'Cliente VIP' },
    'TESTPREMIUM': { permanent: false, description: 'Código de teste', expiresInDays: 7 }
};

/**
 * Valida códigos especiais hardcoded
 */
function validateSpecialCode(code) {
    const specialCode = SPECIAL_CODES[code.toUpperCase()];
    
    if (specialCode) {
        console.log('🌟 Código especial detectado:', specialCode);
        return {
            valid: true,
            paymentId: `special_${code}`,
            isSpecial: true,
            ...specialCode
        };
    }
    
    return null;
}

// Integrar validação de códigos especiais
const originalValidateActivationCode = validateActivationCode;
validateActivationCode = async function(code) {
    // Primeiro verifica códigos especiais
    const specialCheck = validateSpecialCode(code);
    if (specialCheck) {
        return specialCheck;
    }
    
    // Senão, valida normalmente
    return await originalValidateActivationCode(code);
};

// ===== ATALHOS DE TECLADO =====

// Ctrl + Shift + A para abrir ativação manual
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        openActivationModal();
    }
});

// Enter no input de código
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('activationCode');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                activatePremiumWithCode();
            }
        });
    }
});

console.log('✅ Sistema de ativação manual carregado');
console.log('💡 Use: openActivationModal() ou Ctrl+Shift+A');
