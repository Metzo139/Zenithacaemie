export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formidable = require('formidable');
    const { readFile } = require('fs/promises');
    const { randomUUID } = require('crypto');
    const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const field = key => Array.isArray(fields[key]) ? fields[key][0] : fields[key];
    const file = key => Array.isArray(files[key]) ? files[key][0] : files[key];
    const data = Object.fromEntries(Object.keys(fields).map(key => [key, field(key)]));
    const objectifs = data.objectifs ? JSON.parse(data.objectifs) : [];

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    async function uploadFile(fileKey) {
      const uploadedFile = file(fileKey);
      if (!uploadedFile) return null;
      const originalName = uploadedFile.originalFilename || 'document';
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `preinscriptions/${Date.now()}-${randomUUID()}-${safeName}`;
      const content = await readFile(uploadedFile.filepath);
      const { error } = await supabase.storage.from('backup').upload(storagePath, content, {
        contentType: uploadedFile.mimetype || 'application/octet-stream',
        upsert: false,
      });
      if (error) throw error;
      return storagePath;
    }

    const bulletinsPath = await uploadFile('bulletinsFile');
    const autreDocPath = await uploadFile('autreDocFile');

    const submission = {
      nom: data.nom || null,
      prenom: data.prenom || null,
      naissance: data.naissance || null,
      sexe: data.sexe || null,
      adresse: data.adresse || null,
      tel_parent: data.telParent || null,
      whatsapp: data.whatsapp || null,
      scolarise: data.scolarise || null,
      etablissement: data.etablissement || null,
      classe_actuelle: data.classeActuelle || null,
      classe_visee: data.classeVisee || null,
      projet: data.projet || null,
      a_bulletins: data.aBulletins || null,
      bulletins_file: bulletinsPath,
      autre_doc_file: autreDocPath,
      interesse_foot: data.interesseFoot || null,
      poste: data.poste || null,
      deja_club: data.dejaClub || null,
      nom_club: data.nomClub || null,
      anciennete: data.anciennete || null,
      objectifs: Array.isArray(objectifs) ? objectifs : [],
      connu_par: data.connuPar || null,
      connu_par_autre: data.connuParAutre || null,
      message_libre: data.messageLibre || null,
      resp_nom_prenom: data.respNomPrenom || null,
      lien_eleve: data.lienEleve || null,
      resp_tel: data.respTel || null,
      resp_whatsapp: data.respWhatsapp || null,
      certifie: Boolean(data.certifie),
      auto_contact: Boolean(data.autoContact),
      conditions_accorde: Boolean(data.conditionsAccorde),
      auto_image: data.autoImage || null,
      donnees_accorde: Boolean(data.donneesAccorde),
    };

    const { error } = await supabase.from('preinscriptions').insert([submission]);

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