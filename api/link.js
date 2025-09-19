import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Falta el email en la consulta' });
  }

  try {
    // Buscar link asociado al email
    const { data: link, error } = await supabase
      .from('link')
      .select('id, link, numeros, mensaje')
      .eq('email', email)
      .single();

    if (error || !link) {
      return res.status(404).json({ error: 'No se encontró un link para este usuario' });
    }

    return res.status(200).json(link); // Devuelve id, link, numeros y mensaje
  } catch (err) {
    console.error('Error al consultar el link:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
