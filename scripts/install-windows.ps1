# Instalador do Niko-Pixel no Windows (modo Node, sem Docker).
#
# Uso, na pasta do projeto:
#   powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1
#
# O que faz: npm install, compila, instala o mod no Claude Code, cria um atalho na pasta Inicializar (o Niko-Pixel
# sobe sozinho, sem janela, quando você entra no Windows) e já o inicia. O "-ExecutionPolicy Bypass" vale só para este
# script; a política de execução do Windows não é alterada.
#
# Opções:
#   -Desinstalar    tira o atalho de inicialização, para o servidor e desinstala o mod (a pasta fica como está)
#   -SemIniciar     não inicia o servidor agora (o atalho continua sendo criado)
#   -SemAtalho      não cria o atalho de inicialização
#   -SemMod         não instala o mod no Claude Code
#   -PastaInicializar <pasta>   onde criar o atalho (padrão: a pasta Inicializar do seu usuário)
param(
  [switch]$Desinstalar,
  [switch]$SemIniciar,
  [switch]$SemAtalho,
  [switch]$SemMod,
  [string]$PastaInicializar = [Environment]::GetFolderPath('Startup')
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot
$Atalho = Join-Path $PastaInicializar 'Niko-Pixel.lnk'
$Dados = Join-Path $env:USERPROFILE '.niko-pixel'
$Log = Join-Path $Dados 'servidor.log'
$Porta = 4747
if ($env:NIKO_PIXEL_PORT) { $Porta = [int]$env:NIKO_PIXEL_PORT }

function Escrever-Etapa($texto) { Write-Host ''; Write-Host "== $texto" -ForegroundColor Yellow }

function Rodar($exe, [string[]]$argumentos) {
  & $exe @argumentos
  if ($LASTEXITCODE -ne 0) { throw "falhou: $exe $($argumentos -join ' ')" }
}

function Porta-Ocupada() {
  return [bool](Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue)
}

# Para o Niko-Pixel pela porta dele (só se quem a ocupa for um node rodando o servidor).
function Parar-Servidor() {
  Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
    if ($p -and $p.Name -eq 'node.exe' -and $p.CommandLine -like '*server*index.js*') {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
      Write-Host "servidor parado (processo $($p.ProcessId))"
    }
  }
}

$LogErros = Join-Path $Dados 'servidor-erros.log'
# Linha que o atalho roda: o servidor sem janela, com a saída nos logs (em UTF-8, como o Node escreve).
$Comando = "Start-Process -FilePath node -ArgumentList 'dist\server\index.js' -WorkingDirectory '$Raiz' -WindowStyle Hidden -RedirectStandardOutput '$Log' -RedirectStandardError '$LogErros'"

Set-Location -LiteralPath $Raiz

if ($Desinstalar) {
  Escrever-Etapa 'Tirando o atalho de inicialização'
  if (Test-Path $Atalho) { Remove-Item $Atalho -Force; Write-Host "removido: $Atalho" } else { Write-Host 'não havia atalho' }
  Escrever-Etapa 'Parando o servidor'
  Parar-Servidor
  Escrever-Etapa 'Desinstalando o mod do Claude Code'
  Rodar 'npm.cmd' @('run', 'mod:uninstall')
  Write-Host ''
  Write-Host 'Niko-Pixel desinstalado. A pasta do projeto e os dados em ~/.niko-pixel continuam no lugar.' -ForegroundColor Green
  exit 0
}

Escrever-Etapa 'Conferindo o Node.js'
$versao = (& node --version) -replace '^v', ''
if ([version]$versao -lt [version]'22.12.0') { throw "Node $versao é antigo: instale o Node 22.12 ou mais novo (https://nodejs.org)." }
Write-Host "Node $versao"

Escrever-Etapa 'Instalando as dependências (npm install)'
Rodar 'npm.cmd' @('install', '--no-audit', '--no-fund')

Escrever-Etapa 'Compilando (npm run build)'
Rodar 'npm.cmd' @('run', 'build')

if (-not $SemMod) {
  Escrever-Etapa 'Instalando o mod no Claude Code'
  Rodar 'npm.cmd' @('run', 'mod:install')
}

if (-not $SemAtalho) {
  Escrever-Etapa 'Criando o atalho de inicialização'
  New-Item -ItemType Directory -Force -Path $PastaInicializar, $Dados | Out-Null
  $shell = New-Object -ComObject WScript.Shell
  $lnk = $shell.CreateShortcut($Atalho)
  $lnk.TargetPath = (Get-Command powershell.exe).Source
  $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"$Comando`""
  $lnk.WorkingDirectory = $Raiz
  $lnk.WindowStyle = 7
  $icone = Join-Path $Raiz 'client\public\assets\brand\niko-pixel.ico'
  if (Test-Path $icone) { $lnk.IconLocation = "$icone,0" } else { $lnk.IconLocation = "$((Get-Command node.exe).Source),0" }
  $lnk.Description = 'Niko-Pixel: quartel-general dos seus operadores de IA'
  $lnk.Save()
  Write-Host "atalho: $Atalho"
}

if (-not $SemIniciar) {
  Escrever-Etapa 'Iniciando o Niko-Pixel'
  if (Porta-Ocupada) {
    Write-Host "A porta $Porta já está em uso (o Niko-Pixel já está rodando, ou outro programa usa a porta)." -ForegroundColor DarkYellow
    Write-Host 'Pare o que estiver nela e rode este instalador de novo, ou reinicie o Windows.'
  } else {
    New-Item -ItemType Directory -Force -Path $Dados | Out-Null
    Start-Process -FilePath (Get-Command powershell.exe).Source -WindowStyle Hidden -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', $Comando)
    $ok = $false
    for ($i = 0; $i -lt 30 -and -not $ok; $i++) { Start-Sleep -Milliseconds 500; $ok = Porta-Ocupada }
    if ($ok) { Write-Host "no ar: http://localhost:$Porta" -ForegroundColor Green }
    else { Write-Host "não subiu em 15 s; veja o log: $Log" -ForegroundColor Red }
  }
}

Write-Host ''
Write-Host 'Pronto! Abra http://localhost:4747 no navegador.' -ForegroundColor Green
Write-Host 'Nas sessões do Claude Code já abertas, rode /reload-plugins (ou reabra a sessão).'
Write-Host "Logs do servidor: $Log e $LogErros"
Write-Host 'Para desinstalar: powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1 -Desinstalar'
