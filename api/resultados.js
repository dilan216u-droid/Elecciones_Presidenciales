import { createClient } from "@libsql/client";

const tursoclient = createClient({
  url: "libsql://votoeleccciones-onugeorp-netizen.aws-us-east-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM2NTExOTksImlkIjoiMDE5ZjQ5ZTUtMDkwMS03ZGM0LTk5OTYtMzMyZjFlYmU4N2QwIiwia2lkIjoiTWVUVVl3UG55RnlQN3MtaUFGTTNpWmJBMGRJOS1PR3FWbXpURU5LS2djcyIsInJpZCI6ImUzOGYxOWY1LTgxYjMtNDgwOS05NGU5LWJkNTVmNzY3NDFjMiJ9.SXijsDDGHR696PZVYAqQmgLomrZx-M9GLcmI7Woz6i6-y_zkxsFKyfocxIhMG_70hATm3vdCYbjEO8sXsXnGCA",
});

export default async function handler(req, res) {
  // Solo permitimos obtener datos con GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Seleccionamos todos los votos ordenados por fecha descendente
    const resultado = await tursoclient.execute(
      "SELECT id, usuario_discord, ip_votante, opcion_marcada, tipo_eleccion, fecha FROM votos ORDER BY fecha DESC"
    );

    // Turso devuelve las filas en resultado.rows
    return res.status(200).json({ OK: true, votos: resultado.rows });

  } catch (error) {
    console.error("Error al leer de Turso:", error);
    return res.status(500).json({ error: 'Error al obtener los registros de votación.' });
  }
}

