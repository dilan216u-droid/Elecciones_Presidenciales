import { createClient } from "@libsql/client";

// Nueva configuración de la base de datos Turso
const tursoclient = createClient({
  url: "libsql://eleccionescelania-dysaninc-pixel.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM2NTM4NzYsImlkIjoiMDE5ZjRhMGUtMWEwMS03MDA1LTk5NTUtMmVmOTI4ZDg0MDliIiwia2lkIjoiM1lNRk42Sk8yN1R6eDIxdWtOdFRCTnkzbTFZOTFoVVZ6b2JiOXREQnNqQSIsInJpZCI6IjMyNWFlOTI5LTJlMjYtNDhiYi05Yjg5LTQ0NTkzN2VmYzI2YiJ9.-GupWP-uVBYgxZ-UKMwlf-DFbodzlRaH22gKjbkYG_BuUkW591wT3KR1J45tds7h6xqGwctyAspeeQ_ZtKZfBA",
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { usuario_discord, opcion_marcada, tipo_eleccion } = req.body;

    if (!usuario_discord || !opcion_marcada || !tipo_eleccion) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    const ip_votante = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP_DESCONOCIDA';

    await tursoclient.execute({
      sql: "INSERT INTO votos (usuario_discord, ip_votante, opcion_marcada, tipo_eleccion) VALUES (?, ?, ?, ?)",
      args: [usuario_discord, ip_votante, opcion_marcada, tipo_eleccion]
    });

    return res.status(200).json({ OK: true });

  } catch (error) {
    console.error("Error en Turso:", error);
    return res.status(500).json({ error: 'Error del servidor al registrar el voto.' });
  }
}
