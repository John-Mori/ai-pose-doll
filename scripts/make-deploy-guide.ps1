# ネット公開手順書(PNG)を生成。System.Drawing(GDI+)。
# 実行: powershell -ExecutionPolicy Bypass -File scripts/make-deploy-guide.ps1
Add-Type -AssemblyName System.Drawing

$OUT = Join-Path (Split-Path $PSScriptRoot -Parent) "ネット公開手順.png"
$W = 1080; $Hmax = 3400; $margin = 56; $cardX = $margin; $cardW = $W - ($margin*2)

function C([int]$r,[int]$gg,[int]$b){ [System.Drawing.Color]::FromArgb($r,$gg,$b) }
$cBg=C 244 246 248; $cCard=C 255 255 255; $cBorder=C 214 222 230
$cAccent=C 22 163 74; $cText=C 31 41 55; $cSub=C 71 85 99
$cWarnBg=C 254 243 199; $cWarnBd=C 245 158 11; $cWarnTx=C 146 64 14
$cDark=C 17 24 39; $cUrlTx=C 134 239 172
$cOkBg=C 219 234 254; $cOkBd=C 37 99 235; $cOkTx=C 30 58 138
$cWhite=C 255 255 255; $cGreen100=C 220 252 231; $cGray400=C 156 163 175

function F([string]$name,[single]$size,[string]$style="Regular"){
  New-Object System.Drawing.Font($name,$size,[System.Drawing.FontStyle]::$style)
}
$fTitle=F "Yu Gothic UI" 38 "Bold"; $fSub=F "Meiryo" 19; $fStepT=F "Meiryo" 24 "Bold"
$fBody=F "Meiryo" 20; $fNum=F "Yu Gothic UI" 28 "Bold"; $fUrl=F "Consolas" 28 "Bold"
$fSmall=F "Meiryo" 18; $fFoot=F "Meiryo" 17

$bmp=New-Object System.Drawing.Bitmap($W,$Hmax)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear($cBg)
$sfC=New-Object System.Drawing.StringFormat
$sfC.Alignment=[System.Drawing.StringAlignment]::Center
$sfC.LineAlignment=[System.Drawing.StringAlignment]::Center

function Rect($x,$y,$w,$h){ New-Object System.Drawing.RectangleF ([single]$x),([single]$y),([single]$w),([single]$h) }
function Text($t,$font,$col,$x,$y,$w,$h){
  $b=New-Object System.Drawing.SolidBrush($col); $g.DrawString([string]$t,$font,$b,(Rect $x $y $w $h)); $b.Dispose()
}
function TextC($t,$font,$col,$x,$y,$w,$h){
  $b=New-Object System.Drawing.SolidBrush($col); $g.DrawString([string]$t,$font,$b,(Rect $x $y $w $h),$sfC); $b.Dispose()
}
function RoundRectPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
  $p=New-Object System.Drawing.Drawing2D.GraphicsPath; $d=$r*2
  $p.AddArc($x,$y,$d,$d,180,90); $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90); $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure(); return $p
}
function FillRR($x,$y,$w,$h,$r,$col){ $p=RoundRectPath $x $y $w $h $r; $b=New-Object System.Drawing.SolidBrush($col); $g.FillPath($b,$p); $b.Dispose(); $p.Dispose() }
function StrokeRR($x,$y,$w,$h,$r,$col,$pw){ $p=RoundRectPath $x $y $w $h $r; $pen=New-Object System.Drawing.Pen($col,[single]$pw); $g.DrawPath($pen,$p); $pen.Dispose(); $p.Dispose() }
function MeasureH($t,$font,$w){ return [int]$g.MeasureString([string]$t,$font,[int]$w).Height }

$y=$margin

# ヘッダー
FillRR $cardX $y $cardW 132 20 $cAccent
Text "ネットに公開して PC不要にする" $fTitle $cWhite ($cardX+30) ($y+24) ($cardW-60) 50
Text "一度公開すれば、スマホのブラウザでURLを開くだけ（PC・自宅Wi-Fi不要）" $fSub (C 220 252 231) ($cardX+32) ($y+80) ($cardW-60) 30
$y += 132 + 24

# 情報バナー
$bnT="やり方は『dist フォルダをドラッグ』するだけ（無料）"
$bnB="サーバーの知識は不要。Netlify Drop というサービスにファイルを放り込むと、世界中から開けるURLが自動で発行されます。"
$bnBodyH=MeasureH $bnB $fBody ($cardW-60)
$bnH=22+40+$bnBodyH+26
FillRR $cardX $y $cardW $bnH 16 $cGreen100
StrokeRR $cardX $y $cardW $bnH 16 $cAccent 2
Text $bnT $fStepT (C 22 101 52) ($cardX+30) ($y+22) ($cardW-60) 40
Text $bnB $fBody (C 22 101 52) ($cardX+30) ($y+62) ($cardW-60) ($bnBodyH+10)
$y += $bnH + 28

# ステップ
$steps=@(
  @{ t="PCでビルドする";
     b="プロジェクトのフォルダで PowerShell を開き、次を入力して Enter:`n`n    npm run build`n`n完了すると『dist』というフォルダが作られます（公開するのはこれ）。" },
  @{ t="Netlify Drop を開く";
     b="PCのブラウザで  app.netlify.com/drop  を開きます。無料登録/ログイン（Google・GitHub・メールでOK・お金はかかりません）。" },
  @{ t="dist フォルダをドラッグ＆ドロップ";
     b="ページの点線枠に、さきほどの『dist フォルダごと』マウスで放り込みます。数十秒で公開が完了します。" },
  @{ t="公開URLが発行される";
     b="例: https://xxxx.netlify.app のようなURLが出ます。これをスマホのブラウザで開くだけ。以後は PCを消してもOK。URLをLINE等で自分宛に送ると便利。" },
  @{ t="スマホでホーム画面に追加（任意）";
     b="iPhone Safari: 共有 → 『ホーム画面に追加』 / Android Chrome: ⋮ → 『ホーム画面に追加』。アプリ風に起動でき、2回目以降はオフラインでも開けます。" }
)
$ni=1
foreach($s in $steps){
  $titleH=MeasureH $s.t $fStepT ($cardW-48-72); $titleBlock=[Math]::Max(56,$titleH)
  $bodyH=MeasureH $s.b $fBody ($cardW-48); $cardH=24+$titleBlock+12+$bodyH+24
  FillRR $cardX $y $cardW $cardH 18 $cCard
  StrokeRR $cardX $y $cardW $cardH 18 $cBorder 1.5
  $g.FillEllipse((New-Object System.Drawing.SolidBrush($cAccent)), [single]($cardX+24), [single]($y+24), [single]56, [single]56)
  TextC ([string]$ni) $fNum $cWhite ($cardX+24) ($y+25) 56 56
  Text $s.t $fStepT $cText ($cardX+96) ($y+24+(($titleBlock-$titleH)/2)) ($cardW-120) ($titleH+6)
  Text $s.b $fBody $cSub ($cardX+24) ($y+24+$titleBlock+12) ($cardW-48) ($bodyH+10)
  $y += $cardH + 22; $ni++
}

# 更新ボックス（amber）
$upT="アプリを更新したいとき"
$upB="直したら もう一度  npm run build  →  Netlify の対象サイトの『Deploys』ページに dist を再ドロップ。URLは同じまま中身だけ新しくなります。"
$upBodyH=MeasureH $upB $fSmall ($cardW-60)
$upH=22+38+$upBodyH+24
FillRR $cardX $y $cardW $upH 16 $cWarnBg
StrokeRR $cardX $y $cardW $upH 16 $cWarnBd 2
Text $upT $fStepT $cWarnTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $upB $fSmall $cWarnTx ($cardX+30) ($y+60) ($cardW-60) ($upBodyH+10)
$y += $upH + 26

# 困ったとき（blue）
$tb=@(
  "・真っ白で出ない → 数秒待って再読込（初回の読み込み中のことがあります）。",
  "・URLを忘れた → Netlify の『Sites』に公開済みサイトの一覧があります。",
  "・名前を変えたい → Site configuration → Change site name で好きな名前に。",
  "・GitHub Pages 等で公開したい場合は別途設定（vite の base 調整）が必要です。"
) -join "`n"
$tbH=MeasureH $tb $fSmall ($cardW-60); $thH=22+38+$tbH+24
FillRR $cardX $y $cardW $thH 16 $cOkBg
StrokeRR $cardX $y $cardW $thH 16 $cOkBd 2
Text "うまくいかない時は" $fStepT $cOkTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $tb $fSmall $cOkTx ($cardX+30) ($y+60) ($cardW-60) ($tbH+10)
$y += $thH + 26

# フッター
Text "ビルド: npm run build   /   公開: app.netlify.com/drop に dist をドロップ   /   公開後は PC・Wi-Fi 不要" $fFoot $cSub $cardX $y $cardW 30
$y += 44

$usedH=[int]$y
$crop=New-Object System.Drawing.Bitmap($W,$usedH)
$cg=[System.Drawing.Graphics]::FromImage($crop)
$cg.DrawImage($bmp,0,0)
$crop.Save($OUT,[System.Drawing.Imaging.ImageFormat]::Png)
$cg.Dispose(); $crop.Dispose(); $g.Dispose(); $bmp.Dispose()
Write-Output "saved: $OUT ($W x $usedH)"
