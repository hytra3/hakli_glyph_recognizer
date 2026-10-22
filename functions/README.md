# Hakli community archive — backend functions

Three HTTP Cloud Functions (2nd gen, Node 20) that back the public community
archive. Identity-only auth (Google ID token, no Drive scope). Blobs live in a
public-read GCS bucket; Datastore holds the catalog.

| Function | Method | Auth | Purpose |
|---|---|---|---|
| `submitInscription` | POST | signed-in user | store `.hki` in GCS, index in Datastore |
| `listInscriptions` | GET | public | published, non-hidden inscriptions |
| `setHidden` | POST | curator only | hide / unhide an entry |

## Resources
- Bucket: `hakli-archive-tawkin-blue` (public read, CORS set)
- Datastore kind: `HakliInscription` (default DB, Datastore mode)
- Project: `tawkin-blue`, region `us-central1`

## Deploy (Cloud Shell)

```bash
# Pull latest, then from this folder:
cd ~/hakli_glyph_recognizer/functions   # (git clone/pull first if needed)

CID=533670139668-51vdk21n97p2e9lgubfvmdsnqu3ie2jr.apps.googleusercontent.com

gcloud functions deploy submitInscription \
  --gen2 --runtime=nodejs20 --region=us-central1 --source=. \
  --entry-point=submitInscription --trigger-http --allow-unauthenticated \
  --set-env-vars=BUCKET=hakli-archive-tawkin-blue,DS_KIND=HakliInscription,CLIENT_ID=$CID,CURATOR_EMAILS=marty@heaton.biz

gcloud functions deploy listInscriptions \
  --gen2 --runtime=nodejs20 --region=us-central1 --source=. \
  --entry-point=listInscriptions --trigger-http --allow-unauthenticated \
  --set-env-vars=DS_KIND=HakliInscription

gcloud functions deploy setHidden \
  --gen2 --runtime=nodejs20 --region=us-central1 --source=. \
  --entry-point=setHidden --trigger-http --allow-unauthenticated \
  --set-env-vars=DS_KIND=HakliInscription,CLIENT_ID=$CID,CURATOR_EMAILS=marty@heaton.biz
```

## Composite index (once)

`listInscriptions` filters on two fields and orders by a third, so Datastore
needs a composite index. Create it and wait ~1–2 min for it to finish building:

```bash
gcloud datastore indexes create index.yaml
```

## Notes
- `--allow-unauthenticated` is the *platform* setting. `submitInscription` and
  `setHidden` still require a valid Google ID token inside the function;
  `listInscriptions` is genuinely public.
- Curators are an env var (`CURATOR_EMAILS`, comma-separated). To add one,
  redeploy `setHidden` with the new list.
- For GIS sign-in to work on hudhud.dev, the OAuth client's **Authorized
  JavaScript origins** must include `https://hudhud.dev` (and any test origin).
- After deploy, each command prints a `url:` — collect the three.
