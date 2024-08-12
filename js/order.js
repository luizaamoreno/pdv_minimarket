// Verificar se o usuário está logado
if (!localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
}

let cart = [];
let products = [];
let categories = [];
let discountPercentage = 0;

const paymentMethods = {
    'credit': 'Cartão de Crédito',
    'debit': 'Cartão de Débito',
    'pix': 'PIX',
    'cash': 'Dinheiro',
    'food-voucher': 'Vale-alimentação'
};

// Função para formatar valor em Real brasileiro
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para carregar produtos do localStorage
function loadProducts() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        updateProductList();
        updateCategoryFilter();
    }
}

// Função para formatar a data e hora:
function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Função de migração de data
function migrateDateFormat() {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const updatedSalesHistory = salesHistory.map(order => {
        if (typeof order.date === 'string') {
            const date = new Date(order.date);
            order.date = formatDateTime(date);
        }
        return order;
    });
    localStorage.setItem('salesHistory', JSON.stringify(updatedSalesHistory));
}

// Função para atualizar o filtro de categorias
function updateCategoryFilter() {
    categories = [...new Set(products.map(p => p.category))];
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Todas as categorias</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
}

// Função para ordenar produtos alfabeticamente
function sortProductsAlphabetically(products) {
    return products.sort((a, b) => a.name.localeCompare(b.name));
}

// Função para atualizar a lista de produtos
function updateProductList(category = '') {
    const list = document.getElementById('product-list');
    if (list) {
        list.innerHTML = '';
        
        // Filtrar produtos por categoria
        let filteredProducts = category ? products.filter(p => p.category === category) : products;
        
        // Ordenar produtos alfabeticamente
        let sortedProducts = sortProductsAlphabetically(filteredProducts);

        sortedProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-card';
            productElement.innerHTML = `
                <img src="${product.image || 'placeholder.jpg'}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>Preço: ${formatCurrency(product.price)}${product.unit === 'kg' ? '/kg' : ''}</p>
                <p>Quantidade disponível: ${formatQuantity(product.quantity, product.unit)} ${product.unit}</p>
                <p>Categoria: ${product.category}</p>
                <div class="quantity-input">
                    <label for="quantity-${product.code}">Quantidade:</label>
                    <input type="text" 
                           id="quantity-${product.code}" 
                           value="${product.unit === 'kg' ? '0,1' : '1'}" 
                           ${product.quantity <= 0 ? 'disabled' : ''}>
                    <span>${product.unit}</span>
                </div>
                <button onclick="addToCart('${product.code}')" ${product.quantity <= 0 ? 'disabled' : ''}>
                    ${product.quantity <= 0 ? 'Fora de Estoque' : 'Adicionar ao Carrinho'}
                </button>
            `;
            list.appendChild(productElement);
        });
    }
}

//Função para formatar quantidades
function formatQuantity(value, unit) {
    if (unit === 'kg') {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Função para adicionar ao carrinho
function addToCart(productCode) {
    const product = products.find(p => p.code === productCode);
    if (!product) {
        alert('Produto não encontrado.');
        return;
    }

    if (product.quantity <= 0) {
        alert('Produto fora de estoque!');
        return;
    }

    const quantityInput = document.getElementById(`quantity-${productCode}`);
    let quantity = parseFloat(quantityInput.value.replace(',', '.'));

    if (isNaN(quantity) || quantity <= 0) {
        alert('Por favor, insira uma quantidade válida.');
        return;
    }

    if (product.unit !== 'kg') {
        quantity = Math.floor(quantity); // Arredonda para baixo para produtos não vendidos por peso
    }

    if (quantity > product.quantity) {
        alert(`Quantidade indisponível no estoque. Disponível: ${formatQuantity(product.quantity, product.unit)} ${product.unit}.`);
        return;
    }
    
    const cartItem = cart.find(item => item.code === productCode);
    if (cartItem) {
        cartItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity });
    }

    updateCartDisplay();
    saveCart();

    // Atualizar a exibição do produto na lista
    updateProductList(document.getElementById('category-select')?.value);

    // Resetar o campo de quantidade para o valor mínimo após adicionar ao carrinho
    quantityInput.value = product.unit === 'kg' ? '0,1' : '1';

    alert(`${formatQuantity(quantity, product.unit)} ${product.unit} de ${product.name} adicionado${quantity > 1 ? 's' : ''} ao carrinho.`);
}

// Função para atualizar a exibição do carrinho
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartBadge = document.getElementById('cart-badge');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');

    if (cartItems) {
        cartItems.innerHTML = '';
        let subtotal = 0;
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <span>${item.name} - ${formatQuantity(item.quantity, item.unit)} ${item.unit} x ${formatCurrency(item.price)}</span>
                <button class="remove-item" onclick="removeFromCart('${item.code}')" title="Remover item">
                    ×
                </button>
            `;
            cartItems.appendChild(itemElement);
            subtotal += item.price * item.quantity;
        });
        
        const discountAmount = subtotal * (discountPercentage / 100);
        const total = subtotal - discountAmount;

        if (cartSubtotal) cartSubtotal.textContent = `Subtotal: ${formatCurrency(subtotal)}`;
        if (cartTotal) cartTotal.textContent = `Total: ${formatCurrency(total)}`;
    }
    
    if (cartBadge) {
        cartBadge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

// Função para remover do carrinho
function removeFromCart(productCode) {
    const cartItemIndex = cart.findIndex(item => item.code === productCode);
    if (cartItemIndex > -1) {
        // Removemos a linha que adicionava a quantidade de volta ao estoque
        cart.splice(cartItemIndex, 1);
        updateCartDisplay();
        saveCart();
        // Não é necessário atualizar o localStorage dos produtos aqui
        updateProductList(document.getElementById('category-select')?.value);
    }
}

// Função para salvar o carrinho no localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Função para carregar o carrinho do localStorage
function loadCart() {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
        updateCartDisplay();
    }
}

// Função para aplicar desconto
function applyDiscount() {
    discountPercentage = parseFloat(document.getElementById('discount-percentage').value) || 0;
    updateCartDisplay();
}

// Função para finalizar a venda
function finalizeSale() {
    const paymentMethod = document.getElementById('payment-method').value;
    if (!paymentMethod) {
        alert('Por favor, selecione um método de pagamento.');
        return;
    }

    if (cart.length === 0) {
        alert('O carrinho está vazio. Adicione itens antes de finalizar a venda.');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;

    let change = 0;
    if (paymentMethod === 'cash') {
        const cashAmount = parseFloat(document.getElementById('cash-amount').value);
        if (isNaN(cashAmount) || cashAmount < total) {
            alert('Valor em dinheiro inválido ou insuficiente.');
            return;
        }
        change = cashAmount - total;
    }

    const orderNumber = generateOrderNumber();
    const orderDetails = {
        orderNumber: orderNumber,
        items: [...cart],
        subtotal: subtotal,
        discountPercentage: discountPercentage,
        total: total,
        paymentMethod: paymentMethods[paymentMethod] || paymentMethod,
        change: change,
        date: formatDateTime(new Date()),
        client: document.getElementById('nomeCliente')?.value || 'Consumidor Final'
    };

    // Adicionar a venda ao histórico
    addSaleToHistory(orderDetails);

    // Gerar o recibo
    generateReceipt(orderDetails);

    // Atualizar o estoque
    cart.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity -= item.quantity;
        }
    });

    // Limpar o carrinho e atualizar a exibição
    cart = [];
    discountPercentage = 0;
    document.getElementById('discount-percentage').value = '0';
    updateCartDisplay();
    saveCart();
    localStorage.setItem('products', JSON.stringify(products));

    // Forçar a atualização da exibição dos produtos
    updateProductList(document.getElementById('category-select')?.value);

    // Fechar o menu do carrinho
    toggleCart();

    showSuccessModal(orderNumber, total, discountPercentage, paymentMethods[paymentMethod]);
}

//Modal para Venda finalizada com sucesso:
function showSuccessModal(orderNumber, total, discountPercentage, paymentMethod) {
    const modal = document.getElementById('successModal');
    const orderNumberSpan = document.getElementById('successOrderNumber');
    const orderTotalSpan = document.getElementById('successOrderTotal');
    const orderDiscountSpan = document.getElementById('successOrderDiscount');
    const orderPaymentSpan = document.getElementById('successOrderPayment');

    orderNumberSpan.textContent = orderNumber;
    orderTotalSpan.textContent = formatCurrency(total);
    orderDiscountSpan.textContent = discountPercentage + '%';
    orderPaymentSpan.textContent = paymentMethod;

    modal.style.display = 'block';

    // Configurar os eventos de fechar o modal
    const closeBtn = modal.querySelector('.close');
    const closeModalBtn = document.getElementById('closeSuccessModal');
    
    const closeModal = function() {
        modal.style.display = 'none';
    };

    closeBtn.onclick = closeModal;
    closeModalBtn.onclick = closeModal;

    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
}

// Função para gerar número de pedido sequencial
function generateOrderNumber() {
    let lastOrderNumber = localStorage.getItem('lastOrderNumber') || 0;
    lastOrderNumber = parseInt(lastOrderNumber) + 1;
    localStorage.setItem('lastOrderNumber', lastOrderNumber);
    return `PED${lastOrderNumber.toString().padStart(6, '0')}`;
}

// Função para gerar o recibo
function generateReceipt(orderDetails) {
    // Verifica se a biblioteca jsPDF está disponível
    if (typeof jspdf === 'undefined') {
        console.error('jsPDF não está carregado. Verifique se a biblioteca está incluída corretamente.');
        alert('Não foi possível gerar o recibo. Por favor, tente novamente mais tarde.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 150 + (orderDetails.items.length * 10)]
    });

    const width = doc.internal.pageSize.getWidth();
    let y = 10;

    // Funções auxiliares
    function centerText(text, y) {
        doc.text(text, width / 2, y, { align: 'center' });
    }
    
    function leftText(text, y) {
        doc.text(text, 5, y);
    }
    
    function rightText(text, y) {
        doc.text(text, width - 5, y, { align: 'right' });
    }
    
    function line(y) {
        doc.setLineWidth(0.1);
        doc.line(5, y, width - 5, y);
    }

    // Cabeçalho
    doc.setFontSize(12);
    centerText("MINI MERCADINHOS", y);
    y += 5;
    doc.setFontSize(10);
    centerText("CNPJ: 00.000.000/0001-00", y);
    y += 5;
    centerText("Rua Exemplo, 123 - Cidade - Estado", y);
    y += 5;
    centerText("CEP: 12345-678 - Tel: (11) 1234-5678", y);
    y += 7;

    line(y);
    y += 5;

    // Detalhes do pedido
    doc.setFontSize(10);
    leftText(`Pedido: ${orderDetails.orderNumber}`, y);
    y += 5;
    leftText(`Data: ${orderDetails.date}`, y);
    y += 5;
    leftText(`Cliente: ${orderDetails.client}`, y);
    y += 5;
    leftText(`Atendente: ${localStorage.getItem('loggedIn')}`, y);
    y += 7;

    line(y);
    y += 5;

    // Itens do pedido
    doc.setFontSize(10);
    centerText("CUPOM FISCAL", y);
    y += 5;

    orderDetails.items.forEach((item) => {
        y += 5;
        leftText(`${item.name}`, y);
        y += 4;
        leftText(`${formatQuantity(item.quantity, item.unit)} ${item.unit} x ${formatCurrency(item.price)}`, y);
        rightText(formatCurrency(item.quantity * item.price), y);
    });

    y += 7;
    line(y);
    y += 7;

    // Total e pagamento
    doc.setFontSize(10);
    leftText("Subtotal:", y);
    rightText(formatCurrency(orderDetails.subtotal), y);
    y += 5;
    leftText(`Desconto (${orderDetails.discountPercentage.toLocaleString('pt-BR')}%):`, y);
    rightText(formatCurrency(orderDetails.subtotal * orderDetails.discountPercentage / 100), y);
    y += 5;
    doc.setFontSize(12);
    leftText("TOTAL:", y);
    rightText(formatCurrency(orderDetails.total), y);
    y += 7;

    doc.setFontSize(10);
    leftText(`Forma de Pagamento: ${orderDetails.paymentMethod}`, y);
    y += 5;
    if (orderDetails.paymentMethod === 'Dinheiro' && orderDetails.change > 0) {
        leftText("Troco:", y);
        rightText(formatCurrency(orderDetails.change), y);
        y += 5;
    }

    y += 7;
    line(y);
    y += 7;

    // Mensagem final
    doc.setFontSize(8);
    centerText("Obrigado pela preferência!", y);
    y += 4;
    centerText("Volte sempre!", y);

    // Salva o PDF
    doc.save(`cupom_fiscal_${orderDetails.orderNumber}.pdf`);
}

// Função para adicionar uma venda ao histórico
function addSaleToHistory(sale) {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    salesHistory.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
}

// Função para limpar o carrinho
function clearCart() {
    if (cart.length === 0) {
        alert('O carrinho já está vazio.');
        return;
    }

    // Confirmar com o usuário antes de limpar o carrinho
    if (!confirm('Tem certeza que deseja limpar o carrinho?')) {
        return;
    }

    // Devolver itens ao estoque
    cart.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity += item.quantity;
        }
    });

    // Limpar o carrinho
    cart = [];
    updateCartDisplay();
    saveCart();
    localStorage.setItem('products', JSON.stringify(products));
    updateProductList(document.getElementById('category-select')?.value);

    alert('Carrinho limpo com sucesso.');
}

// Função para alternar a visibilidade do carrinho
function toggleCart() {
    const cartMenu = document.getElementById('cart-menu');
    if (cartMenu) {
        cartMenu.style.display = cartMenu.style.display === 'none' || cartMenu.style.display === '' ? 'block' : 'none';
    }
}

// Função para mostrar detalhes do pedido
function showOrderDetails(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(sale => sale.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado');
        return;
    }

    const detailsContainer = document.getElementById('order-details');
    if (!detailsContainer) {
        console.error('Elemento order-details não encontrado');
        return;
    }

    let detailsHTML = `
        <h3>Pedido ${order.orderNumber}</h3>
        <div class="order-info">
            <p><strong>Data:</strong> ${order.date}</p>
            <p><strong>Cliente:</strong> ${order.client}</p>
            <p><strong>Método de Pagamento:</strong> ${order.paymentMethod}</p>
        </div>
        <h4>Itens do Pedido:</h4>
        <ul class="items-list">
    `;

    order.items.forEach(item => {
        detailsHTML += `
            <li>
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.price * item.quantity)}</span>
            </li>
        `;
    });

    detailsHTML += `
        </ul>
        <div class="order-summary">
            <p><strong>Subtotal:</strong> ${formatCurrency(order.subtotal)}</p>
            <p><strong>Desconto:</strong> ${order.discountPercentage}%</p>
            <p class="order-total"><strong>Total:</strong> ${formatCurrency(order.total)}</p>
        </div>
    `;

    if (order.paymentMethod === 'Dinheiro' && order.change > 0) {
        detailsHTML += `
            <p><strong>Troco:</strong> ${formatCurrency(order.change)}</p>
        `;
    }

    detailsContainer.innerHTML = detailsHTML;

    // Exibir o modal de detalhes
    const modal = document.getElementById('order-details-modal');
    modal.style.display = 'block';
}

// Função para fechar os detalhes do pedido
function closeOrderDetails() {
    const detailsContainer = document.getElementById('order-details');
    if (detailsContainer) {
        detailsContainer.style.display = 'none';
    }
}

// Função para visualizar / ocultar o histórico de pedidos
function viewOrderHistory() {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const historyContainer = document.getElementById('order-history-body');
    const searchInput = document.getElementById('search-orders');
    const filterSelect = document.getElementById('filter-orders');
    const filterDate = document.getElementById('filter-date');
    
    if (!historyContainer) {
        console.error('Elemento order-history-body não encontrado');
        return;
    }

    function renderOrders(orders) {
        historyContainer.innerHTML = '';
        if (orders.length === 0) {
            historyContainer.innerHTML = '<tr><td colspan="4">Nenhum pedido encontrado.</td></tr>';
        } else {
            orders.forEach((order) => {
                const isToday = isSameDay(order.date);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.orderNumber}</td>
                    <td>${order.date}</td>
                    <td>${formatCurrency(order.total)}</td>
                    <td>
                        <button class="btn-action" onclick="showOrderDetails('${order.orderNumber}')" title="Ver Detalhes">
                            <i class="fas fa-eye"></i><span>Detalhes</span>
                        </button>
                        <button class="btn-action" onclick="editOrder('${order.orderNumber}')" ${isToday ? '' : 'disabled'} title="${isToday ? 'Alterar' : 'Não editável'}">
                            <i class="fas fa-edit"></i><span>Alterar</span>
                        </button>
                        <button class="btn-action" onclick="deleteOrder('${order.orderNumber}')" ${isToday ? '' : 'disabled'} title="${isToday ? 'Excluir' : 'Não excluível'}">
                            <i class="fas fa-trash"></i><span>Excluir</span>
                        </button>
                        <button class="btn-action" onclick="viewReceipt('${order.orderNumber}')" title="Visualizar Recibo">
                            <i class="fas fa-file-alt"></i><span>Recibo</span>
                        </button>
                    </td>
                `;
                historyContainer.appendChild(row);
            });
        }
    }

    function filterOrders() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterValue = filterSelect.value;
        const filterDateValue = filterDate.value;

        let filteredOrders = salesHistory.filter(order => {
            const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm) ||
                                  order.client.toLowerCase().includes(searchTerm);
            const matchesFilter = filterValue === 'all' || 
                                  (filterValue === 'editable' && isSameDay(order.date)) ||
                                  (filterValue === 'non-editable' && !isSameDay(order.date));
            const matchesDate = !filterDateValue || isSameDate(order.date, filterDateValue);

            return matchesSearch && matchesFilter && matchesDate;
        });

        renderOrders(filteredOrders);
    }

    // Event listeners para os filtros
    searchInput.addEventListener('input', filterOrders);
    filterSelect.addEventListener('change', filterOrders);
    filterDate.addEventListener('change', filterOrders);

    // Renderizar pedidos inicialmente
    renderOrders(salesHistory);
    
    // Exibir o modal
    const modal = document.getElementById('history-modal');
    modal.style.display = 'block';
}

// Função para fechar o modal de histórico
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'none';
}

// Função para mostrar detalhes do pedido
function showOrderDetails(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(sale => sale.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado');
        return;
    }

    const detailsContainer = document.getElementById('order-details');
    if (!detailsContainer) {
        console.error('Elemento order-details não encontrado');
        return;
    }

    let detailsHTML = `
    <h2>Detalhes do Pedido ${order.orderNumber}</h2>
    <div class="order-info">
        <p><strong>Data:</strong> ${order.date}</p>
        <p><strong>Cliente:</strong> ${order.client}</p>
        <p><strong>Método de Pagamento:</strong> ${order.paymentMethod}</p>
    </div>
    <h3>Itens do Pedido:</h3>
    <ul class="items-list">
    `;

    order.items.forEach(item => {
        detailsHTML += `
            <li>
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.price * item.quantity)}</span>
            </li>
        `;
    });

    detailsHTML += `
        </ul>
        <div class="order-summary">
            <p><strong>Subtotal:</strong> ${formatCurrency(order.subtotal)}</p>
            <p><strong>Desconto:</strong> ${order.discountPercentage}%</p>
            <p class="order-total"><strong>Total:</strong> ${formatCurrency(order.total)}</p>
        </div>
    `;

    if (order.paymentMethod === 'Dinheiro' && order.change > 0) {
        detailsHTML += `
            <p><strong>Troco:</strong> ${formatCurrency(order.change)}</p>
        `;
    }

    detailsContainer.innerHTML = detailsHTML;

    // Exibir o modal de detalhes
    const modal = document.getElementById('order-details-modal');
    modal.style.display = 'block';
}


//Função visualizar recibo:
function viewReceipt(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(sale => sale.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 150 + (order.items.length * 10)]
    });

    const width = doc.internal.pageSize.getWidth();
    let y = 10;

    // Funções auxiliares
    function centerText(text, y) {
        doc.text(text, width / 2, y, { align: 'center' });
    }
    
    function leftText(text, y) {
        doc.text(text, 5, y);
    }
    
    function rightText(text, y) {
        doc.text(text, width - 5, y, { align: 'right' });
    }
    
    function line(y) {
        doc.setLineWidth(0.1);
        doc.line(5, y, width - 5, y);
    }

    // Cabeçalho
    doc.setFontSize(12);
    centerText("MINI MERCADINHOS", y);
    y += 5;
    doc.setFontSize(10);
    centerText("CNPJ: 00.000.000/0001-00", y);
    y += 5;
    centerText("Rua Exemplo, 123 - Cidade - Estado", y);
    y += 5;
    centerText("CEP: 12345-678 - Tel: (11) 1234-5678", y);
    y += 7;

    line(y);
    y += 5;

    // Detalhes do pedido
    doc.setFontSize(10);
    leftText(`Pedido: ${order.orderNumber}`, y);
    y += 5;
    leftText(`Data/Hora: ${order.date}`, y);
    y += 5;
    leftText(`Cliente: ${order.client}`, y);
    y += 5;
    leftText(`Atendente: ${localStorage.getItem('loggedIn')}`, y);
    y += 7;

    line(y);
    y += 5;

    // Itens do pedido
    doc.setFontSize(10);
    centerText("CUPOM FISCAL", y);
    y += 5;

    order.items.forEach((item) => {
        y += 5;
        leftText(`${item.name}`, y);
        y += 4;
        leftText(`${formatQuantity(item.quantity, item.unit)} ${item.unit} x ${formatCurrency(item.price)}`, y);
        rightText(formatCurrency(item.quantity * item.price), y);
    });

    y += 7;
    line(y);
    y += 7;

    // Total e pagamento
    doc.setFontSize(10);
    leftText("Subtotal:", y);
    rightText(formatCurrency(order.subtotal), y);
    y += 5;
    leftText(`Desconto (${order.discountPercentage.toLocaleString('pt-BR')}%):`, y);
    rightText(formatCurrency(order.subtotal * order.discountPercentage / 100), y);
    y += 5;
    doc.setFontSize(12);
    leftText("TOTAL:", y);
    rightText(formatCurrency(order.total), y);
    y += 7;

    doc.setFontSize(10);
    leftText(`Forma de Pagamento: ${order.paymentMethod}`, y);
    y += 5;
    if (order.paymentMethod === 'Dinheiro' && order.change > 0) {
        leftText("Troco:", y);
        rightText(formatCurrency(order.change), y);
        y += 5;
    }

    y += 7;
    line(y);
    y += 7;

    // Mensagem final
    doc.setFontSize(8);
    centerText("Obrigado pela preferência!", y);
    y += 4;
    centerText("Volte sempre!", y);

    // Abrir o PDF em uma nova janela
    const pdfData = doc.output('datauristring');
    const newWindow = window.open();
    newWindow.document.write(`<iframe width='100%' height='100%' src='${pdfData}'></iframe>`);
}

//Função para verificar se é o mesmo dia
function isSameDay(dateTimeString) {
    const [dateString, ] = dateTimeString.split(' ');
    const [orderDay, orderMonth, orderYear] = dateString.split('/').map(Number);
    const today = new Date();
    
    return orderDay === today.getDate() &&
           orderMonth === (today.getMonth() + 1) &&
           orderYear === today.getFullYear();
}

// Função auxiliar para comparar datas
function isSameDate(orderDateString, filterDateString) {
    const [orderDatePart, ] = orderDateString.split(' ');
    const [orderDay, orderMonth, orderYear] = orderDatePart.split('/').map(Number);
    const [filterYear, filterMonth, filterDay] = filterDateString.split('-').map(Number);

    return orderDay === filterDay &&
           orderMonth === filterMonth &&
           orderYear === filterYear;
}

//Função para editar pedido:
function editOrder(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(order => order.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado.');
        return;
    }

    if (!isSameDay(order.date)) {
        alert('Não é possível editar pedidos de dias anteriores.');
        return;
    }

    // Preencher os detalhes do pedido no modal
    document.getElementById('editOrderNumber').textContent = order.orderNumber;
    document.getElementById('editOrderDate').textContent = order.date;
    
    const itemsList = document.getElementById('editOrderItems');
    itemsList.innerHTML = '';
    order.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - ${formatQuantity(item.quantity, item.unit)} x ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)}`;
        itemsList.appendChild(li);
    });
    
    document.getElementById('editOrderSubtotal').textContent = formatCurrency(order.subtotal);

    // Preencher os campos editáveis
    document.getElementById('editClientName').value = order.client;
    document.getElementById('editDiscount').value = order.discountPercentage;
    document.getElementById('editPaymentMethod').value = Object.keys(paymentMethods).find(key => paymentMethods[key] === order.paymentMethod) || '';

    // Exibir o modal
    document.getElementById('editOrderModal').style.display = 'block';

    // Configurar o evento de submit do formulário
    document.getElementById('editOrderForm').onsubmit = function(e) {
        e.preventDefault();
        saveOrderChanges(order, salesHistory);
    };
}

//Função para salvar alterações do pedido:
function saveOrderChanges(order, salesHistory) {
    const newClient = document.getElementById('editClientName').value;
    const newDiscount = parseFloat(document.getElementById('editDiscount').value);
    const newPaymentMethod = document.getElementById('editPaymentMethod').value;

    if (newClient && !isNaN(newDiscount) && newPaymentMethod) {
        // Recalcular o total com o novo desconto
        const subtotal = order.subtotal;
        const discountAmount = subtotal * (newDiscount / 100);
        const newTotal = subtotal - discountAmount;

        // Atualizar o pedido
        order.client = newClient;
        order.discountPercentage = newDiscount;
        order.total = newTotal;
        order.paymentMethod = paymentMethods[newPaymentMethod];

        // Salvar as alterações
        localStorage.setItem('salesHistory', JSON.stringify(salesHistory));

        alert('Pedido atualizado com sucesso!');
        document.getElementById('editOrderModal').style.display = 'none';
        viewOrderHistory(); // Atualizar a exibição do histórico
    } else {
        alert('Por favor, preencha todos os campos corretamente.');
    }
}

//Função para fechar o modal:
function closeEditModal() {
    document.getElementById('editOrderModal').style.display = 'none';
}

//Função para excluir pedido:
function deleteOrder(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const orderIndex = salesHistory.findIndex(order => order.orderNumber === orderNumber);

    if (orderIndex === -1) {
        alert('Pedido não encontrado.');
        return;
    }

    const order = salesHistory[orderIndex];

    if (!isSameDay(order.date)) {
        alert('Não é possível excluir pedidos de dias anteriores.');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir o pedido ${orderNumber}?`)) {
        return;
    }

    // Devolver os itens ao estoque
    order.items.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity += item.quantity;
        }
    });

    // Remover o pedido do histórico
    salesHistory.splice(orderIndex, 1);

    // Salvar as alterações
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    localStorage.setItem('products', JSON.stringify(products));

    alert('Pedido excluído com sucesso!');
    viewOrderHistory(); // Atualizar a exibição do histórico
    updateProductList(); // Atualizar a lista de produtos
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Executar a migração de data (será executada apenas uma vez)
    migrateDateFormat();
    localStorage.setItem('dateMigrationDone', 'true');

    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function() {
            const cashPayment = document.getElementById('cash-payment');
            if (cashPayment) {
                cashPayment.style.display = this.value === 'cash' ? 'block' : 'none';
            }
        });
    }

    const finishPayment = document.getElementById('finish-payment');
    if (finishPayment) {
        finishPayment.addEventListener('click', finalizeSale);
    }

    const clearCartButton = document.getElementById('clear-cart');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }

    const applyDiscountButton = document.getElementById('apply-discount');
    if (applyDiscountButton) {
        applyDiscountButton.addEventListener('click', applyDiscount);
    }

    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            updateProductList(this.value);
        });
    }

    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', toggleCart);
    }

    const closeCart = document.getElementById('close-cart');
    if (closeCart) {
        closeCart.addEventListener('click', toggleCart);
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('loggedIn');
            window.location.href = 'index.html';
        });
    }

    const viewOrderHistoryButton = document.getElementById('view-order-history');
    if (viewOrderHistoryButton) {
        viewOrderHistoryButton.addEventListener('click', viewOrderHistory);
    }

    // Adicionar event listeners para fechar os modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Carregar produtos e carrinho ao iniciar a página
    loadProducts();
    loadCart();
});