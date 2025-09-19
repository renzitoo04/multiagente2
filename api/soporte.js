import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const indicesRotacion = {}; // Control de índices de rotación por ID

// 👉 Función de acortar link (ahora mismo solo devuelve el original)
async function acortarLink(linkOriginal) {
  try {
    return linkOriginal;
  } catch (error) {
    console.error('Error en la función acortarLink:', error);
    return linkOriginal;
  }
}

export default async function handler(req, res) {
  // ---------------- POST: Crear link ----------------
  if (req.method === 'POST') {
    const { email, numeros, mensaje } = req.body;

    if (!email || !numeros || numeros.length === 0) {
      return res.status(400).json({ error: 'Datos inválidos. Asegúrate de enviar el email, números y mensaje.' });
    }

    // 👉 Ya no se valida la suscripción acá

    // Filtrar números válidos
    const numerosValidos = numeros.filter(num => num !== '' && num !== '+549');
    if (numerosValidos.length === 0) {
      return res.status(400).json({ error: 'No se encontraron números válidos.' });
    }

    try {
      // Verificar si el usuario ya tiene un link
      const { data: linkExistente } = await supabase
        .from('link')
        .select('id')
        .eq('email', email)
        .single();

      if (linkExistente) {
        return res.status(400).json({ error: 'Ya tienes un link generado. No puedes crear más de uno.' });
      }

      // Generar un ID único
      const id = Math.random().toString(36).substring(2, 8);

      // Crear link dinámico
      const linkDinamico = `${req.headers.origin || 'http://localhost:3000'}/api/soporte?id=${id}`;

      // Guardar en Supabase
      const { error } = await supabase
        .from('link')
        .insert([{ id, email, numeros: numerosValidos, mensaje, link: linkDinamico }]);

      if (error) {
        console.error('Error al guardar en Supabase:', error);
        return res.status(500).json({ error: 'Error al guardar la configuración.' });
      }

      return res.status(200).json({ id, link: linkDinamico });
    } catch (error) {
      console.error('Error generando el link:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }

  // ---------------- GET: Usar un link ----------------
  if (req.method === 'GET') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Falta el ID del link.' });
    }

    try {
      // Recuperar datos del link
      const { data: linkData, error } = await supabase
        .from('link')
        .select('numeros, mensaje')
        .eq('id', id)
        .single();

      if (error || !linkData) {
        return res.status(404).json({ error: 'No se encontró el link.' });
      }

      // Registrar click
      try {
        const ip = String((req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')).split(',')[0].trim();
        const ua = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || req.headers['referrer'] || '';
        await supabase
          .from('clicks')
          .insert([{ link_id: id, ip, ua, referer }]);
      } catch (e) {
        console.error('No se pudo registrar el click:', e);
      }

      // Rotación de números
      if (!indicesRotacion[id]) {
        indicesRotacion[id] = 0;
      }
      const numeroSeleccionado = linkData.numeros[indicesRotacion[id]];
      indicesRotacion[id] = (indicesRotacion[id] + 1) % linkData.numeros.length;

      // Redirigir a WhatsApp
      const whatsappLink = `https://wa.me/${numeroSeleccionado}?text=${encodeURIComponent(linkData.mensaje)}`;
      return res.redirect(302, whatsappLink);

    } catch (error) {
      console.error('Error al redirigir:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }

  // ---------------- PATCH: Editar link ----------------
  if (req.method === 'PATCH') {
    const { email, id, numeros, mensaje } = req.body;

    if (!email || !id || !numeros || numeros.length === 0) {
      return res.status(400).json({ error: 'Datos inválidos. Asegúrate de enviar el email, ID, números y mensaje.' });
    }

    const numerosValidos = numeros.filter(num => num !== '' && num !== '+549');
    if (numerosValidos.length === 0) {
      return res.status(400).json({ error: 'No se encontraron números válidos.' });
    }

    try {
      const { error } = await supabase
        .from('link')
        .update({ numeros: numerosValidos, mensaje })
        .eq('id', id)
        .eq('email', email);

      if (error) {
        console.error('Error al actualizar el link en Supabase:', error);
      }

      return res.status(200).json({ message: 'Link actualizado correctamente.' });
    } catch (error) {
      console.error('Error al actualizar el link:', error);
      return res.status(200).json({ message: 'Link actualizado correctamente.' });
    }
  }

  // ---------------- Default ----------------
  return res.status(405).json({ error: 'Método no permitido.' });
}
