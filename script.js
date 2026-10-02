// Banco de dados simulado no Local Storage
let usuarios = JSON.parse(localStorage.getItem('cs_usuarios')) || [
    { nome: 'admin', senha: '123', perfil: 'admin' },
    { nome: 'vendedor1', senha: '123', perfil: 'vendedor' }
];

let produtos = JSON.parse(localStorage.getItem('cs_produtos')) || [
    { id: 1, nome: 'Trufa Tradicional 30g', custo: 2.50, preco: 5.00, estoque: 20 },
    { id: 2, nome: 'Panetone Trufado', custo: 35.00, preco: 69.90, estoque: 5 }
];

let sacolas = JSON.parse(localStorage.getItem('cs_sacolas')) || [];

// Sessão atual
let usuarioLogado = null;

// Elementos DOM
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const sellerDashboard = document.getElementById('seller-dashboard');
const loginForm = document.getElementById('login-form');

// Sistema de Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('login-type').value;
    const nomeInput = document.getElementById('username').value.trim().toLowerCase();
    const senhaInput = document.getElementById('password').value;

    const userEncontrado = usuarios.find(u => u.nome.toLowerCase() === nomeInput && u.senha === senhaInput && u.perfil === tipo);

    if (userEncontrado) {
        usuarioLogado = userEncontrado;
        loginSection.classList.add('hidden');

        if (tipo === 'admin') {
            adminDashboard.classList.remove('hidden');
            atualizarAdmin();
        } else {
            sellerDashboard.classList.remove('hidden');
            document.getElementById('seller-welcome-title').innerText = `Painel do Vendedor: ${userEncontrado.nome}`;
            atualizarVendedor(userEncontrado.nome);
        }
    } else {
        alert('Usuário, senha ou tipo de acesso incorretos!');
    }
});

// Logout
document.getElementById('logout-admin').addEventListener('click', () => location.reload());
document.getElementById('logout-seller').addEventListener('click', () => location.reload());

// --- CADASTRO DE NOVOS USUÁRIOS (ADMIN) ---
const userForm = document.getElementById('user-form');
userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('new-user-name').value.trim();
    const senha = document.getElementById('new-user-pass').value;
    const perfil = document.getElementById('new-user-role').value;

    if (usuarios.some(u => u.nome.toLowerCase() === nome.toLowerCase())) {
        alert('Já existe um usuário com esse nome!');
        return;
    }

    usuarios.push({ nome, senha, perfil });
    salvarDados();
    userForm.reset();
    atualizarAdmin();
    alert(`Usuário ${nome} (${perfil}) cadastrado com sucesso!`);
});

// --- FUNÇÕES DO ADMINISTRADOR ---
const productForm = document.getElementById('product-form');
const stockTableBody = document.getElementById('stock-table-body');
const bagProductSelect = document.getElementById('bag-product');
const bagSellerSelect = document.getElementById('bag-seller');

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('prod-name').value;
    const custo = parseFloat(document.getElementById('prod-cost').value);
    const preco = parseFloat(document.getElementById('prod-price').value);
    const estoque = parseInt(document.getElementById('prod-stock').value);

    produtos.push({ id: Date.now(), nome, custo, preco, estoque });
    salvarDados();
    productForm.reset();
    atualizarAdmin();
    alert('Produto cadastrado com sucesso!');
});

function atualizarAdmin() {
    stockTableBody.innerHTML = '';
    bagProductSelect.innerHTML = '';
    bagSellerSelect.innerHTML = '';

    // Preencher tabela de estoque e lucro com o botão de excluir
    produtos.forEach(p => {
        const lucroUnitario = p.preco - p.custo;
        const lucroPotencial = lucroUnitario * p.estoque;

        stockTableBody.innerHTML += `
            <tr>
                <td>${p.nome}</td>
                <td>${p.estoque}</td>
                <td>R$ ${p.custo.toFixed(2)}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td style="color: green;">R$ ${lucroUnitario.toFixed(2)}</td>
                <td style="font-weight: bold;">R$ ${lucroPotencial.toFixed(2)}</td>
                <td>
                    <button onclick="removerProduto(${p.id})" class="btn-danger-small">Excluir</button>
                </td>
            </tr>
        `;
        bagProductSelect.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.estoque})</option>`;
    });

    // Preencher select apenas com os vendedores cadastrados
    const apenasVendedores = usuarios.filter(u => u.perfil === 'vendedor');
    apenasVendedores.forEach(v => {
        bagSellerSelect.innerHTML += `<option value="${v.nome}">${v.nome}</option>`;
    });
}

// Função para remover produto
window.removerProduto = function(id) {
    if (confirm('Tem certeza que deseja excluir este produto do estoque?')) {
        produtos = produtos.filter(p => p.id !== id);
        sacolas = sacolas.filter(s => s.produtoId !== id);

        salvarDados();
        atualizarAdmin();
        alert('Produto excluído com sucesso!');
    }
};

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

    produto.estoque -= qtd;
    
    const itemExistente = sacolas.find(s => s.vendedor === vendedor && s.produtoId === produtoId);
    if (itemExistente) {
        itemExistente.quantidade += qtd;
    } else {
        sacolas.push({ vendedor, produtoId, quantidade: qtd });
    }

    salvarDados();
    atualizarAdmin();
    alert(`Sacola enviada para o vendedor ${vendedor}!`);
});

// --- FUNÇÕES DO VENDEDOR ---
const sellerBagList = document.getElementById('seller-bag-list');
const saleProductSelect = document.getElementById('sale-product');

function atualizarVendedor(nomeVendedor) {
    sellerBagList.innerHTML = '';
    saleProductSelect.innerHTML = '';

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

// Registrar Venda Rápida
document.getElementById('quick-sale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const produtoId = parseInt(document.getElementById('sale-product').value);
    const qtdVendida = parseInt(document.getElementById('sale-qty').value);
    const vendedorAtual = usuarioLogado.nome;

    const itemSacola = sacolas.filter(s => s.vendedor.toLowerCase() === vendedorAtual.toLowerCase() && s.produtoId === produtoId);

    const itemEncontrado = itemSacola.find(s => s.produtoId === produtoId);

    if (!itemEncontrado || itemEncontrado.quantidade < qtdVendida) {
        alert('Você não tem essa quantidade na sua sacola!');
        return;
    }

    itemEncontrado.quantidade -= qtdVendida;

    if (itemEncontrado.quantidade === 0) {
        sacolas = sacolas.filter(s => !(s.vendedor.toLowerCase() === vendedorAtual.toLowerCase() && s.produtoId === produtoId));
    }

    salvarDados();
    atualizarVendedor(vendedorAtual);
    alert('Venda realizada com sucesso! 🎉');
});

function salvarDados() {
    localStorage.setItem('cs_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('cs_produtos', JSON.stringify(produtos));
    localStorage.setItem('cs_sacolas', JSON.stringify(sacolas));
}