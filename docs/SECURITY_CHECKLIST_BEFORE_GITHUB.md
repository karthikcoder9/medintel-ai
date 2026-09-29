# Security Checklist Before Pushing MedIntel AI to GitHub

## Must Do

1. Remove or ignore all local environment files.

- Keep `.env` files out of Git.
- Use `.env.example` or `.env.template` files with placeholders only.

2. Rotate any exposed secrets.

- Regenerate API keys, JWT secrets, database passwords, and service tokens if they were ever stored in a local `.env` file or shared in chat.
- Treat any previously exposed secret as compromised.

3. Verify nothing sensitive is committed.

- Check for real API keys, private keys, passwords, access tokens, service account files, and database URLs with credentials embedded.
- Review `git status` before every push.

4. Exclude generated and local-only directories.

- Ignore virtual environments, `node_modules`, build outputs, cache folders, and logs.

5. Keep examples safe.

- Ensure all example env files contain placeholders only.
- Do not place live credentials in `README.md`, docs, or code comments.

## Recommended Checks

- Run a secret scan before pushing.
- Search for patterns like `sk-`, `AIza`, `-----BEGIN PRIVATE KEY-----`, and `mongodb+srv://`.
- Confirm the repo has a root `.gitignore`.
- Confirm backend and frontend environment templates exist.
- Confirm no `.env` files are tracked.

## Notes For This Project

- Backend runtime config should live in `backend/.env` locally only.
- Example values should live in `backend/.env.example`.
- The repository should rely on environment variables for all secret values.
