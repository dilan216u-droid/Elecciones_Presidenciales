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
    // 1. Obtener el archivo votos.json actual desde GitHub
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const resGet = await fetch(url, {
      headers: { 'Authorization': `token ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    let sha = null;
    let votos actuales = [];

    if (resGet.status === 200) {
      const dataGet = await resGet.json();
      sha = dataGet.sha;
      const contenidoTexto = Buffer.from(dataGet.content, 'base64').toString('utf-8');
      votosActuales = JSON.parse(contenidoTexto || '[]');
    }

    // 2. Crear el nuevo voto
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

    // 3. Subir el archivo actualizado a GitHub
    const nuevoContenidoBase64 = Buffer.from(JSON.stringify(votosActuales, null, 2)).toString('base64');

    const resPut = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: '🗳️ Nuevo voto registrado',
        content: nuevoContenidoBase64,
        sha: sha
      })
    });

    if (!resPut.ok) throw new Error('Error al guardar en GitHub');

    return res.status(200).json({ OK: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error del servidor al procesar el voto local.' });
  }
}
