# GitHub Pages 公開手順書(PNG)を生成。System.Drawing(GDI+)。
# 実行: powershell -ExecutionPolicy Bypass -File scripts/make-github-guide.ps1
Add-Type -AssemblyName System.Drawing

$OUT = Join-Path (Split-Path $PSScriptRoot -Parent) "GitHub公開手順.png"
$W = 1080; $Hmax = 3600; $margin = 56; $cardX = $margin; $cardW = $W - ($margin*2)

function C([int]$r,[int]$gg,[int]$b){ [System.Drawing.Color]::FromArgb($r,$gg,$b) }
$cBg=C 244 246 248; $cCard=C 255 255 255; $cBorder=C 214 222 230
$cAccent=C 130 80 223; $cText=C 31 41 55; $cSub=C 71 85 99
$cWarnBg=C 254 243 199; $cWarnBd=C 245 158 11; $cWarnTx=C 146 64 14
$cCode=C 240 238 250; $cCodeTx=C 60 40 110
$cOkBg=C 237 233 254; $cOkBd=C 130 80 223; $cOkTx=C 76 29 149
$cWhite=C 255 255 255; $cHead=C 36 41 47; $cPurple100=C 237 233 254

function F([string]$name,[single]$size,[string]$style="Regular"){
  New-Object System.Drawing.Font($name,$size,[System.Drawing.FontStyle]::$style)
}
$fTitle=F "Yu Gothic UI" 38 "Bold"; $fSub=F "Meiryo" 19; $fStepT=F "Meiryo" 24 "Bold"
$fBody=F "Meiryo" 20; $fNum=F "Yu Gothic UI" 28 "Bold"; $fCode=F "Consolas" 20
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
FillRR $cardX $y $cardW 132 20 $cHead
Text "GitHub Pages で公開する" $fTitle $cWhite ($cardX+30) ($y+24) ($cardW-60) 50
Text "main に push すると自動でビルド＆公開（PC・自宅Wi-Fi不要のURLになる）" $fSub (C 200 200 210) ($cardX+32) ($y+80) ($cardW-60) 30
$y += 132 + 24

# 情報バナー
$bnT="自動デプロイ設定（GitHub Actions）は同梱済み"
$bnB="同梱の .github/workflows/deploy.yml が動きます。相対パス対応済みで base 等の変更は不要。git で push できれば、あとは GitHub が自動でビルドして公開します。"
$bnBodyH=MeasureH $bnB $fBody ($cardW-60)
$bnH=22+40+$bnBodyH+26
FillRR $cardX $y $cardW $bnH 16 $cPurple100
StrokeRR $cardX $y $cardW $bnH 16 $cAccent 2
Text $bnT $fStepT $cOkTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $bnB $fBody $cOkTx ($cardX+30) ($y+62) ($cardW-60) ($bnBodyH+10)
$y += $bnH + 28

# ステップ（コード行は別描画するので code フィールドを持つ）
$steps=@(
  @{ t="GitHubでリポジトリを作る"; code=$null;
     b="github.com で新規リポジトリを作成。Public（公開）にすると無料でPagesが使えます。名前は半角英数（例: ai-pose-doll）。" },
  @{ t="PCからコードを push する";
     b="プロジェクトのフォルダで PowerShell を開き、次を上から順に実行（<>は自分の値に置換）:";
     code="git init`ngit add .`ngit commit -m ""first""`ngit branch -M main`ngit remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git`ngit push -u origin main" },
  @{ t="Pages を有効化する"; code=$null;
     b="GitHub のリポジトリ → Settings → Pages → 『Build and deployment』の Source を『GitHub Actions』に変更します。" },
  @{ t="自動で公開される"; code=$null;
     b="Actions タブでビルドが緑（成功）になれば完了（数分）。以後は push するたびに自動で更新されます。" },
  @{ t="スマホで開く"; code=$null;
     b="URL: https://<ユーザー名>.github.io/<リポジトリ名>/ をスマホのブラウザで開く。ホーム画面に追加でアプリ風・オフライン起動も可。" }
)
$ni=1
foreach($s in $steps){
  $titleH=MeasureH $s.t $fStepT ($cardW-48-72); $titleBlock=[Math]::Max(56,$titleH)
  $bodyH=MeasureH $s.b $fBody ($cardW-48)
  $codeH=0; $codeBlock=0
  if($s.code){ $codeLines=($s.code -split "`n").Count; $codeH = ($codeLines*28) + 28; $codeBlock = 12 + $codeH }
  $cardH=24 + $titleBlock + 12 + $bodyH + $codeBlock + 24
  FillRR $cardX $y $cardW $cardH 18 $cCard
  StrokeRR $cardX $y $cardW $cardH 18 $cBorder 1.5
  $g.FillEllipse((New-Object System.Drawing.SolidBrush($cAccent)), [single]($cardX+24), [single]($y+24), [single]56, [single]56)
  TextC ([string]$ni) $fNum $cWhite ($cardX+24) ($y+25) 56 56
  Text $s.t $fStepT $cText ($cardX+96) ($y+24+(($titleBlock-$titleH)/2)) ($cardW-120) ($titleH+6)
  $byy = $y+24+$titleBlock+12
  Text $s.b $fBody $cSub ($cardX+24) $byy ($cardW-48) ($bodyH+10)
  if($s.code){
    $cyy = $byy + $bodyH + 12
    FillRR ($cardX+24) $cyy ($cardW-48) $codeH 10 $cCode
    Text $s.code $fCode $cCodeTx ($cardX+44) ($cyy+12) ($cardW-88) ($codeH-16)
  }
  $y += $cardH + 22; $ni++
}

# 更新ボックス（amber）
$upT="更新のしかた"
$upB="アプリを直したら  git add .  →  git commit -m ""update""  →  git push  だけ。GitHub Actions が自動でビルドして同じURLに再公開します。"
$upBodyH=MeasureH $upB $fSmall ($cardW-60)
$upH=22+38+$upBodyH+24
FillRR $cardX $y $cardW $upH 16 $cWarnBg
StrokeRR $cardX $y $cardW $upH 16 $cWarnBd 2
Text $upT $fStepT $cWarnTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $upB $fSmall $cWarnTx ($cardX+30) ($y+60) ($cardW-60) ($upBodyH+10)
$y += $upH + 26

# 困ったとき（purple）
$tb=@(
  "・公開されない → Settings→Pages の Source が『GitHub Actions』か確認。Actionsタブのエラーも見る。",
  "・404になる → URL末尾の / と <リポジトリ名> の綴りを確認。反映に数分かかることがあります。",
  "・Private だと出ない → 無料プランの Pages は Public 限定。リポジトリを Public にする。",
  "・git が無い → https://git-scm.com からインストール（または GitHub Desktop アプリでも可）。"
) -join "`n"
$tbH=MeasureH $tb $fSmall ($cardW-60); $thH=22+38+$tbH+24
FillRR $cardX $y $cardW $thH 16 $cOkBg
StrokeRR $cardX $y $cardW $thH 16 $cOkBd 2
Text "うまくいかない時は" $fStepT $cOkTx ($cardX+30) ($y+22) ($cardW-60) 40
Text $tb $fSmall $cOkTx ($cardX+30) ($y+60) ($cardW-60) ($tbH+10)
$y += $thH + 26

# フッター
Text "設定: Settings → Pages → GitHub Actions   /   公開URL: <ユーザー>.github.io/<リポジトリ>/   /   更新: push だけ" $fFoot $cSub $cardX $y $cardW 30
$y += 44

$usedH=[int]$y
$crop=New-Object System.Drawing.Bitmap($W,$usedH)
$cg=[System.Drawing.Graphics]::FromImage($crop)
$cg.DrawImage($bmp,0,0)
$crop.Save($OUT,[System.Drawing.Imaging.ImageFormat]::Png)
$cg.Dispose(); $crop.Dispose(); $g.Dispose(); $bmp.Dispose()
Write-Output "saved: $OUT ($W x $usedH)"
