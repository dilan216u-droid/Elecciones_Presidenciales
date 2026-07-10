import { createClient } from "@libsql/client";

// Nueva configuración de la base de datos Turso
const tursoclient = createClient({
  url: "libsql://eleccionescelania-dysaninc-pixel.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM2NTM4NzYsImlkIjoiMDE5ZjRhMGUtMWEwMS03MDA1LTk5NTUtMmVmOTI4ZDg0MDliIiwia2lkIjoiM1lNRk42Sk8yN1R6eDIxdWtOdFRCTnkzbTFZOTFoVVZ6b2JiOXREQnNqQSIsInJpZCI6IjMyNWFlOTI5LTJlMjYtNDhiYi05Yjg5LTQ0NTkzN2VmYzI2YiJ9.-GupWP-uVBYgxZ-UKMwlf-DFbodzlRaH22gKjbkYG_BuUkW591wT3KR1J45tds7h6xqGwctyAspeeQ_ZtKZfBA",
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const resultado = await tursoclient.execute(
      "SELECT id, usuario_discord, ip_votante, opcion_marcada, tipo_eleccion, fecha FROM votos ORDER BY fecha DESC"
    );

    return res.status(200).json({ OK: true, votos: resultado.rows });

  } catch (error) {
    console.error("Error al leer de Turso:", error);
    return res.status(500).json({ error: 'Error al obtener los registros de votación.' });
  }
}
