export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { usuario_discord, opcion_marcada, tipo_eleccion } = req.body;
  if (!usuario_discord || !opcion_marcada || !tipo_eleccion) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  const OWNER = process.env.GITHUB_USER;
  const REPO = process.env.GITHUB_REPO;
  const TOKEN = process.env.GITHUB_TOKEN;
  const FILE_PATH = 'votos.json';

  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    
    // 1. Intentar leer el archivo actual
    const resGet = await fetch(url, {
      headers: { 
        'Authorization': `token ${TOKEN}`, 
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-App'
      }
    });

    let sha = null;
    let votosActuales = [];

    // Si el archivo existe (200), leemos los votos viejos
    if (resGet.status === 200) {
      const dataGet = await resGet.json();
      sha = dataGet.sha;
      const contenidoTexto = Buffer.from(dataGet.content, 'base64').toString('utf-8');
      votosActuales = JSON.parse(contenidoTexto || '[]');
    } 
    // Si da 404, no nos rompemos; simplemente asumimos que está vacío e iniciaremos la lista desde cero
    else if (resGet.status !== 404) {
      const errTxt = await resGet.text();
      console.error(`❌ Error GET GitHub: Estado ${resGet.status} - ${errTxt}`);
      return res.status(500).json({ error: `Error de autenticación con GitHub (Status ${resGet.status}).` });
    }

    // 2. Insertar el nuevo voto
    const ip_votante = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP_DESCONOCIDA';
    const nuevoVoto = {
      id: votosActuales.length + 1,
      usuario_discord,
      ip_votante,
      opcion_marcada,
      tipo_eleccion,
      fecha: new Date().toISOString()
    };
    votosActuales.push(nuevoVoto);

    // 3. Forzar el guardado (si no existía, GitHub lo creará automáticamente ahora)
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
        message: '🗳️ Registro automático de voto',
        content: nuevoContenidoBase64,
        sha: sha // Si es null porque era 404, GitHub entiende que es un archivo nuevo
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
}
