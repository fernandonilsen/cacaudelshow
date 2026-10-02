// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://keepzepbtsuhaeeospgs.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZXB6ZXBidHN1aGFlZW9zcGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NTY1MjgsImV4cCI6MjEwNjUzMjUyOH0.YnyYI46OWXwSKOQ6GZ8xkNM5rQg8WOPc8XgMCgLhiqQ';

// Inicializa o cliente do Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis de estado globais
let usuarios = [];
let produtos = [];
let sacolas = [];
let usuarioLogado = null;

// Elementos DOM
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const sellerDashboard = document.getElementById('seller-dashboard');
const loginForm = document.getElementById('login-form');

// Carregar dados iniciais do Supabase ao abrir a página
async function carregarDadosDoBanco() {
    try {
        const [resUsuarios, resProdutos, resSacolas] = await Promise.all([
            _supabase.from('usuarios').select('*'),
            _supabase.from('produtos').select('*'),
            _supabase.from('sacolas').select('*')
        ]);

        if (resUsuarios.error) throw resUsuarios.error;
        if (resProdutos.error) throw resProdutos.error;
        if (resSacolas.error) throw resSacolas.error;

        usuarios = resUsuarios.data;
        produtos = resProdutos.data;
        sacolas = resSacolas.data;
    } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error.message);
        alert('Erro ao conectar com o banco de dados. Verifique suas credenciais.');
    }
}

// Executa o carregamento inicial
carregarDadosDoBanco();

// Sistema de Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('login-type').value;
    const nomeInput = document.getElementById('username').value.trim().toLowerCase();
    const senhaInput = document.getElementById('password').value;

    // Atualiza os dados para garantir que temos o cadastro mais recente da nuvem
    await carregarDadosDoBanco();

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
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('new-user-name').value.trim();
    const senha = document.getElementById('new-user-pass').value;
    const perfil = document.getElementById('new-user-role').value;

    if (usuarios.some(u => u.nome.toLowerCase() === nome.toLowerCase())) {
        alert('Já existe um usuário com esse nome!');
        return;
    }

    const { error } = await _supabase.from('usuarios').insert([{ nome, senha, perfil }]);

    if (error) {
        alert('Erro ao cadastrar usuário: ' + error.message);
        return;
    }

    await carregarDadosDoBanco();
    userForm.reset();
    atualizarAdmin();
    alert(`Usuário ${nome} (${perfil}) cadastrado com sucesso!`);
});

// --- FUNÇÕES DO ADMINISTRADOR ---
const productForm = document.getElementById('product-form');
const stockTableBody = document.getElementById('stock-table-body');
const bagProductSelect = document.getElementById('bag-product');
const bagSellerSelect = document.getElementById('bag-seller');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('prod-name').value;
    const custo = parseFloat(document.getElementById('prod-cost').value);
    const preco = parseFloat(document.getElementById('prod-price').value);
    const estoque = parseInt(document.getElementById('prod-stock').value);

    const { error } = await _supabase.from('produtos').insert([{ nome, custo, preco, estoque }]);

    if (error) {
        alert('Erro ao cadastrar produto: ' + error.message);
        return;
    }

    await carregarDadosDoBanco();
    productForm.reset();
    atualizarAdmin();
    alert('Produto cadastrado com sucesso!');
});

function atualizarAdmin() {
    stockTableBody.innerHTML = '';
    bagProductSelect.innerHTML = '';
    bagSellerSelect.innerHTML = '';
    
    const userTableBody = document.getElementById('user-table-body');
    if (userTableBody) userTableBody.innerHTML = '';

    // Preencher tabela de estoque e lucro
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

    // Preencher select com os vendedores cadastrados
    const apenasVendedores = usuarios.filter(u => u.perfil === 'vendedor');
    apenasVendedores.forEach(v => {
        bagSellerSelect.innerHTML += `<option value="${v.nome}">${v.nome}</option>`;
    });

    // Preencher tabela de gerenciamento de usuários
    if (userTableBody) {
        usuarios.forEach(u => {
            const botaoAcao = u.nome === 'admin' && u.perfil === 'admin' 
                ? '<span style="color: #7f8c8d; font-size: 0.85rem;">Fixo</span>' 
                : `<button onclick="removerUsuario('${u.nome}')" class="btn-danger-small">Excluir</button>`;

            userTableBody.innerHTML += `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.perfil}</td>
                    <td>${botaoAcao}</td>
                </tr>
            `;
        });
    }
}

// Função para remover usuário
window.removerUsuario = async function(nomeUsuario) {
    if (nomeUsuario.toLowerCase() === usuarioLogado.nome.toLowerCase()) {
        alert('Você não pode excluir a si mesmo enquanto está logado!');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário ${nomeUsuario}?`)) {
        const { error } = await _supabase.from('usuarios').delete().eq('nome', nomeUsuario);
        
        if (error) {
            alert('Erro ao excluir usuário: ' + error.message);
            return;
        }

        // Remove também as sacolas associadas no banco
        await _supabase.from('sacolas').delete().eq('vendedor', nomeUsuario);

        await carregarDadosDoBanco();
        atualizarAdmin();
        alert('Usuário excluído com sucesso!');
    }
};

// Função para remover produto
window.removerProduto = async function(id) {
    if (confirm('Tem certeza que deseja excluir este produto do estoque?')) {
        const { error } = await _supabase.from('produtos').delete().eq('id', id);

        if (error) {
            alert('Erro ao excluir produto: ' + error.message);
            return;
        }

        await carregarDadosDoBanco();
        atualizarAdmin();
        alert('Produto excluído com sucesso!');
    }
};

// Montar Sacola
document.getElementById('bag-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const vendedor = document.getElementById('bag-seller').value;
    const produtoId = parseInt(document.getElementById('bag-product').value);
    const qtd = parseInt(document.getElementById('bag-qty').value);

    const produto = produtos.find(p => p.id === produtoId);

    if (produto.estoque < qtd) {
        alert('Quantidade indisponível no estoque principal!');
        return;
    }

    // Atualiza o estoque do produto no banco
    const novoEstoque = produto.estoque - qtd;
    await _supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', produtoId);

    // Verifica se já existe sacola para esse vendedor e produto
    const itemExistente = sacolas.find(s => s.vendedor === vendedor && s.produto_id === produtoId);
    
    if (itemExistente) {
        const novaQtd = itemExistente.quantidade + qtd;
        await _supabase.from('sacolas').update({ quantidade: novaQtd }).eq('id', itemExistente.id);
    } else {
        await _supabase.from('sacolas').insert([{ vendedor, produto_id: produtoId, quantidade: qtd }]);
    }

    await carregarDadosDoBanco();
    atualizarAdmin();
    alert(`Sacola enviada para o vendedor ${vendedor}!`);
});

// --- FUNÇÕES DO VENDEDOR ---
const sellerBagList = document.getElementById('seller-bag-list');
const saleProductSelect = document.getElementById('sale-product');

async function atualizarVendedor(nomeVendedor) {
    await carregarDadosDoBanco();
    sellerBagList.innerHTML = '';
    saleProductSelect.innerHTML = '';

    const itensSacola = sacolas.filter(s => s.vendedor.toLowerCase() === nomeVendedor.toLowerCase());

    if (itensSacola.length === 0) {
        sellerBagList.innerHTML = '<p>Sua sacola está vazia no momento.</p>';
        return;
    }

    itensSacola.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
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
document.getElementById('quick-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const produtoId = parseInt(document.getElementById('sale-product').value);
    const qtdVendida = parseInt(document.getElementById('sale-qty').value);
    const vendedorAtual = usuarioLogado.nome;

    const itemEncontrado = sacolas.find(s => s.vendedor.toLowerCase() === vendedorAtual.toLowerCase() && s.produto_id === produtoId);

    if (!itemEncontrado || itemEncontrado.quantidade < qtdVendida) {
        alert('Você não tem essa quantidade na sua sacola!');
        return;
    }

    const novaQtdSacola = itemEncontrado.quantidade - qtdVendida;

    if (novaQtdSacola === 0) {
        // Remove o item da sacola se zerar
        await _supabase.from('sacolas').delete().eq('id', itemEncontrado.id);
    } else {
        // Atualiza a quantidade restante na sacola
        await _supabase.from('sacolas').update({ quantidade: novaQtdSacola }).eq('id', itemEncontrado.id);
    }

    await carregarDadosDoBanco();
    atualizarVendedor(vendedorAtual);
    alert('Venda realizada com sucesso! 🎉');
});