# Zénith Académie Guez — Préinscription

A static frontend form for préinscription to Zénith Académie Guez, with optional Vercel + Supabase backend integration.

## Features

- Responsive, multi-step form with conditional logic
- External CSS and JavaScript for maintainability
- SVG logo fallback
- Consent and conditions step with required checkboxes
- Auto-advance behaviors:
  - If user selects "Non" for scolarité, jumps to project step
  - If user selects "Études + Football", validates then jumps to situation scolaire step for review
- Ready for deployment on Vercel (static frontend) with optional Supabase backend

## Project Structure

```
/ (root)
  index.html          # Main HTML entry point
  /css
    style.css         # All styling
  /js
    script.js         # Form logic, validation, navigation
  /assets
    logo-zenith.svg   # Fallback logo (also uses logo.png if present)
  /api
    submit.js         # Vercel serverless function (Node.js) for form submission
  vercel.json         # Vercel configuration
```

## Local Development

Simply open `index.html` in a browser. The form is fully functional client-side and will submit via WhatsApp by default.

## Deployment to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy the project**:
   ```bash
   vercel
   ```
   Follow the prompts:
   - Set project name (e.g., `zenith-prescription`)
   - Select framework: `None` (or `Other`)
   - Select build command: `None` (not needed for static)
   - Select output directory: `.` (current directory)
   - Confirm to deploy

   Vercel will automatically detect the `api/` folder and treat `.js` files inside as serverless functions.

4. **Environment Variables** (for Supabase integration):
   After deployment, go to your Vercel project dashboard → Settings → Environment Variables and add:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon public key

## Supabase Integration (Optional)

The provided `api/submit.js` is a stub that logs submissions and returns success. To store submissions in a Supabase database:

1. **Create a Supabase project** at https://supabase.com
2. **Obtain your URL and anon key** from Project Settings → API
3. **Create a table** to store submissions. Example SQL:
   ```sql
   create table preinscriptions (
     id uuid default uuid_generate_v4() primary key,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null,
     nom text,
     prenom text,
     naissance date,
     sexe text,
     adresse text,
     tel_parent text,
     whatsapp text,
     scolarise text,
     etablissement text,
     classe_actuelle text,
     classe_visee text,
     projet text,
     a_bulletins text,
     bulletins_file text,
     autre_doc_file text,
     interesse_foot text,
     poste text,
     deja_club text,
     nom_club text,
     anciennete text,
     objectifs text[],
     connu_par text,
     connu_par_autre text,
     message_libre text,
     resp_nom_prenom text,
     lien_eleve text,
     resp_tel text,
     resp_whatsapp text,
     certifie boolean,
     auto_contact boolean,
     conditions_accorde boolean,
     auto_image text,
     donnees_accorde boolean
   );
   ```
   Adjust column names and types as needed to match the form fields.

4. **Update `api/submit.js`** with the Supabase insertion logic (see the TODO section in the file). Replace the stub with:
   ```javascript
   // Example Supabase insertion (uncomment and adapt after installing supabase)
   /*
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
   
   const { data: insertData, error } = await supabase
     .from('preinscriptions')
     .insert([data]);
   
   if (error) {
     console.error('Supabase error:', error);
     return res.status(500).json({ error: 'Failed to save submission' });
   }
   */
   ```
   Then uncomment and adapt the column names to match your table.

5. **Install Supabase dependency** (if using the Supabase client):
   In the `api/` directory, you can run `npm init -y` and `npm install @supabase/supabase-js`, or rely on Vercel's ability to install dependencies from a `package.json` at the root. For simplicity, you can add a `package.json` in the root:
   ```json
   {
     "name": "zenith-prescription",
     "version": "1.0.0",
     "dependencies": {
       "@supabase/supabase-js": "^2.0.0"
     }
   }
   ```
   Vercel will install dependencies when building the serverless function.

## Switching Form Submission Endpoint

By default, the form submits via WhatsApp (using `buildWhatsAppMessage()` and `submitForm()` in `js/script.js`). To submit to your Vercel endpoint instead:

1. In `js/script.js`, replace the `submitForm()` function with:
   ```javascript
   async function submitForm() {
     try {
       const response = await fetch('/api/submit', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(formData),
       });
   
       const result = await response.json();
   
       if (!response.ok) {
         throw new Error(result.error || 'Submission failed');
       }
   
       // Show success message (you can modify this)
       alert('Votre dossier a été soumis avec succès !');
       currentIndex = visibleSteps().length; // past recap
       showScreen('success');
     } catch (err) {
       console.error('Submission error:', err);
       alert('Erreur lors de la soumission : ' + err.message);
     }
   }
   ```
2. Update the `buildWhatsAppMessage()` function if you no longer need the WhatsApp message (or keep it for fallback).

## Notes

- The form uses `defer` on the script tag, ensuring DOM is ready before execution.
- All client-side validation is performed before advancing steps.
- The project is designed to be a static site; the only serverless component is the optional submission endpoint.
- For production, consider adding spam protection (e.g., hCaptcha) and rate limiting to the endpoint.

## Support

For any issues or questions, please refer to the project documentation or contact the maintainer.

--- 
*Deployed with ❤️ using Vercel*