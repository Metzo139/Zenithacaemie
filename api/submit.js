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
    const file = key => {
      if (!files) return null;
      // Recherche insensible au format (camelCase, snake_case, kebab-case)
      const targetKey = Object.keys(files).find(k => k.toLowerCase() === key.toLowerCase());
      const target = targetKey ? files[targetKey] : files[key];
      return Array.isArray(target) ? target[0] : target;
    };

    const data = Object.fromEntries(Object.keys(fields).map(key => [key, field(key)]));
    const objectifs = data.objectifs ? JSON.parse(data.objectifs) : [];

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    async function uploadFile(fileKey) {
      const uploadedFile = file(fileKey);
      if (!uploadedFile || !uploadedFile.filepath) return null;
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

    // Recherche des fichiers avec plusieurs variantes de noms possibles
    const bulletinsPath = await uploadFile('bulletins_file') || await uploadFile('bulletinsFile') || await uploadFile('bulletins-file');
    const autreDocPath = await uploadFile('autre_doc_file') || await uploadFile('autreDocFile') || await uploadFile('autre-doc-file');

    const submission = {
      nom: data.nom || null,
      prenom: data.prenom || null,
      naissance: data.naissance || null,
      sexe: data.sexe || null,
      adresse: data.adresse || null,
      tel_parent: data.telParent || data.tel_parent || null,
      whatsapp: data.whatsapp || null,
      scolarise: data.scolarise || null,
      etablissement: data.etablissement || null,
      classe_actuelle: data.classeActuelle || data.classe_actuelle || null,
      classe_visee: data.classeVisee || data.classe_visee || null,
      projet: data.projet || null,
      a_bulletins: data.aBulletins || data.a_bulletins || null,
      bulletins_file: bulletinsPath,
      autre_doc_file: autreDocPath,
      interesse_foot: data.interesseFoot || data.interesse_foot || null,
      poste: data.poste || null,
      deja_club: data.dejaClub || data.deja_club || null,
      nom_club: data.nomClub || data.nom_club || null,
      anciennete: data.anciennete || null,
      objectifs: Array.isArray(objectifs) ? objectifs : [],
      connu_par: data.connuPar || data.connu_par || null,
      connu_par_autre: data.connuParAutre || data.connu_par_autre || null,
      message_libre: data.messageLibre || data.message_libre || null,
      resp_nom_prenom: data.respNomPrenom || data.resp_nom_prenom || null,
      lien_eleve: data.lienEleve || data.lien_eleve || null,
      resp_tel: data.respTel || data.resp_tel || null,
      resp_whatsapp: data.respWhatsapp || data.resp_whatsapp || null,
      certifie: Boolean(data.certifie),
      auto_contact: Boolean(data.autoContact || data.auto_contact),
      conditions_accorde: Boolean(data.conditionsAccorde || data.conditions_accorde),
      auto_image: data.autoImage || data.auto_image || null,
      donnees_accorde: Boolean(data.donneesAccorde || data.donnees_accorde),
    };

    const { error } = await supabase.from('preinscriptions').insert([submission]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message || 'Failed to save submission' });
    }

    return res.status(200).json({
      success: true,
      message: 'Formulaire reçu avec succès'
    });
  } catch (err) {
    console.error('Error processing submission:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}