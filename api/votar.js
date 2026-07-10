import { createClient } from "@libsql/client";

// Inicialización con las credenciales de tu base de datos Turso
const tursoclient = createClient({
  url: "libsql://votoeleccciones-onugeorp-netizen.aws-us-east-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM2NTExOTksImlkIjoiMDE5ZjQ5ZTUtMDkwMS03ZGM0LTk5OTYtMzMyZjFlYmU4N2QwIiwia2lkIjoiTWVUVVl3UG55RnlQN3MtaUFGTTNpWmJBMGRJOS1PR3FWbXpURU5LS2djcyIsInJpZCI6ImUzOGYxOWY1LTgxYjMtNDgwOS05NGU5LWJkNTVmNzY3NDFjMiJ9.SXijsDDGHR696PZVYAqQmgLomrZx-M9GLcmI7Woz6i6-y_zkxsFKyfocxIhMG_70hATm3vdCYbjEO8sXsXnGCA",
});

export default async function handler(req, res) {
  // Solo aceptamos peticiones POST para guardar información
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { usuario_discord, opcion_marcada, tipo_eleccion } = req.body;

    // Validación interna de seguridad para comprobar que no vengan vacíos
    if (!usuario_discord || !opcion_marcada || !tipo_eleccion) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    // Capturar la IP del votante usando las cabeceras seguras de Vercel
    const ip_votante = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP_DESCONOCIDA';

    // Inserción en la base de datos Turso utilizando sentencias preparadas (evita SQL Injection)
    await tursoclient.execute({
      sql: "INSERT INTO votos (usuario_discord, ip_votante, opcion_marcada, tipo_eleccion) VALUES (?, ?, ?, ?)",
      args: [usuario_discord, ip_votante, opcion_marcada, tipo_eleccion]
    });

    // Respuesta exitosa al frontend
    return res.status(200).json({ OK: true });

  } catch (error) {
    console.error("Error en Turso:", error);
    return res.status(500).json({ error: 'Error del servidor al registrar el voto.' }
                               );
  }
}
