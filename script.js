// Banco de dados simulado em memória (Local Storage)
let produtos = JSON.parse(localStorage.getItem('cs_produtos')) || [
    { id: 1, nome: 'Trufa Tradicional 30g', custo: 2.50, preco: 5.00, estoque: 20 },
    { id: 2, nome: 'Panetone Trufado', custo: 35.00, preco: 69.90, estoque: 5 }
];

let sacolas = JSON.parse(localStorage.getItem('cs_sacolas')) || []; // { vendedor, produtoId, quantidade }

// Elementos do DOM
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const sellerDashboard = document.getElementById('seller-dashboard');
const loginForm = document.getElementById('login-form');

// Login Simples
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === '123') {
        loginSection.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        atualizarAdmin();
    } else if (user === 'vendedor' && pass === '123') {
        loginSection.classList.add('hidden');
        sellerDashboard.classList.remove('hidden');
        atualizarVendedor('Vendedor Padrão'); // Nome fixo ou customizado para o teste
    } else {
        alert('Usuário ou senha incorretos! Use admin/123 ou vendedor/123');
    }
});

// Logout
document.getElementById('logout-admin').addEventListener('click', () => location.reload());
document.getElementById('logout-seller').addEventListener('click', () => location.reload());

// --- FUNÇÕES DO ADMINISTRADOR ---
const productForm = document.getElementById('product-form');
const stockTableBody = document.getElementById('stock-table-body');
const bagProductSelect = document.getElementById('bag-product');

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('prod-name').value;
    const custo = parseFloat(document.getElementById('prod-cost').value);
    const preco = parseFloat(document.getElementById('prod-price').value);
    const estoque = parseInt(document.getElementById('prod-stock').value);

    const novoProduto = {
        id: Date.now(),
        nome,
        custo,
        preco,
        estoque
    };

    produtos.push(novoProduto);
    salvarDados();
    productForm.reset();
    atualizarAdmin();
    alert('Produto cadastrado com sucesso!');
});

function atualizarAdmin() {
    stockTableBody.innerHTML = '';
    bagProductSelect.innerHTML = '';

    produtos.forEach(p => {
        const lucroUnitario = p.preco - p.custo;
        const lucroPotencial = lucroUnitario * p.estoque;

        // Tabela de estoque
        stockTableBody.innerHTML += `
            <tr>
                <td>${p.nome}</td>
                <td>${p.estoque}</td>
                <td>R$ ${p.custo.toFixed(2)}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td style="color: green;">R$ ${lucroUnitario.toFixed(2)}</td>
                <td style="font-weight: bold;">R$ ${lucroPotencial.toFixed(2)}</td>
            </tr>
        `;

        // Select de produtos para montar sacola
        bagProductSelect.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.estoque})</option>`;
    });
}

// Montar Sacola
document.getElementById('bag-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const vendedor = document.getElementById('bag-seller').value;
    const produtoId = parseInt(document.getElementById('bag-product').value);
    const qtd = parseInt(document.getElementById('bag-qty').value);

    const produto = produtos.find(p => p.id === produtoId);

    if (produto.estoque < qtd) {
        alert('Quantidade indisponível no estoque principal!');
        return;
    }

    // Retira do estoque geral e adiciona na sacola
    produto.estoque -= qtd;
    
    // Verifica se já tem sacola para esse vendedor com esse produto
    const itemExistente = sacolas.find(s => s.vendedor === vendedor && s.produtoId === produtoId);
    if (itemExistente) {
        itemExistente.quantidade += qtd;
    } else {
        sacolas.push({ vendedor, produtoId, quantidade: qtd });
    }

    salvarDados();
    atualizarAdmin();
    alert(`Sacola montada e enviada para ${vendedor}!`);
});

// --- FUNÇÕES DO VENDEDOR ---
const sellerBagList = document.getElementById('seller-bag-list');
const saleProductSelect = document.getElementById('sale-product');

function atualizarVendedor(nomeVendedor) {
    sellerBagList.innerHTML = '';
    saleProductSelect.innerHTML = '';

    // Filtrar itens da sacola deste vendedor
    const itensSacola = sacolas.filter(s => s.vendedor.toLowerCase() === nomeVendedor.toLowerCase());

    if (itensSacola.length === 0) {
        sellerBagList.innerHTML = '<p>Sua sacola está vazia no momento.</p>';
        return;
    }

    itensSacola.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) {
            sellerBagList.innerHTML += `
                <div class="bag-item">
                    <span>${produto.nome}</span>
                    <strong>Qtd: ${item.quantidade} | Preço: R$ ${produto.preco.toFixed(2)} un</strong>
                </div>
            `;
            saleProductSelect.innerHTML += `<option value="${produto.id}">Vender ${produto.nome} (Na sacola: ${item.quantidade})</option>`;
        }
    });
}

// Registrar Venda Rápida pelo Vendedor
document.getElementById('quick-sale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const produtoId = parseInt(document.getElementById('sale-product').value);
    const qtdVendida = parseInt(document.getElementById('sale-qty').value);
    const vendedorAtual = 'Vendedor Padrão'; // Nome do vendedor logado

    const itemSacola = sacolas.find(s => s.vendedor.toLowerCase() === vendedorAtual.toLowerCase() && s.produtoId === produtoId);

    if (!itemSacola || itemSacola.quantidade < qtdVendida) {
        alert('Você não tem essa quantidade na sua sacola!');
        return;
    }

    itemSacola.quantidade -= qtdVendida;

    // Se zerar a quantidade na sacola, remove o item
    if (itemSacola.quantidade === 0) {
        sacolas = sacolas.filter(s => !(s.vendedor.toLowerCase() === vendedorAtual.toLowerCase() && s.produtoId === produtoId));
    }

    salvarDados();
    atualizarVendedor(vendedorAtual);
    alert('Venda realizada com sucesso! 🎉');
});

function salvarDados() {
    localStorage.setItem('cs_produtos', JSON.stringify(produtos));
    localStorage.setItem('cs_sacolas', JSON.stringify(sacolas));
}