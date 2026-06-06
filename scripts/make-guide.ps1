# スマホ接続手順書(PNG)を生成する。System.Drawing(GDI+)で日本語テキストを描画。
# 実行: powershell -ExecutionPolicy Bypass -File scripts/make-guide.ps1
Add-Type -AssemblyName System.Drawing

# ====== 設定（環境に合わせて書き換え可）======
$PC_IP = "192.168.10.113"
$PORT  = "5173"
$URL   = "http://$PC_IP`:$PORT"
$OUT   = Join-Path (Split-Path $PSScriptRoot -Parent) "スマホ接続手順.png"

$W = 1080
$Hmax = 3200
$margin = 56
$cardX = $margin
$cardW = $W - ($margin * 2)

# ====== 色 ======
function C([int]$r,[int]$gg,[int]$b){ [System.Drawing.Color]::FromArgb($r,$gg,$b) }
$cBg      = C 244 246 248
$cCard    = C 255 255 255
$cBorder  = C 214 222 230
$cAccent  = C 37 99 235
$cText    = C 31 41 55
$cSub     = C 71 85 99
$cWarnBg  = C 254 243 199
$cWarnBd  = C 245 158 11
$cWarnTx  = C 146 64 14
$cDark    = C 17 24 39
$cUrlTx   = C 147 197 253
$cOkBg    = C 209 250 229
$cOkBd    = C 16 185 129
$cOkTx    = C 6 95 70
$cWhite   = C 255 255 255
$cBlue200 = C 219 234 254
$cGray400 = C 156 163 175

# ====== フォント ======
function F([string]$name,[single]$size,[string]$style="Regular"){
  New-Object System.Drawing.Font($name,$size,[System.Drawing.FontStyle]::$style)
}
$fTitle = F "Yu Gothic UI" 38 "Bold"
$fSub   = F "Meiryo" 19
$fStepT = F "Meiryo" 24 "Bold"
$fBody  = F "Meiryo" 20
$fNum   = F "Yu Gothic UI" 28 "Bold"
$fUrl   = F "Consolas" 30 "Bold"
$fSmall = F "Meiryo" 18
$fFoot  = F "Meiryo" 17

# ====== キャンバス ======
$bmp = New-Object System.Drawing.Bitmap($W,$Hmax)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear($cBg)

$sfC = New-Object System.Drawing.StringFormat
$sfC.Alignment = [System.Drawing.StringAlignment]::Center
$sfC.LineAlignment = [System.Drawing.StringAlignment]::Center

# ====== 描画ヘルパ（引数は呼び出し前に評価されるので安全）======
function Rect($x,$y,$w,$h){
  New-Object System.Drawing.RectangleF ([single]$x),([single]$y),([single]$w),([single]$h)
}
function Text($t,$font,$col,$x,$y,$w,$h){
  $b = New-Object System.Drawing.SolidBrush($col)
  $g.DrawString([string]$t,$font,$b,(Rect $x $y $w $h))
  $b.Dispose()
}
function TextC($t,$font,$col,$x,$y,$w,$h){
  $b = New-Object System.Drawing.SolidBrush($col)
  $g.DrawString([string]$t,$font,$b,(Rect $x $y $w $h),$sfC)
  $b.Dispose()
}
function RoundRectPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r*2
  $p.AddArc($x,$y,$d,$d,180,90)
  $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90)
  $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure()
  return $p
}
function FillRR($x,$y,$w,$h,$r,$col){
  $p = RoundRectPath $x $y $w $h $r
  $b = New-Object System.Drawing.SolidBrush($col)
  $g.FillPath($b,$p); $b.Dispose(); $p.Dispose()
}
function StrokeRR($x,$y,$w,$h,$r,$col,$pw){
  $p = RoundRectPath $x $y $w $h $r
  $pen = New-Object System.Drawing.Pen($col,[single]$pw)
  $g.DrawPath($pen,$p); $pen.Dispose(); $p.Dispose()
}
function MeasureH($t,$font,$w){
  return [int]$g.MeasureString([string]$t,$font,[int]$w).Height
}

$y = $margin

# ====== ヘッダー ======
FillRR $cardX $y $cardW 132 20 $cAccent
Text "スマホで開く かんたん手順" $fTitle $cWhite ($cardX+30) ($y+24) ($cardW-60) 50
Text "AI Pose Doll Mobile / PCで起動 → スマホのブラウザで表示" $fSub $cBlue200 ($cardX+32) ($y+80) ($cardW-60) 30
$y += 132 + 24

# ====== 重要バナー ======
$bnT = "★ 最重要：PCとスマホを『同じWi-Fi』につなぐこと"
$bnB = "別々のWi-Fiやスマホの4G/5G回線では開けません。まず同じWi-Fiを確認してください。"
$bnBodyH = MeasureH $bnB $fBody ($cardW-60)
$bnH = 22 + 40 + $bnBodyH + 26
FillRR $cardX $y $cardW $bnH 16 $cWarnBg
StrokeRR $cardX $y $cardW $bnH 16 $cWarnBd 2
Text $bnT $fStepT $cWarnTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $bnB $fBody $cWarnTx ($cardX+30) ($y+62) ($cardW-60) ($bnBodyH+10)
$y += $bnH + 28

# ====== ステップ ======
$steps = @(
  @{ t="PCでアプリを起動する";
     b="プロジェクトのフォルダで PowerShell を開き、次を入力して Enter:`n`n    npm run host`n`n表示の中の  Network: $URL  を確認します（このウィンドウは開いたままにする）。" },
  @{ t="スマホを同じWi-Fiにつなぐ";
     b="スマホの設定 → Wi-Fi で、PCと同じネットワーク名(SSID)を選びます。ゲスト用Wi-Fiは機器同士が通信できず開けないことがあります。" },
  @{ t="スマホのブラウザにURLを入力";
     b="Safari(iPhone) または Chrome(Android) のアドレス欄に次を入力して開きます:`n`n    $URL`n`n※検索欄ではなくURL欄に入れてください。" },
  @{ t="3D人形が表示されたら成功！";
     b="灰色の人形と床グリッドが出ればOK。操作点(丸)をタップ → 下の Move で動かせます。Camera で構図、Export で PNG / JSON 保存。" },
  @{ t="(任意) ホーム画面に追加してアプリ風に";
     b="iPhone Safari: 共有ボタン → 『ホーム画面に追加』`nAndroid Chrome: 右上 ⋮ → 『ホーム画面に追加 / アプリをインストール』" }
)

$ni = 1
foreach($s in $steps){
  $titleH = MeasureH $s.t $fStepT ($cardW-48-72)
  $titleBlock = [Math]::Max(56,$titleH)
  $bodyH = MeasureH $s.b $fBody ($cardW-48)
  $cardH = 24 + $titleBlock + 12 + $bodyH + 24
  FillRR $cardX $y $cardW $cardH 18 $cCard
  StrokeRR $cardX $y $cardW $cardH 18 $cBorder 1.5
  $g.FillEllipse((New-Object System.Drawing.SolidBrush($cAccent)), [single]($cardX+24), [single]($y+24), [single]56, [single]56)
  TextC ([string]$ni) $fNum $cWhite ($cardX+24) ($y+25) 56 56
  Text $s.t $fStepT $cText ($cardX+96) ($y+24+(($titleBlock-$titleH)/2)) ($cardW-120) ($titleH+6)
  Text $s.b $fBody $cSub ($cardX+24) ($y+24+$titleBlock+12) ($cardW-48) ($bodyH+10)
  $y += $cardH + 22
  $ni++
}

# ====== URL 強調ボックス ======
FillRR $cardX $y $cardW 118 16 $cDark
Text "スマホで開くアドレス" $fSmall $cGray400 ($cardX+30) ($y+18) ($cardW-60) 26
Text $URL $fUrl $cUrlTx ($cardX+30) ($y+48) ($cardW-60) 50
$y += 118 + 28

# ====== 困ったとき ======
$tb = @(
  "・人形が出ない → 同じWi-Fiか再確認。PC側の『npm run host』が動いたままか確認。",
  "・つながらない → Windowsの『ファイアウォール』でNode/Viteの通信を許可。",
  "・URLが変わった → PCのIPは変わることがあります。PowerShellで ipconfig を実行し、",
  "   IPv4アドレス（例 192.168.x.x）を見て http://(そのIP):$PORT で開き直す。"
) -join "`n"
$tbH = MeasureH $tb $fSmall ($cardW-60)
$thH = 22 + 38 + $tbH + 24
FillRR $cardX $y $cardW $thH 16 $cOkBg
StrokeRR $cardX $y $cardW $thH 16 $cOkBd 2
Text "うまくいかない時は" $fStepT $cOkTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $tb $fSmall $cOkTx ($cardX+30) ($y+60) ($cardW-60) ($tbH+10)
$y += $thH + 26

# ====== フッター ======
Text "PC IP: $PC_IP    /    ポート: $PORT    /    起動コマンド: npm run host" $fFoot $cSub $cardX $y $cardW 30
$y += 44

# ====== 使った高さでクロップして保存 ======
$usedH = [int]$y
$crop = New-Object System.Drawing.Bitmap($W,$usedH)
$cg = [System.Drawing.Graphics]::FromImage($crop)
$cg.DrawImage($bmp,0,0)
$crop.Save($OUT,[System.Drawing.Imaging.ImageFormat]::Png)
$cg.Dispose(); $crop.Dispose(); $g.Dispose(); $bmp.Dispose()
Write-Output "saved: $OUT ($W x $usedH)"
