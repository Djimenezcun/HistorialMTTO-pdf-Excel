// URL base de la API REST que expone nuestro servidor backend en Express
// const API_URL = 'http://localhost:3000/api';
// Detecta automáticamente si estás ingresando por localhost o por la URL pública de ngrok
const API_URL = `${window.location.origin}/api`;

// Variable global utilizada para almacenar el catálogo completo de equipos en la memoria del navegador
let equiposGlobales = [];

// Variable global para conservar todos los servicios en memoria
let serviciosGlobales = [];

// Variable global para almacenar los nombres de los ingenieros en estado activo
let nombresIngenierosActivos = [];

// ==============================================================================
// 🆕 CATÁLOGOS DINÁMICOS Y RENDERIZADO DE CHECKBOXES DE REPUESTOS
// ==============================================================================

// Arreglo centralizado con el listado oficial de repuestos disponibles
const listaRepuestos = [
  "Kit de sellos pistón",
  "Grasa neumática",
  "Manómetro Dwyer",
  "Cartucho desecante",
  "Solenoide 24V",
  "Filtro coalescente",
  "O-rings de nitrilo",
  "Regulador SMC 1/4\""
];

// Función para inyectar dinámicamente las casillas de verificación (checkboxes) en el HTML
function renderizarCheckboxesRepuestos() {
  const contenedor = document.getElementById('contenedorRepuestos');
  if (!contenedor) return;

  contenedor.innerHTML = listaRepuestos.map(repuesto => `
    <label class="checkbox-item">
      <input type="checkbox" name="repuestos" value="${repuesto}"> ${repuesto}
    </label>
  `).join('');
}

// Carga inicial al completar la construcción del DOM
document.addEventListener('DOMContentLoaded', () => {
  renderizarCheckboxesRepuestos(); // Inyecta las casillas de repuestos al cargar el DOM
  cargarClientes();                // Inicia la carga de la lista de clientes
  cargarEquipos();                 // Precarga todos los equipos en memoria
  cargarIngenieros();              // Inicia la carga de la lista de ingenieros
  cargarServicios();               // Consulta las órdenes de servicio y llena la tabla
});

// ==============================================================================
// LÓGICA DE CÁLCULO DE HORAS TRABAJADAS
// ==============================================================================

// Función para calcular automáticamente la diferencia en horas entre inicio y fin
function calcularHorasTrabajadas() {
  const inicioVal = document.getElementById('horaInicio').value;
  const finVal = document.getElementById('horaFin').value;

  if (inicioVal && finVal) {
    const [hInicio, mInicio] = inicioVal.split(':').map(Number);
    const [hFin, mFin] = finVal.split(':').map(Number);

    let minutosInicio = hInicio * 60 + mInicio;
    let minutosFin = hFin * 60 + mFin;

    // Si la hora de fin es menor a la de inicio, se asume turno nocturno (pasa de medianoche)
    if (minutosFin < minutosInicio) {
      minutosFin += 24 * 60;
    }

    const diferenciaMinutos = minutosFin - minutosInicio;
    const totalHoras = (diferenciaMinutos / 60).toFixed(2);

    document.getElementById('horasTrabajadas').value = totalHoras;
  }
}

// Escuchadores de eventos para recalcular horas al modificar la hora de inicio o fin
document.getElementById('horaInicio')?.addEventListener('change', calcularHorasTrabajadas);
document.getElementById('horaFin')?.addEventListener('change', calcularHorasTrabajadas);

// ==============================================================================
// CARGA DE CATÁLOGOS (CLIENTES, EQUIPOS E INGENIEROS)
// ==============================================================================

// Función asíncrona encargada de solicitar el catálogo de clientes (GET /api/clientes)
async function cargarClientes() {
  try {
    const res = await fetch(`${API_URL}/clientes`);
    const clientes = await res.json();
    const select = document.getElementById('selectCliente');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un cliente...</option>';
    clientes.forEach(c => {
      select.innerHTML += `<option value="${c.id_cliente}">${c.nombre_empresa} (${c.pais})</option>`;
    });
  } catch (err) {
    console.error('Error al cargar clientes:', err);
  }
}

// Función asíncrona para precargar la totalidad de los equipos (GET /api/equipos)
async function cargarEquipos() {
  try {
    const res = await fetch(`${API_URL}/equipos`);
    equiposGlobales = await res.json();
  } catch (err) {
    console.error('Error al cargar equipos:', err);
  }
}

// Escuchador del evento 'change' en el combo desplegable de clientes para filtrado en tiempo real
document.getElementById('selectCliente')?.addEventListener('change', (e) => {
  const idCliente = e.target.value;
  const selectEquipo = document.getElementById('selectEquipo');
  if (!selectEquipo) return;

  if (!idCliente) {
    selectEquipo.disabled = true;
    selectEquipo.innerHTML = '<option value="">Seleccione primero un cliente</option>';
    return;
  }

  // Filtra los equipos pertenecientes al cliente seleccionado
  const equiposFiltrados = equiposGlobales.filter(eq => eq.id_cliente === idCliente);
  selectEquipo.disabled = false;
  selectEquipo.innerHTML = '<option value="">Seleccione un equipo...</option>';
  
  equiposFiltrados.forEach(eq => {
    selectEquipo.innerHTML += `<option value="${eq.id_equipo}">${eq.id_equipo} ${eq.nombre_equipo} (${eq.marca} ${eq.modelo})</option>`;
  });
});

// Función asíncrona para obtener e identificar a los ingenieros en estado activo
async function cargarIngenieros() {
  try {
    const res = await fetch(`${API_URL}/ingenieros`);
    const ingenieros = await res.json();
    const select = document.getElementById('selectIngeniero');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un ingeniero...</option>';

    // Filtra únicamente los ingenieros activos
    const activos = ingenieros.filter(ing => 
      ing.estado === 'activo' || ing.activo === 1 || ing.activo === true || ing.estado === 1
    );

    // Guarda los nombres en formato minúscula para cruzarlos contra la tabla de historial
    nombresIngenierosActivos = activos.map(ing => `${ing.nombre} ${ing.apellido}`.trim().toLowerCase());

    activos.forEach(ing => {
      select.innerHTML += `<option value="${ing.id_ingeniero}">${ing.nombre} ${ing.apellido}</option>`;
    });
  } catch (err) {
    console.error('Error al cargar ingenieros:', err);
  }
}

// ==============================================================================
// CONSULTA, POBLADO DE FILTROS Y RENDERIZADO DE ÓRDENES
// ==============================================================================

// Función asíncrona para solicitar y renderizar la vista consolidada del historial (GET /api/servicios)
async function cargarServicios() {
  try {
    const res = await fetch(`${API_URL}/servicios`);
    serviciosGlobales = await res.json();
    
    // Llena los combos desplegables de País y Cliente
    poblarDesplegablesFiltro();

    // Muestra por defecto únicamente las últimas 5 órdenes
    renderizarTablaServicios(serviciosGlobales.slice(0, 5));
  } catch (err) {
    console.error('Error al cargar servicios:', err);
  }
}

// Función encargada de llenar las opciones únicas de País y Cliente en los combos de filtro
function poblarDesplegablesFiltro() {
  const selectPais = document.getElementById('filtroPais');
  const selectCliente = document.getElementById('filtroCliente');

  if (!selectPais || !selectCliente) return;

  const paisesUnicos = [...new Set(serviciosGlobales.map(s => s.pais).filter(Boolean))].sort();
  selectPais.innerHTML = '<option value="">Todos los países</option>';
  paisesUnicos.forEach(p => {
    selectPais.innerHTML += `<option value="${p}">${p}</option>`;
  });

  const clientesUnicos = [...new Set(serviciosGlobales.map(s => s.cliente).filter(Boolean))].sort();
  selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
  clientesUnicos.forEach(c => {
    selectCliente.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

// Función central que evalúa los filtros aplicados en memoria
function aplicarFiltros() {
  const paisSeleccionado = document.getElementById('filtroPais').value;
  const clienteSeleccionado = document.getElementById('filtroCliente').value;
  const fechaSeleccionada = document.getElementById('filtroFecha').value;

  if (!paisSeleccionado && !clienteSeleccionado && !fechaSeleccionada) {
    renderizarTablaServicios(serviciosGlobales.slice(0, 5));
    return;
  }

  const resultadosFiltrados = serviciosGlobales.filter(s => {
    const coincidePais = !paisSeleccionado || s.pais === paisSeleccionado;
    const coincideCliente = !clienteSeleccionado || s.cliente === clienteSeleccionado;
    
    let coincideFecha = true;
    if (fechaSeleccionada) {
      const fechaServicioISO = new Date(s.fecha_servicio).toISOString().split('T')[0];
      coincideFecha = fechaServicioISO === fechaSeleccionada;
    }

    return coincidePais && coincideCliente && coincideFecha;
  });

  renderizarTablaServicios(resultadosFiltrados);
}

// Escuchadores de eventos para los filtros
document.getElementById('filtroPais')?.addEventListener('change', aplicarFiltros);
document.getElementById('filtroCliente')?.addEventListener('change', aplicarFiltros);
document.getElementById('filtroFecha')?.addEventListener('change', aplicarFiltros);

// Escuchador para ver únicamente los 5 registros recientes
document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
  document.getElementById('filtroPais').value = '';
  document.getElementById('filtroCliente').value = '';
  document.getElementById('filtroFecha').value = '';
  renderizarTablaServicios(serviciosGlobales.slice(0, 5));
});

// Escuchador para ver todo el historial de mantenimientos
document.getElementById('btnVerTodoHistorial')?.addEventListener('click', () => {
  document.getElementById('filtroPais').value = '';
  document.getElementById('filtroCliente').value = '';
  document.getElementById('filtroFecha').value = '';
  renderizarTablaServicios(serviciosGlobales);
});

// 📊 NUEVO: Escuchador para exportar el reporte a Excel con los filtros seleccionados
document.getElementById('btnExportarExcel')?.addEventListener('click', () => {
  const pais = document.getElementById('filtroPais')?.value || '';
  const cliente = document.getElementById('filtroCliente')?.value || '';
  const fecha = document.getElementById('filtroFecha')?.value || '';

  const queryParams = new URLSearchParams();
  if (pais && pais !== 'Todos los países') queryParams.append('pais', pais);
  if (cliente && cliente !== 'Todos los clientes') queryParams.append('cliente', cliente);
  if (fecha) queryParams.append('fecha', fecha);

  // Redirige directamente al endpoint backend para descargar el Excel (.xlsx)
  window.location.href = `${API_URL}/servicios/export/excel?${queryParams.toString()}`;
});

// Función encargada de renderizar las filas en el <tbody> de la tabla HTML (Con columna Acciones - PDF)
function renderizarTablaServicios(listaServicios) {
  const tbody = document.querySelector('#tablaServicios tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (listaServicios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No se encontraron órdenes de servicio.</td></tr>';
    return;
  }

  listaServicios.forEach(s => {
    const fecha = s.fecha_servicio ? new Date(s.fecha_servicio).toLocaleDateString() : 'N/A';
    const claseTipo = (s.tipo_mantenimiento || '').toLowerCase().replace(/\s+/g, '-');
    
    // Identifica el estado del ingeniero (Activo / Inactivo)
    const nombreIngeniero = (s.ingeniero || '').trim().toLowerCase();
    const esActivo = nombresIngenierosActivos.includes(nombreIngeniero);

    const badgeIngeniero = esActivo 
      ? '<br><small style="color:#16a34a; font-weight:bold;">(Activo)</small>' 
      : '<br><small style="color:#dc2626; font-weight:bold;">(Inactivo)</small>';

    // Etiqueta badge de estado del servicio
    const estadoMin = (s.estado_servicio || 'completado').toLowerCase();
    let badgeEstado = `<span class="badge ${estadoMin}">${s.estado_servicio}</span>`;

    tbody.innerHTML += `
      <tr>
        <td><strong>#${s.id_servicio}</strong></td>
        <td>${fecha}</td>
        <td>${s.cliente || 'N/A'} <br><small style="color:#666;">${s.pais || 'N/A'}</small></td>
        <td>${s.nombre_equipo || 'N/A'} <br><small style="color:#666;">${s.id_equipo || 'N/A'}</small></td>
        <td>${s.ingeniero || 'N/A'} ${badgeIngeniero}</td>
        <td><span class="badge ${claseTipo}">${s.tipo_mantenimiento || 'N/A'}</span></td>
        <td>${badgeEstado}</td>
        
        <!-- 📄 NUEVA CELDA: BOTÓN DE DESCARGA PDF INDIVIDUAL -->
        <td style="text-align: center;">
          <a href="${API_URL}/servicios/${s.id_servicio}/pdf" target="_blank" class="btn-pdf">
            📄 PDF
          </a>
        </td>
      </tr>
    `;
  });
}

// ==============================================================================
// REGISTRO DE NUEVA ORDEN DE SERVICIO (POST)
// ==============================================================================

// Captura el evento del formulario para enviar una nueva orden de servicio (POST /api/servicios)
document.getElementById('formServicio')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Lee todas las casillas (checkboxes) de repuestos marcadas por el usuario
  const checkboxes = document.querySelectorAll('input[name="repuestos"]:checked');
  const repuestosSeleccionados = Array.from(checkboxes).map(cb => cb.value);
  const repuestosTexto = repuestosSeleccionados.length > 0 ? repuestosSeleccionados.join(', ') : 'Ninguno';

  // Empaqueta los campos del formulario en el objeto a enviar a la API REST
  const nuevaOrden = {
    id_cliente: document.getElementById('selectCliente').value,
    id_equipo: document.getElementById('selectEquipo').value,
    id_ingeniero: document.getElementById('selectIngeniero').value,
    tipo_mantenimiento: document.getElementById('tipoMantenimiento').value,
    fecha_servicio: document.getElementById('fechaServicio').value,
    hora_inicio: document.getElementById('horaInicio').value,     // Captura hora inicio
    hora_fin: document.getElementById('horaFin').value,           // Captura hora fin
    descripcion_trabajo: document.getElementById('descripcionTrabajo').value,
    diagnostico: document.getElementById('diagnostico').value || null,
    repuestos_utilizados: repuestosTexto,
    horas_trabajadas: parseFloat(document.getElementById('horasTrabajadas').value) || 0,
    costo_total: parseFloat(document.getElementById('costoTotal')?.value || 0),
    estado_servicio: document.getElementById('estadoServicio').value
  };

  try {
    const res = await fetch(`${API_URL}/servicios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaOrden)
    });

    if (res.ok) {
      alert('✅ Orden de servicio registrada exitosamente');
      document.getElementById('formServicio').reset();
      document.getElementById('selectEquipo').disabled = true;
      
      // Vuelve a renderizar los checkboxes vacíos
      renderizarCheckboxesRepuestos();
      
      // Actualiza la tabla de mantenimientos
      cargarServicios();
    } else {
      const err = await res.json();
      alert(`❌ Error al registrar: ${err.error}`);
    }
  } catch (err) {
    alert('❌ Ocurrió un error al enviar la petición.');
  }
});