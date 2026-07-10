module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // 1. Desestructurar los nuevos campos que vienen del front-end
  const { usuario_discord, opcion_marcada, tipo_eleccion, region, ubicacion } = req.body;
  if (!usuario_discord || !opcion_marcada || !tipo_eleccion) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  const OWNER = process.env.GITHUB_USER;
  const REPO = process.env.GITHUB_REPO;
  const TOKEN = process.env.GITHUB_TOKEN;
  const FILE_PATH = 'votos.json';

  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    
    // Intentar leer el archivo actual
    const resGet = await fetch(url, {
      headers: { 
        'Authorization': `token ${TOKEN}`, 
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-App'
      }
    });

    let sha = null;
    let votosActuales = [];

    if (resGet.status === 200) {
      const dataGet = await resGet.json();
      sha = dataGet.sha;
      const contenidoTexto = Buffer.from(dataGet.content, 'base64').toString('utf-8');
      votosActuales = JSON.parse(contenidoTexto || '[]');
    } else if (resGet.status !== 404) {
      const errTxt = await resGet.text();
      console.error(`❌ Error GET GitHub: Estado ${resGet.status} - ${errTxt}`);
      return res.status(500).json({ error: `Error de autenticación con GitHub (Status ${resGet.status}).` });
    }

    // 2. Capturar la IP real del votante considerando el proxy de Vercel
    const ip_votante = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'IP_DESCONOCIDA';

    // 3. CONTROL DE DUPLICADOS: Verificar si la IP ya existe en el histórico de votos
    const ipDuplicada = votosActuales.some(voto => voto.ip_votante === ip_votante && ip_votante !== 'IP_DESCONOCIDA');
    if (ipDuplicada) {
      return res.status(403).json({ 
        error: 'Acceso denegado', 
        mensaje: 'Ya se ha registrado un voto desde esta dirección IP.' 
      });
    }

    // 4. Insertar el nuevo voto incluyendo Región y Ubicación
    const nuevoVoto = {
      id: votosActuales.length + 1,
      usuario_discord,
      region: region || 'No especificada', // Asigna valor por defecto si llega vacío
      ubicacion: ubicacion || 'Desconocido', // Asigna valor por defecto si llega vacío
      ip_votante,
      opcion_marcada,
      tipo_eleccion,
      fecha: new Date().toISOString()
    };
    votosActuales.push(nuevoVoto);

    // Forzar el guardado
    const nuevoContenidoBase64 = Buffer.from(JSON.stringify(votosActuales, null, 2)).toString('base64');

    const resPut = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-App'
      },
      body: JSON.stringify({
        message: '🗳️ Registro automático de voto con filtros de seguridad',
        content: nuevoContenidoBase64,
        sha: sha
      })
    });

    if (!resPut.ok) {
      const errData = await resPut.text();
      console.error(`❌ Error PUT GitHub: Estado ${resPut.status} - ${errData}`);
      return res.status(500).json({ error: `GitHub no permitió guardar el archivo (Status ${resPut.status}).` });
    }

    return res.status(200).json({ OK: true });

  } catch (error) {
    console.error("❌ Error crítico:", error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
