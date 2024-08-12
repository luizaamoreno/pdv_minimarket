// Verificar se o usuário está logado
if (!localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
}

// Função para formatar valor em Real brasileiro
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para formatar data no padrão brasileiro
function formatDate(dateString) {
    const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Função para obter a data atual no fuso horário de São Paulo
function getCurrentDateBR() {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Função para obter o histórico de vendas
function getSalesHistory() {
    return JSON.parse(localStorage.getItem('salesHistory')) || [];
}

// Função para obter os produtos
function getProducts() {
    return JSON.parse(localStorage.getItem('products')) || [];
}

// Função para calcular o total de vendas do dia
function getTotalSalesForDay(date) {
    const sales = getSalesHistory();
    return sales.filter(sale => formatDate(sale.date) === formatDate(date))
                .reduce((total, sale) => total + sale.total, 0);
}

// Função para obter vendas por hora do dia
function getSalesByHour(date) {
    const sales = getSalesHistory();
    const salesByHour = Array(24).fill(0);
    
    sales.filter(sale => formatDate(sale.date) === formatDate(date))
         .forEach(sale => {
             const hour = new Date(sale.date).getHours();
             salesByHour[hour] += sale.total;
         });
    
    return salesByHour;
}

// Função para obter os 5 produtos mais vendidos
function getTopProducts() {
    const sales = getSalesHistory();
    const productSales = {};
    
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (productSales[item.code]) {
                productSales[item.code].quantity += item.quantity;
                productSales[item.code].total += item.price * item.quantity;
            } else {
                productSales[item.code] = {
                    name: item.name,
                    quantity: item.quantity,
                    total: item.price * item.quantity
                };
            }
        });
    });
    
    return Object.values(productSales)
                 .sort((a, b) => b.quantity - a.quantity)
                 .slice(0, 5);
}

// Função para obter produtos com estoque baixo
function getLowStockProducts() {
    const products = getProducts();
    const lowStockThreshold = 10; // Definir um limite para considerar estoque baixo
    
    return products.filter(product => product.quantity <= lowStockThreshold)
                   .sort((a, b) => a.quantity - b.quantity)
                   .slice(0, 5);
}

// Função para obter o número de clientes atendidos no dia
function getCustomersServedToday() {
    const sales = getSalesHistory();
    const today = getCurrentDateBR();
    
    return new Set(sales.filter(sale => formatDate(sale.date) === today)
                        .map(sale => sale.client)).size;
}

// Função para obter o cliente que mais comprou (em valor)
function getTopCustomer() {
    const sales = getSalesHistory();
    const customerSales = {};
    
    sales.forEach(sale => {
        if (customerSales[sale.client]) {
            customerSales[sale.client] += sale.total;
        } else {
            customerSales[sale.client] = sale.total;
        }
    });
    
    const topCustomer = Object.entries(customerSales)
                              .sort((a, b) => b[1] - a[1])[0];
    
    return { name: topCustomer[0], total: topCustomer[1] };
}

// Função para obter a distribuição dos métodos de pagamento
function getPaymentMethodDistribution() {
    const sales = getSalesHistory();
    const distribution = {};
    
    sales.forEach(sale => {
        if (distribution[sale.paymentMethod]) {
            distribution[sale.paymentMethod]++;
        } else {
            distribution[sale.paymentMethod] = 1;
        }
    });
    
    return distribution;
}

// Função para obter o valor médio de compra por método de pagamento
function getAveragePurchaseByPaymentMethod() {
    const sales = getSalesHistory();
    const totalByMethod = {};
    const countByMethod = {};
    
    sales.forEach(sale => {
        if (totalByMethod[sale.paymentMethod]) {
            totalByMethod[sale.paymentMethod] += sale.total;
            countByMethod[sale.paymentMethod]++;
        } else {
            totalByMethod[sale.paymentMethod] = sale.total;
            countByMethod[sale.paymentMethod] = 1;
        }
    });
    
    const averageByMethod = {};
    for (const method in totalByMethod) {
        averageByMethod[method] = totalByMethod[method] / countByMethod[method];
    }
    
    return averageByMethod;
}

// Função para obter comparativo de vendas
function getSalesComparison() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    return {
        today: getTotalSalesForDay(today),
        yesterday: getTotalSalesForDay(yesterday),
        lastWeek: getTotalSalesForDay(lastWeek),
        thisMonth: getTotalSalesForPeriod(thisMonth, today),
        lastMonth: getTotalSalesForPeriod(lastMonth, new Date(today.getFullYear(), today.getMonth(), 0))
    };
}

// Função auxiliar para obter o total de vendas para um período
function getTotalSalesForPeriod(startDate, endDate) {
    const sales = getSalesHistory();
    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    }).reduce((total, sale) => total + sale.total, 0);
}

// Função para obter produtos esgotados
function getOutOfStockProducts() {
    const products = getProducts();
    return products.filter(product => product.quantity === 0);
}

// Função para sugerir reposição de estoque
function suggestRestocking() {
    const products = getProducts();
    const lowStockThreshold = 10; // Definir um limite para considerar estoque baixo
    const restockSuggestions = products.filter(product => product.quantity <= lowStockThreshold)
                                       .map(product => ({
                                           name: product.name,
                                           currentStock: product.quantity,
                                           suggestedRestock: lowStockThreshold - product.quantity + 10 // Sugestão básica
                                       }));
    return restockSuggestions;
}

// Função para atualizar o dashboard
function updateDashboard() {
    updateSalesSummary();
    updateTopProducts();
    updateCustomerInfo();
    updatePaymentMethods();
    updateSalesComparison();
    updateAlerts();
    updatePredictions();
}

// Função para atualizar o resumo de vendas
function updateSalesSummary() {
    const today = new Date();
    const totalSales = getTotalSalesForDay(today);
    const salesByHour = getSalesByHour(today);
    
    document.getElementById('total-sales').innerHTML = `
        <h3>Total de Vendas Hoje</h3>
        <p>${formatCurrency(totalSales)}</p>
    `;
    
    // Criar gráfico de vendas por hora
    const ctx = document.getElementById('sales-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}h`),
            datasets: [{
                label: 'Vendas por Hora',
                data: salesByHour,
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value, index, values) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Função para atualizar os produtos mais vendidos e com estoque baixo
function updateTopProducts() {
    const topProducts = getTopProducts();
    const lowStockProducts = getLowStockProducts();
    
    let topProductsHtml = '<h3>Top 5 Produtos Mais Vendidos</h3><ul class="product-list">';
    topProducts.forEach(product => {
        topProductsHtml += `<li><span>${product.name}</span><span>${product.quantity} unidades</span></li>`;
    });
    topProductsHtml += '</ul>';
    
    let lowStockHtml = '<h3>Produtos com Estoque Baixo</h3><ul class="product-list">';
    lowStockProducts.forEach(product => {
        lowStockHtml += `<li><span>${product.name}</span><span>${product.quantity} unidades</span></li>`;
    });
    lowStockHtml += '</ul>';
    
    document.getElementById('top-5-products').innerHTML = topProductsHtml;
    document.getElementById('low-stock-products').innerHTML = lowStockHtml;
}


// Função para atualizar as informações dos clientes
function updateCustomerInfo() {
    const customersServed = getCustomersServedToday();
    const topCustomer = getTopCustomer();
    
    document.getElementById('customers-served').innerHTML = `
        <h3>Clientes Atendidos Hoje</h3>
        <p>${customersServed}</p>
    `;
    
    document.getElementById('top-customer').innerHTML = `
        <h3>Cliente que Mais Comprou</h3>
        <p>${topCustomer.name} - ${formatCurrency(topCustomer.total)}</p>
    `;
}

// Função para atualizar as informações dos métodos de pagamento
function updatePaymentMethods() {
    const distribution = getPaymentMethodDistribution();
    const averagePurchase = getAveragePurchaseByPaymentMethod();
    
    let distributionHtml = '<h3>Distribuição dos Métodos de Pagamento</h3><ul class="payment-list">';
    for (const method in distribution) {
        distributionHtml += `<li><span>${method}</span><span>${distribution[method]} vendas</span></li>`;
    }
    distributionHtml += '</ul>';
    
    let averageHtml = '<h3>Valor Médio de Compra por Método</h3><ul class="payment-list">';
    for (const method in averagePurchase) {
        averageHtml += `<li><span>${method}</span><span>${formatCurrency(averagePurchase[method])}</span></li>`;
    }
    averageHtml += '</ul>';
    
    document.getElementById('payment-distribution').innerHTML = distributionHtml;
    document.getElementById('average-purchase').innerHTML = averageHtml;
}

// Função para atualizar os comparativos de vendas
function updateSalesComparison() {
    const comparison = getSalesComparison();
    
    const dailyComparison = `
        <h3>Comparativo Diário</h3>
        <ul class="comparison-list">
            <li><span>Hoje:</span><span>${formatCurrency(comparison.today)}</span></li>
            <li><span>Ontem:</span><span>${formatCurrency(comparison.yesterday)}</span></li>
            <li><span>Mesmo dia na semana passada:</span><span>${formatCurrency(comparison.lastWeek)}</span></li>
        </ul>
    `;
    
    const monthlyComparison = `
        <h3>Comparativo Mensal</h3>
        <ul class="comparison-list">
            <li><span>Este mês:</span><span>${formatCurrency(comparison.thisMonth)}</span></li>
            <li><span>Mês passado:</span><span>${formatCurrency(comparison.lastMonth)}</span></li>
        </ul>
    `;
    
    // Aqui você pode adicionar lógica para calcular o progresso em relação à meta mensal
    // Por enquanto, vamos usar um valor fixo como exemplo
    const salesGoal = 100000; // Meta mensal de R$100.000
    const progress = (comparison.thisMonth / salesGoal) * 100;
    
    const salesGoalProgress = `
        <h3>Progresso da Meta Mensal</h3>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
        </div>
        <p>${progress.toFixed(2)}% da meta atingida</p>
    `;
    
    document.getElementById('daily-comparison').innerHTML = dailyComparison;
    document.getElementById('monthly-comparison').innerHTML = monthlyComparison;
    document.getElementById('sales-goal-progress').innerHTML = salesGoalProgress;
}

// Função para atualizar os alertas
function updateAlerts() {
    const outOfStock = getOutOfStockProducts();
    
    let alertsHtml = '<h3>Produtos Esgotados</h3>';
    if (outOfStock.length > 0) {
        alertsHtml += '<ul class="alert-list">';
        outOfStock.forEach(product => {
            alertsHtml += `<li class="alert">${product.name}</li>`;
        });
        alertsHtml += '</ul>';
    } else {
        alertsHtml += '<p>Nenhum produto esgotado no momento.</p>';
    }
    
    document.getElementById('out-of-stock').innerHTML = alertsHtml;
}

// Função para atualizar as previsões
function updatePredictions() {
    const restockSuggestions = suggestRestocking();
    
    let suggestionsHtml = '<h3>Sugestões de Reposição de Estoque</h3>';
    if (restockSuggestions.length > 0) {
        suggestionsHtml += '<ul class="suggestion-list">';
        restockSuggestions.forEach(suggestion => {
            suggestionsHtml += `
                <li class="suggestion">
                    <span>${suggestion.name}</span>
                    <span>Estoque atual: ${suggestion.currentStock}</span>
                    <span>Sugestão de reposição: ${suggestion.suggestedRestock}</span>
                </li>
            `;
        });
        suggestionsHtml += '</ul>';
    } else {
        suggestionsHtml += '<p>Nenhuma sugestão de reposição no momento.</p>';
    }
    
    document.getElementById('restock-suggestions').innerHTML = suggestionsHtml;
}

// Função de logout
document.getElementById('logout-button').addEventListener('click', function() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
});

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    updateDashboard();
    
    // Atualizar o dashboard a cada 5 minutos
    setInterval(updateDashboard, 300000);
});