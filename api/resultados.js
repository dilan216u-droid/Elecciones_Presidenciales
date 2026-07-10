export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const OWNER = process.env.GITHUB_USER;
  const REPO = process.env.GITHUB_REPO;
  const TOKEN = process.env.GITHUB_TOKEN;
  const FILE_PATH = 'votos.json';

  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const respuesta = await fetch(url, {
      headers: { 
        'Authorization': `token ${TOKEN}`, 
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-Serverless-App'
      }
    });

    if (respuesta.status !== 200) {
      return res.status(200).json({ OK: true, votos: [] });
    }

    const data = await respuesta.json();
    const contenidoTexto = Buffer.from(data.content, 'base64').toString('utf-8');
    const listaVotos = JSON.parse(contenidoTexto || '[]');

    listaVotos.reverse();

    return res.status(200).json({ OK: true, votos: listaVotos });

  } catch (error) {
    console.error("Error al leer archivo:", error);
    return res.status(500).json({ error: 'Error al leer el archivo de votos.' });
  }
}
