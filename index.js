// ==============================================================================
// 1. IMPORTACIÓN DE LIBRERÍAS Y MÓDULOS
// ==============================================================================

// Importa el framework Express para crear el servidor web y gestionar las rutas HTTP.
const express = require('express');

// Importa el conector de MySQL que permite enviar consultas SQL a la base de datos.
const mysql = require('mysql2');

// Importa el middleware CORS para que tu frontend pueda hacer peticiones sin ser bloqueado.
const cors = require('cors');

// Carga las variables de entorno definidas en el archivo .env (DB_HOST, DB_USER, etc.).
require('dotenv').config();

// ==============================================================================
// 2. CONFIGURACIÓN E INICIALIZACIÓN DE EXPRESS
// ==============================================================================

// Inicializa la aplicación de Express.
const app = express();

// Activa el middleware de CORS en toda la aplicación.
app.use(cors());

// Permite que Express entienda los datos enviados en formato JSON en el cuerpo de las peticiones (POST/PUT).
app.use(express.json());

// Servir archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static('public'));

// ==============================================================================
// 3. CONEXIÓN A LA BASE DE DATOS (POOL DE CONEXIONES)
// ==============================================================================

// Crea un "Pool de conexiones" reutilizables en lugar de abrir y cerrar conexiones en cada consulta.
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',                  // Servidor de la BD (lee del .env o usa localhost por defecto)
  user: process.env.DB_USER || 'root',                       // Usuario administrador de MySQL
  password: process.env.DB_PASSWORD || '',                   // Contraseña de acceso
  database: process.env.DB_NAME || 'historial_mantenimiento',// Nombre de la base de datos creada
  waitForConnections: true,                                  // Pone las consultas en cola si el pool está lleno
  connectionLimit: 10,                                       // Número máximo de conexiones simultáneas permitidas
  queueLimit: 0                                              // Límite de la cola de espera (0 significa sin límite)
});

// Prueba la conexión al iniciar el servidor para verificar que las credenciales de MySQL son correctas.
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error de conexión a MySQL:', err.message);
  } else {
    console.log('✅ Conectado con éxito a la base de datos MySQL');
    connection.release();
  }
});

// ==============================================================================
// 4. RUTAS DE LA API (ENDPOINTS)
// ==============================================================================

/**
 * RUTA: GET /api/clientes
 * DESCRIPCIÓN: Consulta y devuelve la lista completa de todos los clientes registrados.
 */
app.get('/api/clientes', (req, res) => {
  const query = 'SELECT * FROM clientes ORDER BY fecha_registro DESC';
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * RUTA: GET /api/equipos
 * DESCRIPCIÓN: Consulta los equipos asociando el nombre de su cliente correspondiente.
 */
app.get('/api/equipos', (req, res) => {
  const query = `
    SELECT 
      eq.id_equipo,
      eq.nombre_equipo,
      eq.marca,
      eq.modelo,
      eq.numero_serie,
      c.id_cliente,
      c.nombre_empresa AS cliente,
      c.pais
    FROM equipos eq
    LEFT JOIN clientes c ON eq.id_cliente = c.id_cliente
    ORDER BY eq.id_equipo ASC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * RUTA: GET /api/ingenieros
 * DESCRIPCIÓN: Consulta la lista completa de ingenieros de soporte técnico.
 */
app.get('/api/ingenieros', (req, res) => {
  const query = 'SELECT * FROM ingenieros ORDER BY nombre ASC';
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * RUTA: GET /api/servicios
 * DESCRIPCIÓN: Consulta y devuelve el historial completo de mantenimientos uniendo
 * los datos de clientes, ingenieros y equipos mediante cláusulas JOIN.
 */
app.get('/api/servicios', (req, res) => {
  const query = `
    SELECT 
      os.id_servicio,
      c.id_cliente,
      c.nombre_empresa AS cliente,
      c.pais,
      CONCAT(ing.nombre, ' ', ing.apellido) AS ingeniero,
      ing.estado AS estado_ingeniero,
      ing.id_ingeniero,
      eq.id_equipo,
      eq.nombre_equipo,
      eq.marca,
      eq.modelo,
      os.tipo_mantenimiento,
      os.fecha_servicio,
      os.descripcion_trabajo,
      os.diagnostico,
      os.repuestos_utilizados,
      os.horas_trabajadas,
      os.costo_total,
      os.estado_servicio
    FROM ordenes_servicio os
    JOIN clientes c ON os.id_cliente = c.id_cliente
    JOIN ingenieros ing ON os.id_ingeniero = ing.id_ingeniero
    JOIN equipos eq ON os.id_equipo = eq.id_equipo
    ORDER BY os.fecha_servicio DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * RUTA: GET /api/servicios/cliente/:id_cliente
 * DESCRIPCIÓN: Consulta el historial exclusivo de mantenimientos de un cliente específico.
 */
app.get('/api/servicios/cliente/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;

  const query = `
    SELECT 
      os.id_servicio,
      eq.id_equipo,
      eq.nombre_equipo,
      CONCAT(ing.nombre, ' ', ing.apellido) AS ingeniero,
      os.tipo_mantenimiento,
      os.fecha_servicio,
      os.descripcion_trabajo,
      os.costo_total,
      os.estado_servicio
    FROM ordenes_servicio os
    JOIN equipos eq ON os.id_equipo = eq.id_equipo
    JOIN ingenieros ing ON os.id_ingeniero = ing.id_ingeniero
    WHERE os.id_cliente = ?
    ORDER BY os.fecha_servicio DESC
  `;

  db.query(query, [id_cliente], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/**
 * RUTA: POST /api/clientes
 * DESCRIPCIÓN: Registra un nuevo cliente con id alfanumérico basado en el país (Ej: 507_PA_003).
 */
app.post('/api/clientes', (req, res) => {
  const { id_cliente, nombre_empresa, contacto_principal, telefono, email, direccion, pais } = req.body;

  if (!id_cliente || !nombre_empresa) {
    return res.status(400).json({ error: 'id_cliente y nombre_empresa son obligatorios' });
  }

  const query = `
    INSERT INTO clientes (id_cliente, nombre_empresa, contacto_principal, telefono, email, direccion, pais)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id_cliente, nombre_empresa, contacto_principal, telefono, email, direccion, pais], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Cliente registrado exitosamente', id_cliente });
  });
});

/**
 * RUTA: POST /api/equipos
 * DESCRIPCIÓN: Registra un nuevo equipo asociado a un cliente (Ej: id_equipo 'PA00097').
 */
app.post('/api/equipos', (req, res) => {
  const { id_equipo, id_cliente, nombre_equipo, marca, modelo, numero_serie } = req.body;

  if (!id_equipo || !nombre_equipo || !id_cliente) {
    return res.status(400).json({ error: 'id_equipo, nombre_equipo e id_cliente son obligatorios' });
  }

  const query = `
    INSERT INTO equipos (id_equipo, id_cliente, nombre_equipo, marca, modelo, numero_serie)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id_equipo, id_cliente, nombre_equipo, marca, modelo, numero_serie], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Equipo registrado exitosamente', id_equipo });
  });
});

/**
 * RUTA: POST /api/servicios
 * DESCRIPCIÓN: Crea e inserta una nueva orden de servicio en la base de datos.
 */
app.post('/api/servicios', (req, res) => {
  const {
    id_cliente,
    id_equipo,
    id_ingeniero,
    tipo_mantenimiento,
    fecha_servicio,
    descripcion_trabajo,
    diagnostico,
    repuestos_utilizados,
    horas_trabajadas,
    costo_total,
    estado_servicio
  } = req.body;

  // Validación básica de campos obligatorios
  if (!id_cliente || !id_equipo || !id_ingeniero || !tipo_mantenimiento || !fecha_servicio || !descripcion_trabajo) {
    return res.status(400).json({ error: 'Por favor complete todos los campos requeridos.' });
  }

  const query = `
    INSERT INTO ordenes_servicio 
    (id_cliente, id_equipo, id_ingeniero, tipo_mantenimiento, fecha_servicio, descripcion_trabajo, diagnostico, repuestos_utilizados, horas_trabajadas, costo_total, estado_servicio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id_cliente,
    id_equipo,
    id_ingeniero,
    tipo_mantenimiento,
    fecha_servicio,
    descripcion_trabajo,
    diagnostico || null,
    repuestos_utilizados || null,
    horas_trabajadas || 0,
    costo_total || 0.00,
    estado_servicio || 'completado'
  ];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      mensaje: 'Orden de servicio creada exitosamente',
      id_servicio: result.insertId
    });
  });
});

// ==============================================================================
// 5. ENCENDIDO DEL SERVIDOR
// ==============================================================================

// Asigna el puerto desde la variable de entorno o usa el puerto 3000 por defecto.
const PORT = process.env.PORT || 3000;

const rutasReportes = require('./rutasReportes');
app.use('/api/servicios', rutasReportes(db)); // 'db' es tu objeto de conexión a MySQL

// Pone el servidor a escuchar peticiones en el puerto asignado.
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});