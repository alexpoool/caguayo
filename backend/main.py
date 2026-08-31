import os
import sys
import logging
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.routes import api_router
from src.database.connection import set_current_db
from src.middleware.logging import LoggingMiddleware
from src.core.exceptions import (
    AppError,
    NotFoundError,
    ValidationError,
    BusinessLogicError,
)
from src.models import (
    Anexo,
    Categorias,
    Dependencia,
    Liquidacion,
    Moneda,
    Movimiento,
    Productos,
    Subcategorias,
    TipoDependencia,
    TipoMovimiento,
    Transaccion,
    Ventas,
    Provincia,
    Municipio,
    Cuenta,
    Grupo,
    Usuario,
    TipoContrato,
    EstadoContrato,
    ProductosEnLiquidacion,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

load_dotenv(override=True)

__all_models__ = [
    Anexo,
    Categorias,
    Dependencia,
    Liquidacion,
    Moneda,
    Movimiento,
    Productos,
    Subcategorias,
    TipoDependencia,
    TipoMovimiento,
    Transaccion,
    Ventas,
    Provincia,
    Municipio,
    Cuenta,
    Grupo,
    Usuario,
    TipoContrato,
    EstadoContrato,
    ProductosEnLiquidacion,
]

app = FastAPI(
    title="Caguayo",
    description="Documentación oficial de la API del ERP Caguayo",
    version="1.0.0",
    redirect_slashes=False,
)

default_origins = [
    "http://10.0.0.15:5173",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

cors_origins_str = os.getenv("CORS_ORIGINS", "")
if cors_origins_str:
    cors_origins = [
        origin.strip() for origin in cors_origins_str.split(",") if origin.strip()
    ]
else:
    cors_origins = default_origins

logging.info(f"CORS_ORIGINS loaded: {cors_origins}")

# app.add_middleware(LoggingMiddleware)

app.include_router(api_router)


# ─── Frontend: Página de Gestión de Usuarios ────────────────────────────────


@app.get("/usuarios-lista")
async def usuarios_lista_frontend():
    from fastapi.responses import HTMLResponse

    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Usuarios - Caguayo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0f172a; color: #e2e8f0; min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: #1e293b; border-bottom: 1px solid #334155;
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
        }
        header h1 { font-size: 1.4rem; color: #38bdf8; }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-info span { color: #94a3b8; font-size: 0.9rem; }
        .btn {
            padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;
            font-size: 0.9rem; font-weight: 500; transition: all 0.2s;
        }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-success { background: #22c55e; color: white; }
        .btn-success:hover { background: #16a34a; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: #475569; color: white; }
        .btn-secondary:hover { background: #64748b; }
        .btn-sm { padding: 5px 10px; font-size: 0.8rem; }
        .btn-icon { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 5px 8px; }
        .btn-icon:hover { border-color: #3b82f6; color: #3b82f6; }
        .btn-icon.danger:hover { border-color: #ef4444; color: #ef4444; }

        /* Login */
        .login-container { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 60px); }
        .login-card {
            background: #1e293b; border: 1px solid #334155; border-radius: 12px;
            padding: 40px; width: 100%; max-width: 420px;
        }
        .login-card h2 { text-align: center; margin-bottom: 8px; color: #38bdf8; }
        .login-card p { text-align: center; color: #94a3b8; margin-bottom: 24px; font-size: 0.9rem; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.85rem; font-weight: 500; }
        .form-group input, .form-group select {
            width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #475569;
            border-radius: 8px; color: #e2e8f0; font-size: 0.95rem; transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
        .form-group input::placeholder { color: #64748b; }
        .login-card .btn { width: 100%; padding: 12px; margin-top: 8px; font-size: 1rem; }
        .error-msg { color: #f87171; text-align: center; margin-top: 12px; font-size: 0.85rem; display: none; }

        /* Table */
        .table-container { margin-top: 20px; }
        .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .table-header h2 { color: #f1f5f9; font-size: 1.2rem; }
        .table-actions { display: flex; gap: 8px; align-items: center; }
        .table-stats { color: #94a3b8; font-size: 0.85rem; }
        .search-box {
            padding: 8px 14px; background: #1e293b; border: 1px solid #475569;
            border-radius: 8px; color: #e2e8f0; font-size: 0.9rem; width: 250px;
        }
        .search-box:focus { outline: none; border-color: #3b82f6; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
        thead { background: #334155; }
        th { padding: 12px 16px; text-align: left; color: #94a3b8; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 12px 16px; border-top: 1px solid #334155; font-size: 0.9rem; }
        tr:hover td { background: #253349; }
        .alias-badge {
            background: #1e3a5f; color: #38bdf8; padding: 4px 10px; border-radius: 6px;
            font-family: 'Courier New', monospace; font-size: 0.85rem; font-weight: 600;
        }
        .password-cell {
            font-family: 'Courier New', monospace; font-size: 0.75rem; color: #fbbf24;
            max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            cursor: pointer; position: relative;
        }
        .password-cell:hover { white-space: normal; word-break: break-all; }
        .password-cell .copy-hint {
            display: none; position: absolute; top: -28px; right: 0;
            background: #334155; color: #e2e8f0; padding: 4px 8px; border-radius: 4px;
            font-size: 0.7rem; white-space: nowrap;
        }
        .password-cell:hover .copy-hint { display: block; }
        .actions-cell { display: flex; gap: 6px; }
        .loading { text-align: center; padding: 40px; color: #94a3b8; }
        .loading .spinner {
            border: 3px solid #334155; border-top: 3px solid #3b82f6; border-radius: 50%;
            width: 36px; height: 36px; animation: spin 0.8s linear infinite; margin: 0 auto 12px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
        .empty-state .icon { font-size: 3rem; margin-bottom: 12px; }
        .db-badge { background: #1e3a5f; color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; }
        .toast {
            position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white;
            padding: 10px 20px; border-radius: 8px; font-size: 0.85rem;
            opacity: 0; transform: translateY(10px); transition: all 0.3s; z-index: 1000;
        }
        .toast.error { background: #ef4444; }
        .toast.show { opacity: 1; transform: translateY(0); }

        /* Modal */
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 900; opacity: 0; pointer-events: none; transition: opacity 0.2s;
        }
        .modal-overlay.active { opacity: 1; pointer-events: all; }
        .modal {
            background: #1e293b; border: 1px solid #334155; border-radius: 12px;
            padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;
            transform: translateY(20px); transition: transform 0.2s;
        }
        .modal-overlay.active .modal { transform: translateY(0); }
        .modal h2 { color: #38bdf8; margin-bottom: 20px; font-size: 1.2rem; }
        .modal .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

        /* Confirm dialog */
        .confirm-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 950; opacity: 0; pointer-events: none; transition: opacity 0.2s;
        }
        .confirm-overlay.active { opacity: 1; pointer-events: all; }
        .confirm-box {
            background: #1e293b; border: 1px solid #475569; border-radius: 12px;
            padding: 28px; width: 100%; max-width: 400px; text-align: center;
        }
        .confirm-box .icon { font-size: 3rem; margin-bottom: 12px; }
        .confirm-box h3 { margin-bottom: 8px; color: #f1f5f9; }
        .confirm-box p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px; }
        .confirm-box .confirm-actions { display: flex; gap: 10px; justify-content: center; }

        /* Pagination */
        .pagination {
            display: flex; justify-content: center; align-items: center; gap: 6px;
            margin-top: 16px; flex-wrap: wrap;
        }
        .pagination .btn-page {
            min-width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
            padding: 0 10px; border: 1px solid #475569; background: #1e293b; color: #e2e8f0;
            border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
        }
        .pagination .btn-page:hover { border-color: #3b82f6; color: #3b82f6; }
        .pagination .btn-page.active { background: #3b82f6; color: white; border-color: #3b82f6; }
        .pagination .btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
        .pagination .page-info { color: #94a3b8; font-size: 0.85rem; margin: 0 8px; }
        .per-page-select {
            padding: 6px 10px; background: #0f172a; border: 1px solid #475569;
            border-radius: 6px; color: #e2e8f0; font-size: 0.85rem; cursor: pointer;
        }
        .per-page-select:focus { outline: none; border-color: #3b82f6; }

        #app { display: none; }
    </style>
</head>
<body>
    <!-- Login Section -->
    <div id="login-section">
        <header>
            <h1>&#127970; Caguayo - Usuarios</h1>
        </header>
        <div class="login-container">
            <div class="login-card">
                <h2>Iniciar Sesión</h2>
                <p>Ingresa tus credenciales para gestionar los usuarios</p>
                <form id="login-form">
                    <div class="form-group">
                        <label>Base de datos</label>
                        <select id="base_datos" required>
                            <option value="">Cargando bases de datos...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Alias</label>
                        <input type="text" id="alias" placeholder="Tu alias de usuario" required>
                    </div>
                    <div class="form-group">
                        <label>Contraseña</label>
                        <input type="password" id="contrasenia" placeholder="Tu contraseña" required>
                    </div>
                    <button type="submit" class="btn btn-primary" id="login-btn">Iniciar Sesión</button>
                    <div class="error-msg" id="login-error"></div>
                </form>
            </div>
        </div>
    </div>

    <!-- App Section -->
    <div id="app">
        <header>
            <h1>&#127970; Caguayo - Usuarios</h1>
            <div class="user-info">
                <span class="db-badge" id="current-db"></span>
                <span id="current-user"></span>
                <button class="btn btn-danger btn-sm" onclick="logout()">Cerrar Sesión</button>
            </div>
        </header>
        <div class="container">
            <div class="table-container">
                <div class="table-header">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <h2>&#128203; Usuarios de la Base de Datos</h2>
                        <span class="table-stats" id="table-stats"></span>
                    </div>
                    <div class="table-actions">
                        <div style="position:relative;display:inline-block;">
                            <input type="text" class="search-box" id="search-box" placeholder="Buscar por alias, nombre, CI, cargo..." oninput="filterUsuarios()" style="padding-left:32px;">
                            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#64748b;font-size:0.9rem;">&#128269;</span>
                        </div>
                        <button class="btn btn-success" onclick="openCreateModal()">&#10010; Nuevo Usuario</button>
                    </div>
                </div>
                <div id="table-content">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Cargando usuarios...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" id="modal-overlay" onclick="closeModal(event)">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modal-title">Nuevo Usuario</h2>
            <form id="usuario-form" onsubmit="submitUsuario(event)">
                <input type="hidden" id="edit-id">
                <div class="form-row">
                    <div class="form-group">
                        <label>CI *</label>
                        <input type="text" id="form-ci" placeholder="Cédula de identidad" required>
                    </div>
                    <div class="form-group">
                        <label>Alias *</label>
                        <input type="text" id="form-alias" placeholder="Alias de usuario" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" id="form-nombre" placeholder="Nombre" required>
                    </div>
                    <div class="form-group">
                        <label>Primer Apellido *</label>
                        <input type="text" id="form-primer-apellido" placeholder="Primer apellido" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Segundo Apellido</label>
                        <input type="text" id="form-segundo-apellido" placeholder="Segundo apellido">
                    </div>
                    <div class="form-group">
                        <label>Cargo</label>
                        <input type="text" id="form-cargo" placeholder="Cargo">
                    </div>
                </div>
                <div class="form-group">
                    <label>Contraseña <span id="password-hint" style="color:#94a3b8;font-weight:400;">*</span></label>
                    <input type="password" id="form-contrasenia" placeholder="Contraseña del usuario">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Grupo *</label>
                        <select id="form-grupo" required>
                            <option value="">Seleccionar grupo...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dependencia</label>
                        <select id="form-dependencia">
                            <option value="">Seleccionar dependencia...</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="form-submit-btn">Crear Usuario</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <div class="confirm-overlay" id="confirm-overlay">
        <div class="confirm-box">
            <div class="icon">&#9888;&#65039;</div>
            <h3>¿Eliminar usuario?</h3>
            <p id="confirm-text">Se eliminará permanentemente este usuario.</p>
            <div class="confirm-actions">
                <button class="btn btn-secondary" onclick="closeConfirm()">Cancelar</button>
                <button class="btn btn-danger" id="confirm-delete-btn">Eliminar</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const API_BASE = window.location.origin + '/api/v1';
        let token = localStorage.getItem('token');
        let userData = null;
        let allUsuarios = [];
        let filteredUsuarios = [];
        let dependencias = [];
        let grupos = [];
        let currentPage = 1;
        let perPage = 20;
        let totalPages = 1;

        if (token) { checkSession(); } else { loadBasesDatos(); }

        async function loadBasesDatos() {
            try {
                const res = await fetch(API_BASE + '/conexiones');
                const data = await res.json();
                const sel = document.getElementById('base_datos');
                sel.innerHTML = '<option value="">Seleccionar base de datos...</option>';
                data.forEach(db => {
                    const o = document.createElement('option');
                    o.value = db.nombre_database; o.textContent = db.nombre_database;
                    sel.appendChild(o);
                });
            } catch (e) { console.error('Error cargando DBs:', e); }
        }

        async function checkSession() {
            try {
                const res = await fetch(API_BASE + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
                if (res.ok) { const d = await res.json(); userData = d; showApp(d); }
                else { localStorage.removeItem('token'); loadBasesDatos(); }
            } catch (e) { localStorage.removeItem('token'); loadBasesDatos(); }
        }

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const errEl = document.getElementById('login-error');
            btn.disabled = true; btn.textContent = 'Iniciando sesión...'; errEl.style.display = 'none';
            try {
                const res = await fetch(API_BASE + '/auth/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alias: document.getElementById('alias').value,
                        contrasenia: document.getElementById('contrasenia').value,
                        base_datos: document.getElementById('base_datos').value
                    })
                });
                if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Credenciales inválidas'); }
                const data = await res.json();
                token = data.token; userData = data; localStorage.setItem('token', token);
                showApp(data);
            } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
            finally { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
        });

        function showApp(data) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            document.getElementById('current-user').textContent = data.usuario.nombre + ' ' + data.usuario.primer_apellido;
            document.getElementById('current-db').textContent = '\\u2601 ' + data.base_datos;
            loadUsuarios();
            loadDependencias();
            loadGrupos();
        }

        function authHeaders() { return { 'Authorization': 'Bearer ' + token }; }

        async function loadUsuarios() {
            const content = document.getElementById('table-content');
            content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando usuarios...</p></div>';
            try {
                const res = await fetch(API_BASE + '/usuarios-lista', { headers: authHeaders() });
                if (!res.ok) { if (res.status === 401) { logout(); return; } throw new Error('Error al cargar'); }
                allUsuarios = await res.json();
                renderTable(allUsuarios);
            } catch (err) {
                content.innerHTML = '<div class="empty-state"><div class="icon">\u26A0\uFE0F</div><p>Error: ' + escapeHtml(err.message) + '</p></div>';
            }
        }

        async function loadDependencias() {
            try {
                const res = await fetch(API_BASE + '/usuarios-lista/dependencias', { headers: authHeaders() });
                if (res.ok) dependencias = await res.json();
            } catch (e) {}
        }

        async function loadGrupos() {
            try {
                const res = await fetch(API_BASE + '/usuarios-lista/grupos', { headers: authHeaders() });
                if (res.ok) grupos = await res.json();
            } catch (e) {}
        }

        function renderTable(usuarios) {
            filteredUsuarios = usuarios;
            totalPages = Math.max(1, Math.ceil(usuarios.length / perPage));
            if (currentPage > totalPages) currentPage = totalPages;

            const content = document.getElementById('table-content');
            document.getElementById('table-stats').textContent = usuarios.length + ' usuario(s)';

            if (usuarios.length === 0) {
                content.innerHTML = '<div class="empty-state"><div class="icon">&#128100;</div><p>No hay usuarios en esta base de datos</p></div>';
                return;
            }

            const start = (currentPage - 1) * perPage;
            const end = Math.min(start + perPage, usuarios.length);
            const pageItems = usuarios.slice(start, end);

            let html = '<table><thead><tr>';
            html += '<th>#</th><th>CI</th><th>Nombre</th><th>Alias</th><th>Contraseña</th><th>Cargo</th><th>Acciones</th>';
            html += '</tr></thead><tbody>';
            pageItems.forEach((u, i) => {
                const nombre = [u.nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ');
                const globalIdx = start + i + 1;
                html += '<tr>';
                html += '<td>' + globalIdx + '</td>';
                html += '<td>' + escapeHtml(u.ci) + '</td>';
                html += '<td>' + escapeHtml(nombre) + '</td>';
                html += '<td><span class="alias-badge">' + escapeHtml(u.alias) + '</span></td>';
                html += '<td class="password-cell" onclick="copyPassword(\\'' + escapeAttr(u.contrasenia) + '\\')">';
                html += '<span class="copy-hint">Click para copiar</span>' + escapeHtml(u.contrasenia) + '</td>';
                html += '<td>' + escapeHtml(u.cargo || '-') + '</td>';
                html += '<td class="actions-cell">';
                html += '<button class="btn btn-icon" title="Editar" onclick="openEditModal(' + u.id_usuario + ')">&#9998;</button>';
                html += '<button class="btn btn-icon danger" title="Eliminar" onclick="openConfirm(' + u.id_usuario + ', \\'' + escapeAttr(u.alias) + '\\')">&#128465;</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table>';

            html += '<div class="pagination">';
            html += '<button class="btn-page" onclick="goToPage(1)" ' + (currentPage === 1 ? 'disabled' : '') + '>&laquo;</button>';
            html += '<button class="btn-page" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '>&lsaquo;</button>';

            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

            if (startPage > 1) { html += '<button class="btn-page" onclick="goToPage(1)">1</button>'; if (startPage > 2) html += '<span class="page-info">...</span>'; }
            for (let p = startPage; p <= endPage; p++) {
                html += '<button class="btn-page' + (p === currentPage ? ' active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
            }
            if (endPage < totalPages) { if (endPage < totalPages - 1) html += '<span class="page-info">...</span>'; html += '<button class="btn-page" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>'; }

            html += '<button class="btn-page" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>&rsaquo;</button>';
            html += '<button class="btn-page" onclick="goToPage(' + totalPages + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>&raquo;</button>';
            html += '<span class="page-info">' + start + 1 + '-' + end + ' de ' + usuarios.length + '</span>';
            html += '<select class="per-page-select" onchange="changePerPage(this.value)">';
            [10, 20, 50, 100].forEach(n => { html += '<option value="' + n + '"' + (n === perPage ? ' selected' : '') + '>' + n + ' / pág</option>'; });
            html += '</select>';
            html += '</div>';

            content.innerHTML = html;
        }

        function goToPage(page) {
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            renderTable(filteredUsuarios);
            document.getElementById('table-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function changePerPage(val) {
            perPage = parseInt(val);
            currentPage = 1;
            renderTable(filteredUsuarios);
        }

        function filterUsuarios() {
            const q = document.getElementById('search-box').value.toLowerCase().trim();
            currentPage = 1;
            if (!q) { renderTable(allUsuarios); return; }
            const filtered = allUsuarios.filter(u => {
                const nombre = [u.nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ').toLowerCase();
                return u.alias.toLowerCase().includes(q) || u.ci.toLowerCase().includes(q) || nombre.includes(q) || (u.cargo && u.cargo.toLowerCase().includes(q));
            });
            renderTable(filtered);
        }

        function populateSelects() {
            const grupoSel = document.getElementById('form-grupo');
            grupoSel.innerHTML = '<option value="">Seleccionar grupo...</option>';
            grupos.forEach(g => {
                const o = document.createElement('option');
                o.value = g.id_grupo; o.textContent = g.nombre;
                grupoSel.appendChild(o);
            });
            const depSel = document.getElementById('form-dependencia');
            depSel.innerHTML = '<option value="">Seleccionar dependencia...</option>';
            dependencias.forEach(d => {
                const o = document.createElement('option');
                o.value = d.id_dependencia; o.textContent = d.nombre;
                depSel.appendChild(o);
            });
        }

        function openCreateModal() {
            document.getElementById('modal-title').textContent = 'Nuevo Usuario';
            document.getElementById('form-submit-btn').textContent = 'Crear Usuario';
            document.getElementById('edit-id').value = '';
            document.getElementById('password-hint').textContent = '*';
            document.getElementById('form-contrasenia').required = true;
            document.getElementById('usuario-form').reset();
            populateSelects();
            document.getElementById('modal-overlay').classList.add('active');
        }

        function openEditModal(id) {
            const u = allUsuarios.find(x => x.id_usuario === id);
            if (!u) return;
            document.getElementById('modal-title').textContent = 'Editar Usuario';
            document.getElementById('form-submit-btn').textContent = 'Guardar Cambios';
            document.getElementById('edit-id').value = u.id_usuario;
            document.getElementById('password-hint').textContent = '(dejar vacío para no cambiar)';
            document.getElementById('form-contrasenia').required = false;
            populateSelects();
            document.getElementById('form-ci').value = u.ci;
            document.getElementById('form-alias').value = u.alias;
            document.getElementById('form-nombre').value = u.nombre;
            document.getElementById('form-primer-apellido').value = u.primer_apellido;
            document.getElementById('form-segundo-apellido').value = u.segundo_apellido || '';
            document.getElementById('form-cargo').value = u.cargo || '';
            document.getElementById('form-contrasenia').value = '';
            document.getElementById('form-grupo').value = u.id_grupo || '';
            document.getElementById('form-dependencia').value = u.id_dependencia || '';
            document.getElementById('modal-overlay').classList.add('active');
        }

        function closeModal(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('modal-overlay').classList.remove('active');
        }

        async function submitUsuario(e) {
            e.preventDefault();
            const editId = document.getElementById('edit-id').value;
            const body = {
                ci: document.getElementById('form-ci').value,
                nombre: document.getElementById('form-nombre').value,
                primer_apellido: document.getElementById('form-primer-apellido').value,
                segundo_apellido: document.getElementById('form-segundo-apellido').value || null,
                alias: document.getElementById('form-alias').value,
                cargo: document.getElementById('form-cargo').value || null,
                id_grupo: parseInt(document.getElementById('form-grupo').value),
                id_dependencia: document.getElementById('form-dependencia').value ? parseInt(document.getElementById('form-dependencia').value) : null,
            };
            const pw = document.getElementById('form-contrasenia').value;
            if (editId) {
                if (pw) body.contrasenia = pw;
                try {
                    const res = await fetch(API_BASE + '/usuarios-lista/' + editId, {
                        method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
                    showToast('Usuario actualizado correctamente');
                    closeModal(); loadUsuarios();
                } catch (err) { showToast(err.message, true); }
            } else {
                if (!pw) { showToast('La contraseña es requerida para crear un usuario', true); return; }
                body.contrasenia = pw;
                try {
                    const res = await fetch(API_BASE + '/usuarios-lista', {
                        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
                    showToast('Usuario creado correctamente');
                    closeModal(); loadUsuarios();
                } catch (err) { showToast(err.message, true); }
            }
        }

        function openConfirm(id, alias) {
            document.getElementById('confirm-text').textContent = 'Se eliminará permanentemente al usuario "' + alias + '".';
            document.getElementById('confirm-delete-btn').onclick = () => deleteUser(id);
            document.getElementById('confirm-overlay').classList.add('active');
        }

        function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('active'); }

        async function deleteUser(id) {
            try {
                const res = await fetch(API_BASE + '/usuarios-lista/' + id, {
                    method: 'DELETE', headers: authHeaders()
                });
                if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
                showToast('Usuario eliminado');
                closeConfirm(); loadUsuarios();
            } catch (err) { showToast(err.message, true); closeConfirm(); }
        }

        function copyPassword(hash) {
            navigator.clipboard.writeText(hash).then(() => showToast('Contraseña copiada'));
        }

        function escapeHtml(s) {
            if (!s) return '';
            const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
        }

        function escapeAttr(s) {
            return (s || '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
        }

        function showToast(msg, isError) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast' + (isError ? ' error' : '');
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        function logout() {
            fetch(API_BASE + '/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
            token = null; userData = null; localStorage.removeItem('token');
            document.getElementById('app').style.display = 'none';
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('table-content').innerHTML = '';
            document.getElementById('table-stats').textContent = '';
            loadBasesDatos();
        }
    </script>
</body>
</html>"""
    return HTMLResponse(content=html)


@app.middleware("http")
async def database_middleware(request: Request, call_next):
    """Set the database context from the JWT token in the Authorization header."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "")
            from jose import jwt

            SECRET_KEY = os.getenv("SECRET_KEY")
            if not SECRET_KEY:
                raise RuntimeError("SECRET_KEY environment variable is required")
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            base_datos = payload.get("base_datos")
            if base_datos:
                from urllib.parse import urlparse
                from src.database.connection import AUTH_DATABASE

                parsed = urlparse(os.getenv("DATABASE_URL", ""))
                actual_db = parsed.path.lstrip("/")
                if base_datos == actual_db:
                    set_current_db(AUTH_DATABASE)
                else:
                    set_current_db(base_datos)
    except Exception:
        pass
    response = await call_next(request)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "API de Caguayo funcionando"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    status_map = {
        NotFoundError: 404,
        ValidationError: 422,
        BusinessLogicError: 400,
    }
    status = status_map.get(type(exc), exc.status_code)
    logging.getLogger(__name__).warning(
        f"AppError handled: type={type(exc).__name__}, status={status}, detail={exc.message}"
    )
    return JSONResponse(status_code=status, content={"detail": exc.message})


if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
