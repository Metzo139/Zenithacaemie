import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) return res.status(401).json({ error: 'Accès non autorisé' });

    const { data, error } = await supabase
      .from('preinscriptions')
      .select('created_at,nom,prenom,naissance,sexe,adresse,tel_parent,whatsapp,scolarise,etablissement,classe_actuelle,classe_visee,projet,a_bulletins,bulletins_file,autre_doc_file,interesse_foot,poste,deja_club,nom_club,anciennete,objectifs,connu_par,connu_par_autre,message_libre,resp_nom_prenom,lien_eleve,resp_tel,resp_whatsapp,certifie,auto_contact,conditions_accorde,auto_image,donnees_accorde')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const byValue = key => (data || []).reduce((result, row) => {
      const value = row[key] || 'Non renseigné';
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {});
    const byMonth = (data || []).reduce((result, row) => {
      const month = new Date(row.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      result[month] = (result[month] || 0) + 1;
      return result;
    }, {});

    return res.status(200).json({
      total: data?.length || 0,
      projects: byValue('projet'),
      sources: byValue('connu_par'),
      months: byMonth,
      documents: {
        bulletins: (data || []).filter(row => row.bulletins_file).length,
        autres: (data || []).filter(row => row.autre_doc_file).length,
      },
      recent: (data || []).slice(0, 10),
      exportRows: data || [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Impossible de charger les statistiques' });
  }
}
