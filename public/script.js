class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        if (this.token) await this.loadUser();
    }

    bindElements() {
        this.authSection = document.getElementById('auth-section');
        this.loginBtn = document.getElementById('login-btn');
        this.authModal = document.getElementById('auth-modal');
        this.registerModal = document.getElementById('register-modal');
        this.closeBtns = document.querySelectorAll('.close');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.showRegister = document.getElementById('show-register');
    }

    bindEvents() {
        this.loginBtn?.addEventListener('click', () => this.openModal('auth'));
        this.closeBtns.forEach(btn => btn.addEventListener('click', () => this.closeModals()));
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) this.closeModals(); });
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        this.showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModals();
            this.openModal('register');
        });
    }

    openModal(type) {
        if (type === 'auth') this.authModal.style.display = 'block';
        if (type === 'register') this.registerModal.style.display = 'block';
    }

    closeModals() {
        this.authModal.style.display = 'none';
        this.registerModal.style.display = 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        const [email, password] = e.target;
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.value, password: password.value })
            });
            const data = await res.json();
            if (data.success) {
                this.setAuth(data.token, data.user);
                this.closeModals();
                e.target.reset();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Ошибка входа');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const [name, email, password] = e.target;
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.value, email: email.value, password: password.value })
            });
            const data = await res.json();
            if (data.success) {
                this.setAuth(data.token, data.user);
                this.closeModals();
                e.target.reset();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Ошибка регистрации');
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        this.renderAuthenticated();
    }

    renderAuthenticated() {
        this.authSection.innerHTML = `
            <div class="user-menu">
                <img src="${this.user.avatar}" alt="${this.user.name}" class="avatar" id="avatar">
                <div class="dropdown" id="dropdown">
                    <a href="cabinet.html">Личный кабинет</a>
                    <a href="#" id="logout">Выйти</a>
                </div>
            </div>
        `;
        document.getElementById('avatar')?.addEventListener('click', () => {
            document.getElementById('dropdown').classList.toggle('show');
        });
        document.getElementById('logout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    async loadUser() {
        try {
            const res = await fetch('/api/me', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.user) {
                this.user = data.user;
                this.renderAuthenticated();
            } else {
                this.logout();
            }
        } catch (err) {
            this.logout();
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        this.authSection.innerHTML = `<button id="login-btn" class="btn btn-primary">Войти</button>`;
        document.getElementById('login-btn').addEventListener('click', () => this.openModal('auth'));
    }
}

document.addEventListener('DOMContentLoaded', () => new AuthManager());
