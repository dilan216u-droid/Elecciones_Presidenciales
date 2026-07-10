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

    if (resGet.status !== 200 && resGet.status !== 404) {
      const errTxt = await resGet.text();
      console.error(`❌ Error al conectar con GitHub (GET): Estado ${resGet.status} - Resp: ${errTxt}`);
      return res.status(500).json({ error: `GitHub rechazó la lectura (Status ${resGet.status}). Revisa tus variables.` });
    }

    let sha = null;
    let votosActuales = [];

    if (resGet.status === 200) {
      const dataGet = await resGet.json();
      sha = dataGet.sha;
      const contenidoTexto = Buffer.from(dataGet.content, 'base64').toString('utf-8');
      votosActuales = JSON.parse(contenidoTexto || '[]');
    }

    // 2. Insertar voto nuevo
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

    // 3. Intentar guardar
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
        message: '🗳️ Nuevo voto registrado',
        content: nuevoContenidoBase64,
        sha: sha
      })
    });

    if (!resPut.ok) {
      const errData = await resPut.text();
      console.error(`❌ Error al guardar en GitHub (PUT): Estado ${resPut.status} - Resp: ${errData}`);
      return res.status(500).json({ error: `GitHub rechazó guardar (Status ${resPut.status}).` });
    }

    return res.status(200).json({ OK: true });

  } catch (error) {
    console.error("❌ Error interno crítico:", error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
