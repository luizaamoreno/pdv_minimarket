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

// Funções de utilidade para data

function getCurrentDateTimeBrasilia() {
    const now = new Date();
    return now.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatDateTimeBR(dateString) {
    console.log("Formatando data:", dateString);
    if (!dateString) return 'Data inválida';
    
    let date;
    if (typeof dateString === 'string') {
        if (dateString.includes('/')) {
            // Já está no formato brasileiro
            const [day, month, year, time] = dateString.split(/[/, ]/);
            date = new Date(year, month - 1, day);
            if (time) {
                const [hour, minute, second] = time.split(':');
                date.setHours(hour, minute, second);
            }
        } else {
            // Tenta parse padrão
            date = new Date(dateString);
        }
    } else {
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
        console.error('Data inválida:', dateString);
        return 'Data inválida';
    }

    return date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function parseDateTimeBR(dateTimeString) {
    if (!dateTimeString) return null;
    const [datePart, timePart] = dateTimeString.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');
    return new Date(year, month - 1, day, hour, minute);
}

function isSameDay(date1, date2) {
    const d1 = typeof date1 === 'string' ? new Date(date1.split(',')[0].split('/').reverse().join('-')) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2.split(',')[0].split('/').reverse().join('-')) : date2;
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
}

function isSameDate(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function loadProducts() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        updateProductList();
        updateCategoryFilter();
    }
}

function migrateDateFormat() {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const updatedSalesHistory = salesHistory.map(order => {
        if (typeof order.date === 'string') {
            const parsedDate = parseDateTimeBR(order.date);
            if (parsedDate) {
                order.date = formatDateTimeBR(parsedDate);
            } else {
                order.date = getCurrentDateTimeBrasilia();
            }
        } else if (order.date instanceof Date) {
            order.date = formatDateTimeBR(order.date);
        } else {
            order.date = getCurrentDateTimeBrasilia();
        }
        return order;
    });
    localStorage.setItem('salesHistory', JSON.stringify(updatedSalesHistory));
}

function checkAndFixDates() {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    let hasChanges = false;

    salesHistory = salesHistory.map(sale => {
        if (sale.date === 'Data inválida' || !sale.date) {
            sale.date = new Date().toISOString();
            hasChanges = true;
        } else {
            const formattedDate = formatDateTimeBR(sale.date);
            if (formattedDate !== sale.date) {
                sale.date = formattedDate;
                hasChanges = true;
            }
        }
        return sale;
    });

    if (hasChanges) {
        localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
        console.log('Datas no histórico de vendas foram corrigidas.');
    }
}

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

function sortProductsAlphabetically(products) {
    return products.sort((a, b) => a.name.localeCompare(b.name));
}

function updateProductList(category = '') {
    const list = document.getElementById('product-list');
    if (list) {
        list.innerHTML = '';
        
        let filteredProducts = category ? products.filter(p => p.category === category) : products;
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

function formatQuantity(value, unit) {
    if (unit === 'kg') {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function addSaleToHistory(sale) {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    sale.date = getCurrentDateTimeBrasilia();
    salesHistory.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    console.log("Venda adicionada ao histórico:", sale);
}

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
        quantity = Math.floor(quantity);
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
    updateProductList(document.getElementById('category-select')?.value);
    quantityInput.value = product.unit === 'kg' ? '0,1' : '1';

    alert(`${formatQuantity(quantity, product.unit)} ${product.unit} de ${product.name} adicionado${quantity > 1 ? 's' : ''} ao carrinho.`);
}

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

function removeFromCart(productCode) {
    const cartItemIndex = cart.findIndex(item => item.code === productCode);
    if (cartItemIndex > -1) {
        cart.splice(cartItemIndex, 1);
        updateCartDisplay();
        saveCart();
        updateProductList(document.getElementById('category-select')?.value);
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
        updateCartDisplay();
    }
}

function applyDiscount() {
    discountPercentage = parseFloat(document.getElementById('discount-percentage').value) || 0;
    updateCartDisplay();
}

function finalizeSale() {
    const paymentMethod = document.getElementById('payment-method').value;
    const nomeCliente = document.getElementById('nomeCliente').value.trim();

    if (!paymentMethod) {
        alert('Por favor, selecione um método de pagamento.');
        return;
    }

    if (!nomeCliente) {
        alert('Por favor, insira o nome do cliente.');
        document.getElementById('nomeCliente').focus();
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
        date: getCurrentDateTimeBrasilia(),
        client: nomeCliente
    };

    addSaleToHistory(orderDetails);
    generateReceipt(orderDetails);

    cart.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity -= item.quantity;
        }
    });

    cart = [];
    discountPercentage = 0;
    document.getElementById('discount-percentage').value = '0';
    document.getElementById('nomeCliente').value = '';
    updateCartDisplay();
    saveCart();
    localStorage.setItem('products', JSON.stringify(products));
    updateProductList(document.getElementById('category-select')?.value);
    toggleCart();

    showSuccessModal(orderNumber, total, discountPercentage, paymentMethods[paymentMethod]);
}

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

function generateOrderNumber() {
    let lastOrderNumber = localStorage.getItem('lastOrderNumber') || 0;
    lastOrderNumber = parseInt(lastOrderNumber) + 1;
    localStorage.setItem('lastOrderNumber', lastOrderNumber);
    return `PED${lastOrderNumber.toString().padStart(6, '0')}`;
}

function generateReceipt(orderDetails) {
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
    centerText("RESUMO DO PEDIDO", y);
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

function addSaleToHistory(sale) {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    sale.date = getCurrentDateTimeBrasilia();
    salesHistory.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
}

function clearCart() {
    if (cart.length === 0) {
        alert('O carrinho já está vazio.');
        return;
    }

    if (!confirm('Tem certeza que deseja limpar o carrinho?')) {
        return;
    }

    cart.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity += item.quantity;
        }
    });

    cart = [];
    updateCartDisplay();
    saveCart();
    localStorage.setItem('products', JSON.stringify(products));
    updateProductList(document.getElementById('category-select')?.value);

    alert('Carrinho limpo com sucesso.');
}

function toggleCart() {
    const cartMenu = document.getElementById('cart-menu');
    if (cartMenu) {
        cartMenu.style.display = cartMenu.style.display === 'none' || cartMenu.style.display === '' ? 'block' : 'none';
    }
}

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

    const modal = document.getElementById('order-details-modal');
    modal.style.display = 'block';
}

function viewOrderHistory() {
    console.log("Visualizando histórico de pedidos");
    checkAndFixDates();
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    console.log("Histórico de vendas:", salesHistory);
    filterOrders(); // Isso irá chamar renderOrders com os filtros aplicados
    
    const modal = document.getElementById('history-modal');
    modal.style.display = 'block';
}

function renderOrders(orders) {
    const historyContainer = document.getElementById('order-history-body');
    historyContainer.innerHTML = '';
    if (orders.length === 0) {
        historyContainer.innerHTML = '<tr><td colspan="5">Nenhum pedido encontrado.</td></tr>';
    } else {
        const currentDate = getCurrentDateTimeBrasilia().split(',')[0].trim();
        orders.forEach((order) => {
            const orderDate = order.date.split(',')[0].trim();
            const isToday = orderDate === currentDate;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderNumber}</td>
                <td>${order.date}</td>
                <td>${order.client}</td>
                <td>${formatCurrency(order.total)}</td>
                <td>
                    <button class="btn-action" onclick="showOrderDetails('${order.orderNumber}')" title="Ver Detalhes">
                        <i class="fas fa-eye"></i><span>Detalhes</span>
                    </button>
                    <button class="btn-action" onclick="editOrder('${order.orderNumber}')" ${isToday ? '' : 'disabled'} title="${isToday ? 'Alterar' : 'Não editável'}">
                        <i class="fas fa-edit"></i><span>Alterar</span>
                    </button>
                    <button class="btn-action" onclick="confirmDeleteOrder('${order.orderNumber}')" ${isToday ? '' : 'disabled'} title="${isToday ? 'Excluir' : 'Não excluível'}">
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

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'none';
}

function viewReceipt(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(sale => sale.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado');
        return;
    }

    generateReceipt(order);
}

function editOrder(orderNumber) {
    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const order = salesHistory.find(order => order.orderNumber === orderNumber);

    if (!order) {
        alert('Pedido não encontrado.');
        return;
    }

    const currentDate = getCurrentDateTimeBrasilia();
    if (!isSameDay(order.date, currentDate)) {
        alert('Não é possível editar pedidos de dias anteriores.');
        return;
    }

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
    document.getElementById('editClientName').value = order.client;
    document.getElementById('editDiscount').value = order.discountPercentage;
    document.getElementById('editPaymentMethod').value = Object.keys(paymentMethods).find(key => paymentMethods[key] === order.paymentMethod) || '';

    document.getElementById('editOrderModal').style.display = 'block';

    document.getElementById('editOrderForm').onsubmit = function(e) {
        e.preventDefault();
        saveOrderChanges(order, salesHistory);
    };
}

function saveOrderChanges(order, salesHistory) {
    const newClient = document.getElementById('editClientName').value;
    const newDiscount = parseFloat(document.getElementById('editDiscount').value);
    const newPaymentMethod = document.getElementById('editPaymentMethod').value;

    if (newClient && !isNaN(newDiscount) && newPaymentMethod) {
        const subtotal = order.subtotal;
        const discountAmount = subtotal * (newDiscount / 100);
        const newTotal = subtotal - discountAmount;

        order.client = newClient;
        order.discountPercentage = newDiscount;
        order.total = newTotal;
        order.paymentMethod = paymentMethods[newPaymentMethod];

        localStorage.setItem('salesHistory', JSON.stringify(salesHistory));

        alert('Pedido atualizado com sucesso!');
        document.getElementById('editOrderModal').style.display = 'none';
        viewOrderHistory();
    } else {
        alert('Por favor, preencha todos os campos corretamente.');
    }
}

function closeEditModal() {
    document.getElementById('editOrderModal').style.display = 'none';
}

function confirmDeleteOrder(orderNumber) {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
        deleteOrder(orderNumber);
    }
}

function deleteOrder(orderNumber) {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const orderIndex = salesHistory.findIndex(order => order.orderNumber === orderNumber);

    if (orderIndex === -1) {
        alert('Pedido não encontrado.');
        return;
    }

    const order = salesHistory[orderIndex];
    const currentDate = getCurrentDateTimeBrasilia();

    if (!isSameDay(order.date, currentDate)) {
        alert('Não é possível excluir pedidos de dias anteriores.');
        return;
    }

    order.items.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.quantity += item.quantity;
        }
    });

    salesHistory.splice(orderIndex, 1);

    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    localStorage.setItem('products', JSON.stringify(products));

    alert('Pedido excluído com sucesso!');
    viewOrderHistory();
    updateProductList();
}

function checkAndFixDates() {
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    let hasChanges = false;

    salesHistory = salesHistory.map(sale => {
        if (!sale.date) {
            sale.date = getCurrentDateTimeBrasilia();
            hasChanges = true;
        }
        return sale;
    });

    if (hasChanges) {
        localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
        console.log('Datas no histórico de vendas foram corrigidas.');
    }
}

function filterOrders() {
    console.log("Função filterOrders chamada");
    const searchTerm = document.getElementById('search-orders').value.toLowerCase();
    const filterValue = document.getElementById('filter-orders').value;
    const filterDateValue = document.getElementById('filter-date').value;
    console.log("Valores dos filtros:", { searchTerm, filterValue, filterDateValue });

    const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    console.log("Histórico de vendas:", salesHistory);

    const currentDate = getCurrentDateTimeBrasilia().split(',')[0].trim();
    console.log("Data atual:", currentDate);
    
    let filteredOrders = salesHistory.filter(order => {
        const orderDate = order.date.split(',')[0].trim();
        // Converter a data do filtro para o formato DD/MM/AAAA
        const formattedFilterDate = filterDateValue ? formatDateForComparison(filterDateValue) : '';
        console.log("Comparando datas:", { orderDate, formattedFilterDate });
        
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm) ||
                              order.client.toLowerCase().includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
                              (filterValue === 'editable' && orderDate === currentDate) ||
                              (filterValue === 'non-editable' && orderDate !== currentDate);
        const matchesDate = !filterDateValue || orderDate === formattedFilterDate;

        console.log("Resultados da filtragem:", { matchesSearch, matchesFilter, matchesDate });
        return matchesSearch && matchesFilter && matchesDate;
    });

    console.log("Pedidos filtrados:", filteredOrders);
    renderOrders(filteredOrders);
}

// Função auxiliar para formatar a data do filtro
function formatDateForComparison(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const filterDate = document.getElementById('filter-date');
    if (filterDate) {
        filterDate.addEventListener('change', function() {
            console.log("Evento de mudança de data detectado");
            filterOrders();
        });
    }

    // Adicione este log para verificar se o elemento existe
    console.log("Elemento do filtro de data:", filterDate);


    checkAndFixDates();
        
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

    const searchInput = document.getElementById('search-orders');
    if (searchInput) {
        searchInput.addEventListener('input', filterOrders);
    }

    const filterSelect = document.getElementById('filter-orders');
    if (filterSelect) {
        filterSelect.addEventListener('change', filterOrders);
    }

    // Adicionar botão para voltar ao dashboard
    const dashboardButton = document.createElement('button');
    dashboardButton.textContent = 'Voltar ao Dashboard';
    dashboardButton.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
    document.querySelector('.container').appendChild(dashboardButton);

    // Fechar modais
    document.querySelectorAll('.modal .close').forEach(closeButton => {
        closeButton.addEventListener('click', () => {
            closeButton.closest('.modal').style.display = 'none';
        });
    });

    // Fechar modal se clicar fora dele
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Carregar produtos e carrinho ao iniciar a página
    loadProducts();
    loadCart();
});

// Para fins de depuração, você pode manter estes logs
console.log(JSON.parse(localStorage.getItem('salesHistory')));
console.log(JSON.parse(localStorage.getItem('products')));
console.log(localStorage.getItem('loggedIn'));
checkAndFixDates();