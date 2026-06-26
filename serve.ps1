# serve.ps1 — minimale statische webserver (geen Python/Node nodig).
# Serveert de bestanden in deze map op http://localhost:8000
# Stoppen: druk op Ctrl+C in dit venster.
#
# Gebruik:
#   powershell -ExecutionPolicy Bypass -File serve.ps1
#   (of pas de poort aan met:  -File serve.ps1 -Port 8080 )

param(
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.geojson' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.txt'  = 'text/plain; charset=utf-8'
    '.map'  = 'application/json; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Kon de server niet starten op poort $Port." -ForegroundColor Red
    Write-Host "Misschien is de poort al in gebruik. Probeer een andere: -File serve.ps1 -Port 8080" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Politie Wereldkaart draait!" -ForegroundColor Green
Write-Host "  Open in je browser:  $prefix" -ForegroundColor Cyan
Write-Host "  Map: $root"
Write-Host "  Stoppen: druk Ctrl+C"
Write-Host ""

while ($listener.IsListening) {
    try {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        # Pad bepalen; "/" -> index.html
        $relPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
        if ([string]::IsNullOrEmpty($relPath)) { $relPath = 'index.html' }

        # Beveiliging: blijf binnen de root-map (geen ../ uitbraak)
        $fullPath = Join-Path $root $relPath
        $fullResolved = [System.IO.Path]::GetFullPath($fullPath)
        if (-not $fullResolved.StartsWith([System.IO.Path]::GetFullPath($root))) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        if (Test-Path $fullResolved -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullResolved)
            $ext = [System.IO.Path]::GetExtension($fullResolved).ToLower()
            $ct = $mime[$ext]
            if (-not $ct) { $ct = 'application/octet-stream' }
            $response.ContentType = $ct
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host ("  200  /{0}" -f $relPath) -ForegroundColor DarkGray
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - niet gevonden: /$relPath")
            $response.StatusCode = 404
            $response.ContentType = 'text/plain; charset=utf-8'
            $response.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host ("  404  /{0}" -f $relPath) -ForegroundColor Yellow
        }
        $response.OutputStream.Close()
    } catch {
        # Eén mislukt verzoek mag de server niet platleggen
        Write-Host ("  fout: {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
}
