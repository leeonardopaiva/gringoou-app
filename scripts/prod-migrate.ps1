# Aplica as migrations pendentes no banco de PRODUÇÃO (Neon), com conferências de segurança.
# Uso (na raiz do projeto):  powershell -ExecutionPolicy Bypass -File scripts/prod-migrate.ps1
#
# - Lê DATABASE_URL e DIRECT_URL de .env.vercel.production (arquivo local, ignorado pelo git; NUNCA versionar).
# - Não imprime as URLs (só o host). Define as variáveis apenas neste processo e as remove ao final.
# - Só aplica depois de você confirmar o host e a lista de pendências. Nunca usa migrate dev/reset.

$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Get-Location) '.env.vercel.production'
if (-not (Test-Path $envFile)) { throw "Arquivo $envFile não encontrado. Baixe/copie as variáveis de produção para ele (fica fora do git)." }

foreach ($name in 'DATABASE_URL', 'DIRECT_URL') {
  $line = Get-Content $envFile | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if (-not $line) { throw "$name não encontrada em .env.vercel.production." }
  [Environment]::SetEnvironmentVariable($name, ($line -replace "^$name=", '').Trim().Trim('"').Trim("'"), 'Process')
}

try {
  $dbHost = ([uri]$env:DATABASE_URL).Host
  $directHost = ([uri]$env:DIRECT_URL).Host
  Write-Host "Host (pooled): $dbHost"
  Write-Host "Host (direto): $directHost"
  if ($dbHost -match 'localhost|127\.0\.0\.1' -or $directHost -match 'localhost|127\.0\.0\.1') { throw 'As URLs apontam para localhost. Abortado: este script é só para produção.' }

  Write-Host "`n== Estado atual ==" -ForegroundColor Cyan
  npx prisma migrate status

  $answer = Read-Host "`nFez o backup (branch/snapshot no Neon) e o host acima é o de PRODUÇÃO? Digite APLICAR para continuar"
  if ($answer -ne 'APLICAR') { Write-Host 'Cancelado. Nada foi alterado.'; return }

  Write-Host "`n== Aplicando ==" -ForegroundColor Cyan
  npx prisma migrate deploy

  Write-Host "`n== Estado final ==" -ForegroundColor Cyan
  npx prisma migrate status
}
finally {
  Remove-Item Env:DATABASE_URL, Env:DIRECT_URL -ErrorAction SilentlyContinue
}
