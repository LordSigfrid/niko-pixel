// Janela do Rádio no Windows: um script do PowerShell (WPF, já vem no Windows; nada para instalar) que lê comandos em
// JSON pela entrada padrão ({type:'labels'|'show'|'hide'}) e escreve as ações pela saída ({action, id}). Cada alerta é
// uma janelinha sem borda, sempre por cima, no topo e no centro da tela, que não rouba o foco de quem está digitando.
// Sem texto próprio: os rótulos chegam traduzidos pelo comando 'labels'. (Sem crases nem "${" aqui dentro: é um
// template literal do TypeScript.)

export const RADIO_HOST_PS1 = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms
[Console]::InputEncoding = [Text.Encoding]::UTF8
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)

$script:labels = $null
$script:wins = New-Object System.Collections.ArrayList
$RW = 470.0
$RH = 96.0
$RGAP = 6.0

function Send-Action($action, $id) {
  $line = (@{ action = $action; id = $id } | ConvertTo-Json -Compress)
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
}

function Get-Brush($hex) {
  try { return New-Object Windows.Media.SolidColorBrush ([Windows.Media.ColorConverter]::ConvertFromString($hex)) }
  catch { return New-Object Windows.Media.SolidColorBrush ([Windows.Media.Colors]::Gray) }
}

function Get-Area() {
  return [System.Windows.SystemParameters]::WorkArea
}

# Posição da pilha escolhida arrastando (canto superior esquerdo do 1º alerta); $null = topo e centro da tela.
# Fica salva ao lado deste script e vale para os próximos alertas, mesmo depois de reiniciar.
$script:posFile = Join-Path $PSScriptRoot 'posicao.json'
$script:anchor = $null
try {
  if (Test-Path $script:posFile) {
    $p = Get-Content -Raw $script:posFile | ConvertFrom-Json
    $script:anchor = @{ X = [double]$p.x; Y = [double]$p.y }
  }
} catch { $script:anchor = $null }

function Save-Anchor() {
  try {
    if ($script:anchor -eq $null) { if (Test-Path $script:posFile) { Remove-Item $script:posFile -Force } }
    else { (@{ x = $script:anchor.X; y = $script:anchor.Y } | ConvertTo-Json -Compress) | Set-Content -Path $script:posFile -Encoding UTF8 }
  } catch { }
}

# Canto da pilha: o salvo (mantido dentro da área visível de todos os monitores) ou o topo e centro.
function Get-Origin() {
  if ($script:anchor -ne $null) {
    $vl = [System.Windows.SystemParameters]::VirtualScreenLeft
    $vt = [System.Windows.SystemParameters]::VirtualScreenTop
    $vw = [System.Windows.SystemParameters]::VirtualScreenWidth
    $vh = [System.Windows.SystemParameters]::VirtualScreenHeight
    $x = [Math]::Min([Math]::Max($script:anchor.X, $vl), $vl + $vw - $RW)
    $y = [Math]::Min([Math]::Max($script:anchor.Y, $vt), $vt + $vh - $RH)
    return @{ X = $x; Y = $y }
  }
  $area = Get-Area
  return @{ X = $area.Left + ($area.Width - $RW) / 2; Y = $area.Top + 8 }
}

function Restack() {
  $o = Get-Origin
  $i = 0
  foreach ($w in $script:wins) {
    $top = $o.Y + $i * ($RH + $RGAP)
    $from = $w.Top
    # O valor-base já vai para o destino; a animação só desliza até lá e depois solta (assim arrastar não briga com ela).
    $w.BeginAnimation([Windows.Window]::TopProperty, $null)
    $w.Top = $top
    $anim = New-Object Windows.Media.Animation.DoubleAnimation($from, $top, (New-Object Windows.Duration ([TimeSpan]::FromMilliseconds(180))))
    $anim.EasingFunction = New-Object Windows.Media.Animation.QuadraticEase
    $anim.FillBehavior = [Windows.Media.Animation.FillBehavior]::Stop
    $w.BeginAnimation([Windows.Window]::TopProperty, $anim)
    $w.Left = $o.X
    $i++
  }
}

# Arrastar qualquer parte do alerta (menos os botões) move a pilha inteira; duplo clique volta ao topo e centro.
function Start-Drag($w, $e) {
  $src = $e.OriginalSource
  while ($src -ne $null -and -not ($src -is [Windows.Window])) {
    if ($src -is [Windows.Controls.Primitives.ButtonBase]) { return }
    $src = [Windows.Media.VisualTreeHelper]::GetParent($src)
  }
  if ($e.ClickCount -ge 2) {
    $script:anchor = $null
    Save-Anchor
    Restack
    return
  }
  $w.BeginAnimation([Windows.Window]::TopProperty, $null)
  $idx = $script:wins.IndexOf($w)
  try { $w.DragMove() } catch { return }
  $script:anchor = @{ X = $w.Left; Y = $w.Top - [Math]::Max(0, $idx) * ($RH + $RGAP) }
  Save-Anchor
  Restack
}

$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent" Topmost="True"
        ShowInTaskbar="False" ShowActivated="False" ResizeMode="NoResize" Width="470" Height="96">
  <Grid>
    <Path Data="M10,0 L470,0 L470,86 L460,96 L0,96 L0,10 Z" Fill="#EE0E100C" Stroke="#99F0BD4F" StrokeThickness="1"/>
    <Rectangle x:Name="Bar" Width="4" HorizontalAlignment="Left" Margin="1,10,0,1" Fill="#F0BD4F"/>
    <Grid Margin="14,8,12,8">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="40"/>
        <ColumnDefinition Width="*"/>
      </Grid.ColumnDefinitions>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="*"/>
      </Grid.RowDefinitions>
      <Border x:Name="Chip" Grid.Column="0" Grid.RowSpan="3" Width="32" Height="32" VerticalAlignment="Top" Margin="0,4,0,0">
        <TextBlock x:Name="Squad" Text="A" FontFamily="Bahnschrift" FontWeight="Bold" FontSize="18" Foreground="#120F08"
                   HorizontalAlignment="Center" VerticalAlignment="Center"/>
      </Border>
      <DockPanel Grid.Column="1" Grid.Row="0" LastChildFill="True">
        <Button x:Name="Close" DockPanel.Dock="Right" Content="✕" Width="18" Height="16" Padding="0" FontSize="10"
                Background="Transparent" BorderThickness="0" Foreground="#948E79" Cursor="Hand"/>
        <TextBlock x:Name="Header" FontFamily="Bahnschrift" FontSize="10.5" Foreground="#F0BD4F" TextTrimming="CharacterEllipsis"/>
      </DockPanel>
      <TextBlock x:Name="Title" Grid.Column="1" Grid.Row="1" FontFamily="Bahnschrift" FontWeight="Bold" FontSize="14"
                 Foreground="#ECE6D3" TextTrimming="CharacterEllipsis" Margin="0,1,0,0"/>
      <TextBlock x:Name="Body" Grid.Column="1" Grid.Row="2" FontFamily="Bahnschrift" FontSize="12" Foreground="#C9C2AA"
                 TextTrimming="CharacterEllipsis"/>
      <StackPanel Grid.Column="1" Grid.Row="3" Orientation="Horizontal" VerticalAlignment="Bottom" Margin="0,5,0,0">
        <Button x:Name="Allow" Height="20" Padding="12,0" Margin="0,0,6,0" FontFamily="Bahnschrift" FontWeight="Bold" FontSize="11"
                Background="#B5832A" Foreground="#120F08" BorderBrush="#F0BD4F" Cursor="Hand"/>
        <Button x:Name="Deny" Height="20" Padding="12,0" Margin="0,0,6,0" FontFamily="Bahnschrift" FontWeight="Bold" FontSize="11"
                Background="#22140F" Foreground="#FF7A66" BorderBrush="#AA4A3A" Cursor="Hand"/>
        <Button x:Name="Open" Height="20" Padding="12,0" FontFamily="Bahnschrift" FontWeight="Bold" FontSize="11"
                Background="#141710" Foreground="#ECE6D3" BorderBrush="#665A3A" Cursor="Hand"/>
      </StackPanel>
    </Grid>
  </Grid>
</Window>
'@

function Find-Win($id) {
  foreach ($w in $script:wins) { if ($w.Tag.id -eq $id) { return $w } }
  return $null
}

function Set-Content-Of($w, $a) {
  $L = $script:labels
  $f = $w.Tag.f
  $w.Tag.id = $a.id
  $f.Bar.Fill = Get-Brush $a.color
  $f.Chip.Background = Get-Brush $a.color
  $f.Squad.Text = $a.squad
  $sector = ''
  if ($a.sector) { $sector = '  ·  ' + $a.sector }
  $f.Header.Text = '▮ ' + $L.header + $sector
  $kind = $L.kind.($a.kind)
  $f.Title.Text = $a.name + '  —  ' + $kind
  $body = $a.text
  if ($a.detail) { $body = $a.text + '  ·  ' + $a.detail }
  $f.Body.Text = $body
  $f.Allow.Content = $L.allow
  $f.Deny.Content = $L.deny
  $f.Open.Content = $L.open
  $f.Close.ToolTip = $L.dismiss
  if ($a.canDecide) { $f.Allow.Visibility = 'Visible'; $f.Deny.Visibility = 'Visible' }
  else { $f.Allow.Visibility = 'Collapsed'; $f.Deny.Visibility = 'Collapsed' }
}

function Show-Alert($a) {
  $w = Find-Win $a.id
  if ($w -eq $null) {
    $w = [Windows.Markup.XamlReader]::Parse($xaml)
    $f = @{}
    foreach ($n in 'Bar', 'Chip', 'Squad', 'Header', 'Title', 'Body', 'Allow', 'Deny', 'Open', 'Close') { $f[$n] = $w.FindName($n) }
    $w.Tag = @{ id = $a.id; f = $f }
    $f.Allow.Add_Click({ param($s, $e) Send-Action 'allow' ([Windows.Window]::GetWindow($s)).Tag.id })
    $f.Deny.Add_Click({ param($s, $e) Send-Action 'deny' ([Windows.Window]::GetWindow($s)).Tag.id })
    $f.Open.Add_Click({ param($s, $e) Send-Action 'open' ([Windows.Window]::GetWindow($s)).Tag.id })
    $f.Close.Add_Click({ param($s, $e) $win = [Windows.Window]::GetWindow($s); Send-Action 'dismiss' $win.Tag.id; Hide-Alert $win.Tag.id })
    $w.Add_MouseLeftButtonDown({ param($s, $e) Start-Drag $s $e })
    $w.Cursor = [Windows.Input.Cursors]::SizeAll
    if ($script:labels.move) { $w.ToolTip = $script:labels.move }
    $o = Get-Origin
    $w.Left = $o.X
    $w.Top = $o.Y - $RH - 10
    Set-Content-Of $w $a
    [void]$script:wins.Add($w)
    $w.Show()
    [System.Media.SystemSounds]::Asterisk.Play()
    Restack
  } else {
    Set-Content-Of $w $a
  }
}

function Hide-Alert($id) {
  $w = Find-Win $id
  if ($w -ne $null) {
    [void]$script:wins.Remove($w)
    $w.Close()
    Restack
  }
}

function Invoke-Command-Line($line) {
  $m = $line | ConvertFrom-Json
  switch ($m.type) {
    'labels' { $script:labels = $m.labels }
    'show' { if ($script:labels -ne $null) { Show-Alert $m.alert } }
    'hide' { Hide-Alert $m.id }
    'quit' { [Windows.Threading.Dispatcher]::CurrentDispatcher.InvokeShutdown() }
  }
}

$reader = New-Object IO.StreamReader([Console]::OpenStandardInput(), (New-Object Text.UTF8Encoding($false)))
$script:pending = $reader.ReadLineAsync()
$timer = New-Object Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(120)
$timer.Add_Tick({
  while ($script:pending.IsCompleted) {
    $line = $script:pending.Result
    if ($line -eq $null) { [Windows.Threading.Dispatcher]::CurrentDispatcher.InvokeShutdown(); return }
    try { Invoke-Command-Line $line } catch { [Console]::Error.WriteLine($_.Exception.Message) }
    $script:pending = $reader.ReadLineAsync()
  }
})
$timer.Start()
Send-Action 'ready' ''
[Windows.Threading.Dispatcher]::Run()
`;
