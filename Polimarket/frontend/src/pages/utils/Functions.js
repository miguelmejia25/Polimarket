const API = "http://127.0.0.1:8000";
let token = localStorage.getItem("token");
let me = JSON.parse(localStorage.getItem("me") || "null");


// --- Autenticación ---

export async function register(name, email, password) {
    const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error de registro');
    }

    return res.json();
}

export async function login(email, password){
    const form = new URLSearchParams({username: email, password});
    const res = await fetch(`${API}/auth/login`, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: form});
    if (!res.ok) {
        alert("Login fallido. Revisa tus credenciales.");
        throw new Error("Login fallido");
    }
    const data = await res.json();
    token = data.access_token; 
    localStorage.setItem('token', token);
    await loadMe(); // Carga los datos del usuario después de iniciar sesión
}

export async function loadMe(){
    if (!token) {
        // Opcional: Redirigir a login si no hay token
        // location.href = 'login.html'; 
        console.log("No hay token, usuario no logueado");
        return;
    }
    try {
        const res = await fetch(`${API}/auth/me`, { headers: {'Authorization': `Bearer ${token}`}});
        if (!res.ok) throw new Error("Token inválido");
        me = await res.json();
        localStorage.setItem('me', JSON.stringify(me));
        updateUserIcon();
    } catch (e) {
        console.error("Sesión expirada", e);
        logout();
    }
}

function updateUserIcon() {
    const icon = document.getElementById('user-icon');
    if (me && icon) {
        icon.textContent = me.name.charAt(0).toUpperCase(); // Pone la inicial
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('me');
    token = null;
    me = null;
    location.href = 'index.html'; // O a una página de login
}

// --- Productos (Comprador) ---

export async function listProducts(){
    const res = await fetch(`${API}/products`);
    const items = await res.json();
    const div = document.getElementById('products');
    if (!div) return;
    
    div.innerHTML = items.map(p => `
        <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
            <img src="${p.image_url || 'placeholder.jpg'}" alt="${p.title}">
            <div class="product-info">
                <div>
                    <h3>${p.title}</h3>
                    <div class="product-price">$${p.price.toFixed(2)}</div>
                </div>
                <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(this, ${p.id})">
                    ♡
                </button>
            </div>
        </div>
    `).join('');
}

function toggleFavorite(btn, productId) {
    // Lógica para añadir a favoritos
    console.log("Toggle favorite for product", productId);
    btn.classList.toggle('liked');
    btn.innerHTML = btn.classList.contains('liked') ? '♥' : '♡';
}

export async function loadProductPage(){
    const params = new URLSearchParams(location.search); 
    const id = params.get('id');
    if (!id) {
        location.href = 'index.html';
        return;
    }
    const p = await (await fetch(`${API}/products/${id}`)).json();
    window.currentProduct = p;
    
    document.getElementById('title').textContent = p.title;
    document.getElementById('desc').textContent = p.description;
    document.getElementById('price').textContent = `$${p.price.toFixed(2)}`;
    document.getElementById('product-image').src = p.image_url || 'placeholder.jpg';
}


// --- Chat (Seguro) ---

/**
 * (MODIFICADO) Inicia un chat y redirige a la sala de chat
 */
export async function startChat() {
    if (!token) {
        alert('Debes iniciar sesión para chatear');
        location.href = 'index.html';
        return; 
    }
    
    try {
        const res = await fetch(`${API}/chats/start?product_id=${window.currentProduct.id}`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            const err = await res.json();
            // Si el chat ya existe, la API devuelve el ID, así que esto es para errores reales
            if (res.status !== 400) { 
                 alert(`Error: ${err.detail}`);
                 return;
            }
        }

        const data = await res.json();
        
        // ¡REDIRECCIÓN!
        location.href = `chat_room.html?id=${data.chat_id}`;

    } catch (e) {
        console.error("Error al iniciar chat", e);
    }
}

let ws;
function openChat(chatId){
    document.getElementById('chat').style.display = 'block';
    
    // Conexión segura: Pasa el token como parámetro
    ws = new WebSocket(`ws://127.0.0.1:8000/ws/chats/${chatId}?token=${encodeURIComponent(token)}`);
    
    ws.onmessage = (ev)=>{
        const m = JSON.parse(ev.data);
        const box = document.getElementById('msgs');
        
        // Determina si el mensaje es 'sent' o 'received'
        const msgClass = (m.author_id === me.id) ? 'sent' : 'received';
        
        box.innerHTML += `
            <div class="msg-bubble ${msgClass}">
                ${m.text}
                <small>${new Date(m.created_at).toLocaleTimeString()}</small>
            </div>
        `;
        box.scrollTop = box.scrollHeight; // Auto-scroll
    };

    ws.onclose = (ev) => {
        console.log("WebSocket cerrado", ev.reason);
        alert("Conexión de chat perdida. Recarga la página.");
    };
    
    ws.onerror = (ev) => {
        console.error("Error de WebSocket", ev);
    };
}


function sendMsg(){
    const input = document.getElementById('msgInput');
    if (input.value.trim() === '') return;
    
    // ¡SEGURO! Solo envía el texto. El backend sabe quién eres.
    ws.send(JSON.stringify({ text: input.value }));
    
    input.value = '';
}


/* ---- Lógica del Dropdown de Filtros ---- */

/**
 * Muestra u oculta el menú desplegable de filtros.
 */
function toggleFilterDropdown(event) {
    // Detiene el clic para que no se propague al 'window' (ver abajo)
    event.stopPropagation(); 
    document.getElementById("filterDropdown").classList.toggle("show");
}

/**
 * Cierra el menú desplegable si el usuario hace clic
 * en cualquier otro lugar de la pantalla.
 */
window.addEventListener('click', function(event) {
    // Comprueba si el clic NO fue dentro del contenedor de filtros
    if (!event.target.closest('.filter-container')) {
        
        var dropdowns = document.getElementsByClassName("filter-dropdown");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});


// EN app.js

/**
 * (NUEVO) Carga la lista de chats en chats.html
 */
export async function loadChatList() {
    if (!token) {
        location.href = 'index.html';
        return;
    }
    try {
        const res = await fetch(`${API}/chats/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("No se pudieron cargar los chats");

        const chats = await res.json();
        const container = document.getElementById('chat-list-container');
        
        if (chats.length === 0) {
            container.innerHTML = '<p>No tienes chats activos.</p>';
            return;
        }

        container.innerHTML = chats.map(chat => {
            // Determina con quién estás hablando
            const otherUser = (me.id === chat.buyer_id) ? chat.seller : chat.buyer;
            return `
                <div classclass="chat-list-item" onclick="location.href='chat_room.html?id=${chat.id}'">
                    <img src="${chat.product.image_url || 'placeholder.jpg'}" class="chat-item-img">
                    <div class="chat-item-info">
                        <h3>${chat.product.title}</h3>
                        <p>Hablando con <strong>${otherUser.name}</strong></p>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        document.getElementById('chat-list-container').innerHTML = '<p>Error al cargar chats.</p>';
    }
}

export async function loadChatRoom() {
    if (!token) {
        location.href = 'index.html';
        return;
    }
    
    const params = new URLSearchParams(location.search);
    const chatId = params.get('id');
    if (!chatId) {
        location.href = 'chats.html';
        return;
    }

    const box = document.getElementById('msgs');
    box.innerHTML = '<p>Cargando historial...</p>';

    try {
        // 1. Cargar historial
        const res = await fetch(`${API}/chats/${chatId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("No se pudo cargar el historial");
        
        const messages = await res.json();
        
        // 2. Renderizar historial
        box.innerHTML = messages.map(m => {
            const msgClass = (m.author_id === me.id) ? 'sent' : 'received';
            return `
                <div class="msg-bubble ${msgClass}">
                    ${m.text}
                    <small>${new Date(m.created_at).toLocaleTimeString()}</small>
                </div>
            `;
        }).join('');
        box.scrollTop = box.scrollHeight;

        // 3. Conectar al WebSocket (la función openChat ya existe)
        openChat(chatId);

    } catch (e) {
        console.error(e);
        box.innerHTML = '<p>Error al cargar el chat. <a href="chats.html">Volver</a></p>';
    }
}