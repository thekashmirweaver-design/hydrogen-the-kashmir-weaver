# Google Merchant Center credentials

Service account JSON for Merchant API / Merchant Data MCP lives under the repo’s ignored secrets folder.

## File location

```text
secrets/google/merchant-service-account.json
```

Absolute path on this machine:

```text
/Users/iambqc/Desktop/system/hydrogen-the-kashmir-weaver/secrets/google/merchant-service-account.json
```

The entire `secrets/` directory is gitignored (see `.gitignore`). Never commit key files.

## Install or replace the key

1. In [Google Cloud Console](https://console.cloud.google.com/) open project `theta-kingdom-500012-b5`.
2. Create or download a service account key (JSON).
3. Place it at:

```bash
mkdir -p secrets/google
cp /path/to/downloaded-key.json secrets/google/merchant-service-account.json
chmod 600 secrets/google/merchant-service-account.json
```

Expected service account email:

```text
the-kashmir-weaver@theta-kingdom-500012-b5.iam.gserviceaccount.com
```

## Merchant Center access

1. Open Merchant Center account **5822844259** (The Kashmir Weaver).
2. **Settings → Access and users → Add user**.
3. Add the service account email with **Admin** (or Standard with API access).
4. One-time GCP registration (links project `theta-kingdom-500012-b5` to the Merchant account) via `developerRegistration:registerGcp` if API calls return `GCP_NOT_REGISTERED`. See [Register as a developer](https://developers.google.com/merchant/api/guides/quickstart/registration).

Enable **Merchant API** on the GCP project if it is not already enabled.

## Cursor MCP (`merchant-data-mcp`)

In `~/.cursor/mcp.json`:

```json
"merchant-data-mcp": {
  "command": "npx",
  "args": ["-y", "mcp-google-merchant-center"],
  "env": {
    "GOOGLE_APPLICATION_CREDENTIALS": "/Users/iambqc/Desktop/system/hydrogen-the-kashmir-weaver/secrets/google/merchant-service-account.json",
    "MERCHANT_ID": "5822844259"
  }
}
```

After changing the path or key, reload MCP servers in Cursor.

Note: Google’s documented package `@google/merchant-data-mcp` is not published on npm yet. This project uses the community package `mcp-google-merchant-center` with the same service account file. For full catalog / shipping / return-policy work, call Merchant API directly with `GOOGLE_APPLICATION_CREDENTIALS` pointing at the secrets file.

## Local shell usage

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/secrets/google/merchant-service-account.json"
```

## Related store IDs

| Item | Value |
| --- | --- |
| Merchant Center ID | `5822844259` |
| Shopify store | `70yuey-sr.myshopify.com` |
| GCP project | `theta-kingdom-500012-b5` |
| GCP project number | `415908755052` |
