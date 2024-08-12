// Função para verificar se o usuário está logado
function checkLogin() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
    }
}

// Função para logout
function logout() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
}

// Função para formatar valor em Real brasileiro
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para gerar código do produto
function generateProductCode(category) {
    let categoryCounts = JSON.parse(localStorage.getItem('categoryCounts')) || {};
    const categoryCode = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 3);
    
    if (!categoryCounts[categoryCode]) {
        categoryCounts[categoryCode] = 0;
    }
    
    categoryCounts[categoryCode]++;
    
    const sequentialNumber = categoryCounts[categoryCode].toString().padStart(4, '0');
    localStorage.setItem('categoryCounts', JSON.stringify(categoryCounts));
    return `${categoryCode}${sequentialNumber}`;
}

// Função para salvar dados no localStorage
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Função para carregar dados do localStorage
function loadFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Função para adicionar event listeners comuns
function addCommonEventListeners() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    addCommonEventListeners();
});

// Função para mostrar mensagem de erro
function showError(message) {
    alert(message);
}

// Função para mostrar mensagem de sucesso
function showSuccess(message) {
    alert(message);
}

// Função para validar entrada numérica
function validateNumericInput(input) {
    return !isNaN(parseFloat(input)) && isFinite(input);
}

// Função para limpar campos de formulário
function clearForm(formId) {
    document.getElementById(formId).reset();
}

// Exportar funções para uso global
window.checkLogin = checkLogin;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.generateProductCode = generateProductCode;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.showError = showError;
window.showSuccess = showSuccess;
window.validateNumericInput = validateNumericInput;
window.clearForm = clearForm;