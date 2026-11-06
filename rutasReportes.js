// ==============================================================================
// 1. IMPORTACIÓN DE LIBRERÍAS
// ==============================================================================

// Importa el framework Express para gestionar el enrutador modular.
const express = require('express');

// Crea una instancia del enrutador de Express para definir sub-rutas independientes.
const router = express.Router();

// Importa ExcelJS para construir y formatear hojas de cálculo (.xlsx) dinámicamente.
const ExcelJS = require('exceljs');

// Importa PDFKit para generar documentos PDF dinámicos desde el servidor.
const PDFDocument = require('pdfkit');

// ==============================================================================
// 2. EXPORTACIÓN DEL MÓDULO RECIBIENDO LA BASE DE DATOS
// ==============================================================================

// Exportamos una función que recibe la conexión de la base de datos 'db' desde index.js.
module.exports = (db) => {

  // ----------------------------------------------------------------------------
  // RUTA 1: GET /api/servicios/export/excel
  // DESCRIPCIÓN: Genera un reporte descargable en Excel filtrado según parámetros.
  // ----------------------------------------------------------------------------
  router.get('/export/excel', (req, res) => {
    // Extrae los parámetros opcionales enviados por la URL (Ej: ?pais=Panama&fecha=2026-11-05)
    const { pais, cliente, fecha } = req.query;

    // Consulta SQL base uniendo las tablas ordenes_servicio, clientes, ingenieros y equipos
    let query = `
      SELECT 
        os.id_servicio,
        os.fecha_servicio,
        c.nombre_empresa AS cliente,
        c.pais,
        eq.nombre_equipo,
        CONCAT(ing.nombre, ' ', ing.apellido) AS ingeniero,
        os.tipo_mantenimiento,
        os.costo_total,
        os.estado_servicio
      FROM ordenes_servicio os
      JOIN clientes c ON os.id_cliente = c.id_cliente
      JOIN ingenieros ing ON os.id_ingeniero = ing.id_ingeniero
      JOIN equipos eq ON os.id_equipo = eq.id_equipo
      WHERE 1=1
    `;

    // Arreglo para almacenar los valores dinámicos y prevenir inyecciones SQL
    const params = [];

    // Si el usuario seleccionó un país específico, agregamos la condición SQL
    if (pais && pais !== 'Todos los países') {
      query += ' AND c.pais = ?';
      params.push(pais);
    }

    // Si seleccionó un cliente específico, agregamos la condición SQL
    if (cliente && cliente !== 'Todos los clientes') {
      query += ' AND os.id_cliente = ?';
      params.push(cliente);
    }

    // Si seleccionó una fecha específica, agregamos la condición SQL
    if (fecha) {
      query += ' AND os.fecha_servicio = ?';
      params.push(fecha);
    }

    // Ordenamos los resultados por fecha descendente (los más recientes primero)
    query += ' ORDER BY os.fecha_servicio DESC';

    // Ejecutamos la consulta en MySQL mediante callback tradicional
    db.query(query, params, async (err, filas) => {
      if (err) {
        console.error('Error SQL al generar Excel:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // Crea un libro de trabajo de Excel nuevo
      const workbook = new ExcelJS.Workbook();
      // Crea una pestaña/hoja llamada 'Historial Mantenimiento'
      const worksheet = workbook.addWorksheet('Historial Mantenimiento');

      // Define la estructura de las columnas: encabezado, clave de los datos y ancho
      worksheet.columns = [
        { header: 'ID', key: 'id_servicio', width: 10 },
        { header: 'Fecha', key: 'fecha_servicio', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 25 },
        { header: 'País', key: 'pais', width: 15 },
        { header: 'Equipo', key: 'nombre_equipo', width: 20 },
        { header: 'Ingeniero', key: 'ingeniero', width: 25 },
        { header: 'Tipo', key: 'tipo_mantenimiento', width: 20 },
        { header: 'Costo ($)', key: 'costo_total', width: 15 },
        { header: 'Estado', key: 'estado_servicio', width: 15 }
      ];

      // Aplica estilo a la primera fila (Encabezado): texto en negrita y blanco
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

      // Aplica fondo verde (estilo corporativo Excel) a la primera fila
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16A34A' }
      };

      // Recorre cada registro devuelto por MySQL e insértalo como una fila en la hoja
      filas.forEach(f => {
        worksheet.addRow({
          ...f,
          // Formatea la fecha para mostrar solo YYYY-MM-DD sin la hora
          fecha_servicio: f.fecha_servicio ? new Date(f.fecha_servicio).toISOString().split('T')[0] : ''
        });
      });

      // Define el tipo de contenido HTTP como hoja de cálculo (.xlsx)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      // Fuerza al navegador a descargar el archivo con un nombre dinámico basado en la fecha actual
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Historial_Filtrado_${Date.now()}.xlsx`
      );

      // Transmite la hoja de cálculo generada hacia la respuesta del navegador y finaliza
      await workbook.xlsx.write(res);
      res.end();
    });
  });

  // ----------------------------------------------------------------------------
  // RUTA 2: GET /api/servicios/:id/pdf
  // DESCRIPCIÓN: Genera la Ficha Técnica de Mantenimiento en PDF con campos específicos.
  // ----------------------------------------------------------------------------
  router.get('/:id/pdf', (req, res) => {
    // Captura el ID del servicio desde la URL de la petición (Ej: /api/servicios/15/pdf)
    const { id } = req.params;

    // Consulta SQL uniendo las tablas para traer todos los detalles de la orden
    const query = `
      SELECT 
        os.*,
        c.nombre_empresa AS cliente, c.pais,
        eq.nombre_equipo, eq.marca, eq.modelo,
        CONCAT(ing.nombre, ' ', ing.apellido) AS ingeniero
      FROM ordenes_servicio os
      JOIN clientes c ON os.id_cliente = c.id_cliente
      JOIN ingenieros ing ON os.id_ingeniero = ing.id_ingeniero
      JOIN equipos eq ON os.id_equipo = eq.id_equipo
      WHERE os.id_servicio = ?
    `;

    // Ejecuta la consulta SQL pasando el id sanitizado para evitar inyección SQL
    db.query(query, [id], (err, filas) => {
      // Manejo de errores de base de datos
      if (err) {
        console.error('Error SQL al generar PDF:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // Validación en caso de que no exista ninguna orden registrada con ese ID
      if (!filas || filas.length === 0) {
        return res.status(404).send('La orden de servicio solicitada no existe.');
      }

      // Almacena en la variable 's' el primer resultado obtenido de la consulta
      const s = filas[0];

      // Instancia un nuevo documento PDF con margen uniforme de 40 puntos
      const doc = new PDFDocument({ margin: 40 });

      // Configura las cabeceras HTTP necesarias para entregar un archivo PDF al navegador
      res.setHeader('Content-Type', 'application/pdf');
      // 'inline' permite visualizar el PDF directamente en la pestaña del navegador en lugar de forzar descarga
      res.setHeader('Content-Disposition', `inline; filename=Orden_Servicio_${id}.pdf`);

      // Conecta la salida de PDFKit directamente con el flujo de respuesta HTTP (res)
      doc.pipe(res);

      // --- ENCABEZADO DEL DOCUMENTO ---
      // Dibuja el título principal en azul (#1E40AF) y tamaño 18 centrado
      doc.fontSize(18).fillColor('#1E40AF').text('ORDEN DE SERVICIO DE MANTENIMIENTO', { align: 'center' });
      // Dibuja el subtítulo con el ID de la orden en gris (#4B5563) y tamaño 12 centrado
      doc.fontSize(12).fillColor('#4B5563').text(`N° de Orden: ${s.id_servicio}`, { align: 'center' });
      // Inserta un espacio vertical hacia abajo equivalente a 1.5 líneas
      doc.moveDown(1.5);

      // --- BLOQUE DE INFORMACIÓN GENERAL ---
      // Establece tamaño 10 y color de fuente negro (#000000) para los campos principales
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Cliente: ${s.cliente || 'N/A'} (País: ${s.pais || 'N/A'})`);
      
      // Concatena marca y modelo en una sola línea de manera limpia
      const detalleMarcaModelo = s.marca ? ` (${s.marca} - ${s.modelo || 'N/A'})` : '';
      doc.text(`Equipo: ${s.nombre_equipo || 'N/A'}${detalleMarcaModelo}`);
      
      doc.text(`Ingeniero Asignado: ${s.ingeniero || 'N/A'}`);
      doc.text(`Tipo de Mantenimiento: ${s.tipo_mantenimiento || 'N/A'}`);
      doc.text(`Fecha del Servicio: ${s.fecha_servicio ? new Date(s.fecha_servicio).toISOString().split('T')[0] : 'N/A'}`);
      doc.moveDown(0.5);

      // --- HORARIOS Y DURACIÓN ---
      // Visualización de las horas de inicio, fin y total trabajadas (Costo Total fue excluido)
      doc.text(`Hora Inicio: ${s.hora_inicio || 'N/A'} | Hora Fin: ${s.hora_fin || 'N/A'}`);
      doc.text(`Total Horas Trabajadas: ${s.horas_trabajadas || 0} hrs`);
      doc.text(`Estado del Servicio: ${s.estado_servicio || 'N/A'}`);
      doc.moveDown(1.5);

      // --- SECCIÓN 1: DESCRIPCIÓN DEL TRABAJO ---
      // Encabezado de sección en azul y texto descriptivo en gris oscuro (#1F2937)
      doc.fontSize(12).fillColor('#1E40AF').text('Descripción del Trabajo:');
      doc.fontSize(10).fillColor('#1F2937').text(s.descripcion_trabajo || 'Sin descripción registrada');
      doc.moveDown();

      // --- SECCIÓN 2: DIAGNÓSTICO TÉCNICO ---
      doc.fontSize(12).fillColor('#1E40AF').text('Diagnóstico Técnico:');
      doc.fontSize(10).fillColor('#1F2937').text(s.diagnostico || 'Sin diagnóstico registrado');
      doc.moveDown();

      // --- SECCIÓN 3: REPUESTOS UTILIZADOS ---
      doc.fontSize(12).fillColor('#1E40AF').text('Repuestos Utilizados:');
      doc.fontSize(10).fillColor('#1F2937').text(s.repuestos_utilizados || 'Ninguno');

      // Finaliza la escritura del documento y libera la respuesta HTTP
      doc.end();
    });
  });

  // Retornamos el router configurado para ser consumido por express en index.js
  return router;
};