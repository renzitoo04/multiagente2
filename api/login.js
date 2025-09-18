import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan datos de inicio de sesión' });
  }

  try {
    // Verificar usuario en Supabase
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('email, password, limiteNumeros')
      .eq('email', email.trim())
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.password.trim() !== password.trim()) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    return res.status(200).json({
      email: usuario.email,
      limiteNumeros: usuario.limiteNumeros,
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
