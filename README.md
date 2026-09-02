# Zénith Académie Guez — Préinscription

A static frontend form for préinscription to Zénith Académie Guez, with Vercel + Supabase storage and PDF download.

## Features

- Responsive, multi-step form with conditional logic
- External CSS and JavaScript for maintainability
- SVG logo fallback
- Consent and conditions step with required checkboxes
- Submissions stored in Supabase through the Vercel endpoint
- PDF recap download after a successful submission
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
    dashboard.js      # Protected KPI endpoint for the admin dashboard
  dashboard.html      # Admin KPI dashboard
  vercel.json         # Vercel configuration
```

## Local Development

The form must be deployed on Vercel (or run through a local server) for `/api/submit` to be available. After a successful submission, the candidate can download a PDF recap. Opening `index.html` directly with `file://` cannot call the API.

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
  - `SUPABASE_ANON_KEY`: Your Supabase anon public key (fallback)
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (recommended for Storage uploads; keep it only in Vercel environment variables)
  - `DASHBOARD_TOKEN`: A long private token used to access `dashboard.html`

## Dashboard KPI

Open `/dashboard.html` on the deployed Vercel URL and enter `DASHBOARD_TOKEN`. The dashboard shows total applications, project distribution, contact sources, monthly activity, document counts and the ten latest applications. The token is kept only for the browser session and the dashboard API uses the service role key server-side.

## Supabase Integration

The endpoint `api/submit.js` stores each submission in the `preinscriptions` table and maps the form fields to the snake_case columns shown below. The files are uploaded to the `backup` Storage bucket under `preinscriptions/`, and their paths are stored in `bulletins_file` and `autre_doc_file`.

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

4. **Create a Storage bucket** named `backup`. Keep it private if files should only be accessible from the Supabase dashboard or through signed URLs.

5. **Allow anonymous inserts in Supabase** when using the anon key. Run this in the SQL editor:
   ```sql
   alter table preinscriptions enable row level security;
   create policy "Allow public form submissions"
   on preinscriptions for insert
   to anon
   with check (true);

  If `SUPABASE_SERVICE_ROLE_KEY` is not configured, also allow uploads to the bucket:
  ```sql
  create policy "Allow public document uploads"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'backup');
  ```
   ```

6. **Install the dependencies** with `npm install`. Vercel installs `@supabase/supabase-js` and `formidable` from the root `package.json`.

## Notes

- The form uses `defer` on the script tag, ensuring DOM is ready before execution.
- All client-side validation is performed before advancing steps.
- The project is designed to be a static site; the submission endpoint is required for Supabase and Storage uploads.
- For production, consider adding spam protection (e.g., hCaptcha) and rate limiting to the endpoint.

## Support

For any issues or questions, please refer to the project documentation or contact the maintainer.

--- 
*Deployed with ❤️ using Vercel*