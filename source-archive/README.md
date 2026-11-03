# Full Source Archive

Complete CiscoNetWatch source (all TS/TSX/CSS/config) as gzipped tar, base64-split.

## Restore
```bash
cd source-archive
bash RECONSTRUCT.sh
```

Or: `cat sc_*.b64 | base64 -d | tar -xzf - -C ..`

This is the **complete** source for Claude to deploy to Vercel + Supabase.
