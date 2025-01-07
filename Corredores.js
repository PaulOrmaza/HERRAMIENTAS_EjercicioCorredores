const express = require('express'); // Importa la librería Express
const fs = require('fs'); // Para manejar la "Base de Datos" JSON
const app = express(); // Crea una instancia de la aplicación
app.use(express.json()); // Permite manejar datos en formato JSON desde el cliente

// "Base de datos" simulada en un archivo JSON
const DB_PATH = './corredoresDB.json';

// Función para cargar la base de datos desde el archivo JSON
function cargarDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ corredores: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

// Función para guardar la base de datos en el archivo JSON
function guardarDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// GET: Ver todos los corredores
app.get('/corredores', (req, res) => {
    const db = cargarDB();
    res.json(db.corredores);
});

// POST: Agregar corredores manualmente
app.post('/corredores', (req, res) => {
    const { nombre, apellido, edad } = req.body;
    if (!nombre || !apellido || !edad) {
        return res.status(400).send('Todos los campos (nombre, apellido, edad) son obligatorios.');
    }

    const db = cargarDB();
    const nuevoCorredor = {
        id: db.corredores.length + 1,
        nombre,
        apellido,
        edad
    };
    db.corredores.push(nuevoCorredor);
    guardarDB(db);

    res.status(201).json(nuevoCorredor);
});

// PUT: Actualizar un corredor por ID
app.put('/corredores/:id', (req, res) => {
    const corredorId = parseInt(req.params.id);
    const { nombre, apellido, edad } = req.body;

    const db = cargarDB();
    const corredor = db.corredores.find(c => c.id === corredorId);
    if (!corredor) {
        return res.status(404).send('Corredor no encontrado.');
    }

    if (nombre) corredor.nombre = nombre;
    if (apellido) corredor.apellido = apellido;
    if (edad) corredor.edad = edad;

    guardarDB(db);
    res.json(corredor);
});

// DELETE: Eliminar un corredor por ID
app.delete('/corredores/:id', (req, res) => {
    const corredorId = parseInt(req.params.id);

    const db = cargarDB();
    const index = db.corredores.findIndex(c => c.id === corredorId);
    if (index === -1) {
        return res.status(404).send('Corredor no encontrado.');
    }

    db.corredores.splice(index, 1);
    guardarDB(db);

    res.send('Corredor eliminado exitosamente.');
});

// GET: Simular carrera
app.get('/carrera/:numCorredores/:distancia', (req, res) => {
    const numCorredores = parseInt(req.params.numCorredores);
    const distancia = parseFloat(req.params.distancia);

    if (isNaN(numCorredores) || isNaN(distancia) || numCorredores <= 0 || distancia <= 0) {
        return res.status(400).send('El número de corredores y la distancia deben ser números positivos.');
    }

    const db = cargarDB();
    const corredoresDB = db.corredores;

    // Generar corredores aleatorios si no hay suficientes registrados
    if (corredoresDB.length < numCorredores) {
        const corredoresFaltantes = numCorredores - corredoresDB.length;
        for (let i = 0; i < corredoresFaltantes; i++) {
            corredoresDB.push({
                id: corredoresDB.length + 1,
                nombre: `Corredor_${corredoresDB.length + 1}`,
                apellido: '',
                edad: Math.floor(Math.random() * 40) + 20 // Edad aleatoria entre 20 y 60
            });
        }
        guardarDB(db);
    }

    // Seleccionar corredores aleatorios para la carrera
    const corredoresSeleccionados = seleccionarCorredoresAleatorios(corredoresDB, numCorredores);
    const resultadosCarrera = corredoresSeleccionados.map(corredor => ({
        id: corredor.id,
        nombre: corredor.nombre,
        apellido: corredor.apellido,
        velocidad: Math.random() * (15 - 5) + 5, // Velocidad aleatoria entre 5 y 15 km/h
        posicion: 0,
        tiempo: 0 // Tiempo total de cada corredor
    }));

    let tiempo = 0;
    let historial = [];
    let carreraTerminada = false;

    while (!carreraTerminada) {
        tiempo += 1;
        carreraTerminada = true;

        // Actualizar la posición de cada corredor
        resultadosCarrera.forEach(corredor => {
            corredor.posicion += corredor.velocidad;
            if (corredor.posicion < distancia) {
                carreraTerminada = false;
            }
        });

        // Registrar el estado de la carrera
        historial.push(resultadosCarrera.map(c => ({
            id: c.id,
            nombre: c.nombre,
            posicion: c.posicion.toFixed(2),
            tiempo: c.tiempo.toFixed(2)
        }))); // Aquí estamos registrando el tiempo y la posición
    }

    // Asignar el tiempo total de cada corredor
    resultadosCarrera.forEach(corredor => {
        corredor.tiempo = (distancia / corredor.velocidad).toFixed(2);
    });

    // Ordenar los corredores por su tiempo de carrera (menor es mejor)
    resultadosCarrera.sort((a, b) => a.tiempo - b.tiempo);

    // Asignar posiciones (1er lugar, 2do lugar, etc.)
    let posiciones = resultadosCarrera.map((corredor, index) => ({
        puesto: index + 1,
        id: corredor.id,
        nombre: corredor.nombre,
        apellido: corredor.apellido,
        tiempo: corredor.tiempo,
        posicion: corredor.posicion.toFixed(2)
    }));

    // El ganador es el primer corredor en la lista
    const ganador = posiciones[0];

    // Responder con los resultados de la carrera
    res.json({
        mensaje: 'Carrera finalizada',
        historial, // Historial de la carrera con posiciones y tiempos de cada corredor
        ganador, // Solo el ganador será mostrado aquí
        resultados: posiciones // Clasificación completa
    });
});

// Función para seleccionar corredores aleatorios
function seleccionarCorredoresAleatorios(corredores, cantidad) {
    const seleccionados = [];
    const indicesSeleccionados = new Set();

    while (seleccionados.length < cantidad) {
        const indiceAleatorio = Math.floor(Math.random() * corredores.length);
        if (!indicesSeleccionados.has(indiceAleatorio)) {
            indicesSeleccionados.add(indiceAleatorio);
            seleccionados.push(corredores[indiceAleatorio]);
        }
    }

    return seleccionados;
}

// Servidor escuchando en el puerto 3003
app.listen(3003, () => {
    console.log('Servidor ejecutándose en el puerto 3003 🚀');
});
