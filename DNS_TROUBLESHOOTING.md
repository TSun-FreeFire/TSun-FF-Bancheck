# DNS Resolution Error Troubleshooting

If you're experiencing DNS resolution errors when the API works fine in your browser, try these solutions:

## Quick Fixes

### 1. Flush DNS Cache (Recommended First Step)
Open PowerShell or Command Prompt **as Administrator** and run:
```powershell
ipconfig /flushdns
```

### 2. Clear Python DNS Cache
Restart your Flask application after flushing DNS cache.

### 3. Check Windows Hosts File
Open `C:\Windows\System32\drivers\etc\hosts` in Notepad as Administrator and ensure there are no entries blocking `tsun-ff-infoxvisits.onrender.com`.

### 4. Temporarily Disable Antivirus/Firewall
Some antivirus software blocks Python's network requests. Try temporarily disabling it to test.

### 5. Check Proxy Settings
If your browser uses a proxy but Python doesn't know about it, add this to your code:

```python
# In app.py, add proxy settings if needed
proxies = {
    'http': 'http://your-proxy:port',
    'https': 'http://your-proxy:port',
}
response = session.get(url, proxies=proxies)
```

### 6. Use Google DNS
Change your DNS servers to Google's public DNS:
- Primary DNS: `8.8.8.8`
- Secondary DNS: `8.8.4.4`

**Steps:**
1. Open Network Connections (Control Panel → Network and Internet → Network Connections)
2. Right-click your active network adapter → Properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties
4. Select "Use the following DNS server addresses"
5. Enter Google DNS addresses
6. Click OK and restart your computer

### 7. Test DNS Resolution
Open PowerShell and test if the domain resolves:
```powershell
nslookup tsun-ff-infoxvisits.onrender.com
```

If this fails, the issue is with your system's DNS configuration.

### 8. Restart Network Adapter
```powershell
# Run as Administrator
netsh winsock reset
netsh int ip reset
ipconfig /release
ipconfig /renew
ipconfig /flushdns
```
Then restart your computer.

## Code-Level Solutions (Already Implemented)

✅ Added retry logic with exponential backoff
✅ Increased timeout to 15 seconds
✅ Added User-Agent headers to mimic browser requests
✅ Created retry session with automatic retries for connection failures

## Testing the Fix

1. Restart your Flask app
2. Try accessing the endpoint
3. Check the console for detailed logs showing retry attempts
4. If it still fails after 3 attempts per API, the issue is with your network/DNS configuration

## Still Not Working?

If none of the above works, you may need to:
- Use a VPN
- Contact your network administrator (if on corporate network)
- Use mobile hotspot temporarily to bypass network restrictions
- Check if render.com domains are blocked by your ISP
