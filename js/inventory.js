// Verificar se o usuário está logado
if (!localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
}

let products = JSON.parse(localStorage.getItem('products')) || [];

// Função para gerar código do produto
function generateProductCode(category) {
    const categoryCode = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 3);
    const existingProducts = products.filter(p => p.code.startsWith(categoryCode));
    const nextNumber = existingProducts.length + 1;
    return `${categoryCode}${nextNumber.toString().padStart(4, '0')}`;
}

// Função para formatar valor em Real brasileiro
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para adicionar produto
function addProduct(name, price, quantity, unit, category, image) {
    const code = generateProductCode(category);
    const product = { code, name, price, quantity, unit, category, image };
    products.push(product);
    saveProducts();
    updateProductGrid();
}

// Função para salvar produtos no localStorage
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Função para ordenar produtos alfabeticamente
function sortProductsAlphabetically(products) {
    return products.sort((a, b) => a.name.localeCompare(b.name));
}

// Função para atualizar a grade de produtos
function updateProductGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    
    // Ordenar produtos alfabeticamente
    const sortedProducts = sortProductsAlphabetically([...products]);

    sortedProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <img src="${product.image || 'placeholder.jpg'}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>Código: ${product.code}</p>
            <p>Preço: ${formatCurrency(product.price)}</p>
            <p>Quantidade: ${product.quantity} ${product.unit}</p>
            <p>Categoria: ${product.category}</p>
            <button class="edit-product-button" data-code="${product.code}">Editar</button>
            <button onclick="deleteProduct('${product.code}')">Excluir</button>
        `;
        grid.appendChild(productElement);
    });

    // Reattach event listeners for edit buttons
    addEditListeners();
}

function addEditListeners() {
    const editButtons = document.querySelectorAll('.edit-product-button');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            editProduct(code);
        });
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para editar produto
function editProduct(code) {
    console.log('Função editProduct chamada com código:', code);
    const product = products.find(p => p.code === code);
    console.log('Produto encontrado:', product);
    
    if (product) {
        console.log('Preenchendo formulário de edição');
        document.getElementById('edit-name').value = product.name;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-quantity').value = product.quantity;
        document.getElementById('edit-unit').value = product.unit;
        document.getElementById('edit-category').value = product.category;
        document.getElementById('edit-code').value = product.code;

        const modal = document.getElementById('edit-modal');
        console.log('Exibindo modal');
        modal.classList.add('show');
        console.log('Classe "show" adicionada ao modal');
    } else {
        console.log('Produto não encontrado');
    }
}
   
function closeModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('show');
    console.log('Modal fechado');
}

// Adicione um event listener para o botão de fechar
document.querySelector('.close').addEventListener('click', closeModal);

// Fechar o modal se clicar fora dele
window.addEventListener('click', function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        closeModal();
    }
});

   
// Função para excluir produto
function deleteProduct(code) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        products = products.filter(p => p.code !== code);
        localStorage.setItem('products', JSON.stringify(products));
        updateProductGrid();
    }
}

// Evento de submit do formulário
document.getElementById('product-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const quantity = parseFloat(document.getElementById('product-quantity').value);
    const unit = document.getElementById('product-unit').value;
    const category = document.getElementById('product-category').value;
    const imageFile = document.getElementById('product-image').files[0];

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(event) {
            addProduct(name, price, quantity, unit, category, event.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        addProduct(name, price, quantity, unit, category);
    }

    this.reset();
});

// Adicione esta função de validação
function validateNonNegativeQuantity(input) {
    if (parseFloat(input.value) < 0) {
        input.value = 0;
    }
}

// Evento de submit do formulário de edição
document.getElementById('edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Formulário de edição submetido');
    saveProductChanges();
});

function saveProductChanges() {
    const editedCode = document.getElementById('edit-code').value;
    const editedName = document.getElementById('edit-name').value;
    const editedPrice = parseFloat(document.getElementById('edit-price').value);
    const editedQuantity = Math.max(0, parseFloat(document.getElementById('edit-quantity').value));
    const editedUnit = document.getElementById('edit-unit').value;
    const editedCategory = document.getElementById('edit-category').value;

    const productIndex = products.findIndex(p => p.code === editedCode);
    if (productIndex !== -1) {
        products[productIndex] = {
            ...products[productIndex],
            name: editedName,
            price: editedPrice,
            quantity: editedQuantity,
            unit: editedUnit,
            category: editedCategory
        };

        console.log('Produto atualizado:', products[productIndex]);

        // Atualizar o localStorage
        localStorage.setItem('products', JSON.stringify(products));

        // Atualizar a exibição dos produtos
        updateProductGrid();

        // Fechar o modal
        closeModal();
    } else {
        console.log('Produto não encontrado para atualização');
    }
}

function closeModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('show');
    console.log('Modal fechado');
}

/// Fechar modal
document.getElementsByClassName('close')[0].onclick = function() {
    document.getElementById('edit-modal').style.display = "none";
}

// Fechar modal se clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Carregar produtos ao iniciar a página
updateProductGrid();

// Função de logout
document.getElementById('logout-button').addEventListener('click', function() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
});

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('edit-product-button')) {
        console.log('Botão de edição clicado:', event.target.id);
        const code = event.target.getAttribute('data-code');
        console.log('Código do produto:', code);
        editProduct(code);
    }
});