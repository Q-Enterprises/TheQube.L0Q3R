# Zapier Catch Hook: Drop-in Template + Diagnostic Checklist

## 1) Copy your Catch Hook URL from Zapier
In your Zap:
- Step 1 → **Webhooks by Zapier** → **Catch Hook** → **Copy URL**

It will look like:

```
https://hooks.zapier.com/hooks/catch/123456/abcdef/
```

Paste that into the `$HOOK_URL` variable below.

## 2) PowerShell Test Payload (Template)
Paste this into **Windows PowerShell**:

```powershell
$HOOK_URL = "https://hooks.zapier.com/hooks/catch/PASTE_YOUR_FULL_URL_HERE/"

$payload = @{
  driver_id      = "HAN_PILOT_01"
  lap_time       = "01:32.754"
  sector         = 2
  thermal_state  = "HOT"
  event_ts       = "2026-01-14T12:00:00Z"
  session_id     = "EPOCH_2026_ALPHA"
  merkle_root    = "0x5A4E...ROOT"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri $HOOK_URL `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

**Expected behavior:**
- PowerShell returns almost instantly.
- Zapier Step 1 shows a new request when you click **Test trigger**.

## 3) If Zapier doesn’t capture the request
This is nearly always one of these:
- Wrong URL (old hook, wrong Zap)
- Missing the trailing `/`
- Pasted the “Manage” URL instead of the actual hook URL
- Posting to a different Zap’s hook

**Fix:** re-copy the Catch Hook URL → paste into `$HOOK_URL` → run again.

## 4) Once Step 1 captures, the rest of the Zap unlocks
Build sequence:
1. **Step 1 → Test trigger**
   - Select the newest request.
2. **Step 2 (Code / Formatter)**
   - Confirm `driver_id`, `lap_time`, `sector`, `thermal_state`, etc. are populated.
   - Click **Test step**.
3. **Step 3 (Airtable / Tables / Sheets Upsert)**
   - Field list now appears.
   - Map fields → **Test**.
4. **Paths / Slack**
   - Inherit `event_key`, `lap_time_ms`, and any normalized fields.

## 5) If you want me to embed your URL
Paste:

```
https://hooks.zapier.com/hooks/catch/XXXXXX/YYYYYY/
```

I will return the exact PowerShell command with your URL already inserted — no editing required.
