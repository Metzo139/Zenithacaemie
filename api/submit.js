/**
 * Vercel serverless endpoint to receive form submissions.
 * For now, it logs the received data and returns a success response.
 * To integrate with Supabase, replace the logic with Supabase client calls.
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Log the received data (in production, remove or use proper logging)
    console.log('Received form submission:', JSON.stringify(data, null, 2));

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('preinscriptions')
      .insert([data]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({
      success: true,
      message: 'Formulaire reçu avec succès'
    });
  } catch (err) {
    console.error('Error processing submission:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}