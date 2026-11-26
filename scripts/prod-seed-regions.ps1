# Cadastra as regiões de Portugal e do Canadá no banco de PRODUÇÃO (Neon), com conferências de segurança.
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File scripts/prod-seed-regions.ps1                 # todos os países
#   powershell -ExecutionPolicy Bypass -File scripts/prod-seed-regions.ps1 -Country PT      # só Portugal
#   powershell -ExecutionPolicy Bypass -File scripts/prod-seed-regions.ps1 -Activate        # cria já ativas
#
# - Lê DATABASE_URL de .env.vercel.production (arquivo local, ignorado pelo git; NUNCA versionar).
# - Não imprime a URL (só o host). Define a variável apenas neste processo e a remove ao final.
# - Mostra a simulação primeiro e só grava depois de você digitar APLICAR.
# - Não precisa de migration: a tabela Region já tem a coluna de país.

param(
  [ValidateSet('all', 'PT', 'CA')] [string] $Country = 'all',
  [switch] $Activate,
  [switch] $IncludeFuture
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Get-Location) '.env.vercel.production'
if (-not (Test-Path $envFile)) { throw "Arquivo $envFile não encontrado. Copie as variáveis de produção para ele (fica fora do git)." }

$line = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL não encontrada em .env.vercel.production.' }
[Environment]::SetEnvironmentVariable('DATABASE_URL', ($line -replace '^DATABASE_URL=', '').Trim().Trim('"').Trim("'"), 'Process')

try {
  $dbHost = ([uri]$env:DATABASE_URL).Host
  Write-Host "Host: $dbHost"
  if ($dbHost -match 'localhost|127\.0\.0\.1') { throw 'A URL aponta para localhost. Abortado: este script é só para produção.' }

  $extra = @('--allow-remote', '--country', $Country)
  if ($Activate) { $extra += '--activate' }
  if ($IncludeFuture) { $extra += '--include-future' }

  Write-Host "`n== Simulação (nada é gravado) ==" -ForegroundColor Cyan
  node scripts/seed-regions.mjs @extra

  $answer = Read-Host "`nO host acima é o de PRODUÇÃO e a lista está certa? Digite APLICAR para gravar"
  if ($answer -ne 'APLICAR') { Write-Host 'Cancelado. Nada foi alterado.'; return }

  Write-Host "`n== Gravando ==" -ForegroundColor Cyan
  node scripts/seed-regions.mjs --apply @extra
}
finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
