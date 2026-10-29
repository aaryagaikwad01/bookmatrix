# BookMatrix for Netlify

This is a separate deployment copy. The original project is unchanged.

## Why the original did not fit Netlify

The original runs a long-lived Express server, writes database.json on disk, and uses an in-memory session store. Static hosting alone cannot run its login and library APIs. This version runs Express in a Netlify Function, stores records in Netlify Blobs, and uses signed, HTTP-only, secure session cookies. It keeps the existing frontend and API paths.

## Deploy the full application

1. Upload the contents of THIS folder to a Git repository. package.json and netlify.toml must be at its root. Do not upload node_modules, real environment files, or your original database.
2. Import that repository into Netlify. If you place this folder inside a larger repository, set the base directory to its path (for example BookMatrix-Netlify).
3. In Netlify environment variables, set SESSION_SECRET to a random secret of at least 32 characters; ADMIN_EMAIL to your administrator email; and ADMIN_PASSWORD to a unique password of at least 12 characters. Give all three variables the Functions scope (or all scopes) and the deploy contexts you need. Keep these private.
4. Deploy. netlify.toml sets the build command to npm run build, publish directory to public, and functions directory to netlify/functions. Node 22 is selected. Netlify installs the locked dependencies before building.
5. Open /api/books on the deployed site. It should return a JSON list of books. Then register a reader, sign in, add a wishlist item, refresh, and sign out. Use the configured admin credentials in the administrator sign-in panel.

Do not drag only public/ into Netlify Drop: that publishes pages without compiling the backend Function. Do not publish the repository root, which contains backend source files. A full Git or CLI deployment is required.

CLI alternative, from this folder after installing the Netlify CLI:

    npm ci
    netlify login
    netlify init
    netlify env:set SESSION_SECRET <your-random-secret>
    netlify env:set ADMIN_EMAIL <your-admin-email>
    netlify env:set ADMIN_PASSWORD <your-admin-password>
    netlify deploy --build --prod

Prefer the Netlify UI for secrets to avoid placing them in shell history. Blobs credentials are provided by Netlify; this app needs no external database token.

## Data and account safety

The deployment seed includes the existing book catalogue and events, not your 11 local users or their borrowing and registration data. Existing local accounts are NOT migrated. Public administrator registration and known demo accounts are disabled in the cloud version; use ADMIN_EMAIL and ADMIN_PASSWORD for the first administrator. These credentials create the first account; changing ADMIN_PASSWORD later does not reset an existing stored password.

Netlify Blobs stores database-v1 in the bookmatrix-data site-wide store. Data survives redeployments. Strong reads and conditional writes prevent silent overwrites: concurrent changes can return 409 and should be retried. A failed storage write returns 503, not a false success. This whole-document storage is intended for a small library/demo, not a high-volume production database. Site-wide data is shared by deploy previews; use a separate Netlify site for isolated testing. Back up the store before deleting the site or store.

Signed session cookies contain the user's basic profile (not their password). They expire after 12 hours; they are signed, not encrypted. Logging out clears the browser cookie; this version does not provide central session revocation. Before a public production launch, add abuse protection/rate limiting, password recovery and account verification, audit logging, and a database suited to your expected traffic.

## Local checks

    npm ci
    npm run build
    npm test

npm start runs the local Express version on port 3000 with a local JSON database. It is a local demo and still provides the original local demo accounts. For the cloud execution path and local Blobs emulation, use netlify dev with the runtime variables configured. Never commit the database after using local demo mode.

## Troubleshooting

- Homepage 404: confirm base directory and publish directory public.
- /api/books 404: confirm the api Function exists and the /api/* rewrite from netlify.toml was applied.
- API 503 mentioning environment variables: set all three variables with Functions scope and redeploy.
- API 503 mentioning storage: inspect the api Function logs and confirm Netlify Blobs is available for the site.
- Old users cannot log in: they were intentionally not included in the deployment seed. Register new readers.

References: https://docs.netlify.com/build/frameworks/framework-setup-guides/express/ and https://docs.netlify.com/build/data-and-storage/netlify-blobs/.
