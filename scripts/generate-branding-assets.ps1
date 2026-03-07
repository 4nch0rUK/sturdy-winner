$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-BrushFromHex([string]$hex) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-PenFromHex([string]$hex, [float]$width) {
  return New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$resourcesDir = Join-Path $root "resources"
New-Item -ItemType Directory -Force -Path $resourcesDir | Out-Null

$bg = "#122233"
$bg2 = "#1f344b"
$accent = "#f6b73c"
$paper = "#fffaf2"

# icon-background.png
$iconBgPath = Join-Path $resourcesDir "icon-background.png"
$bmpBg = New-Object System.Drawing.Bitmap 1024, 1024
$gBg = [System.Drawing.Graphics]::FromImage($bmpBg)
$gBg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$rect = New-Object System.Drawing.Rectangle 0,0,1024,1024
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.ColorTranslator]::FromHtml($bg), [System.Drawing.ColorTranslator]::FromHtml($bg2), 135)
$gBg.FillRectangle($grad, $rect)
$gBg.Dispose(); $grad.Dispose();
$bmpBg.Save($iconBgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpBg.Dispose()

# icon-foreground.png (transparent, star + CW)
$iconFgPath = Join-Path $resourcesDir "icon-foreground.png"
$bmpFg = New-Object System.Drawing.Bitmap 1024, 1024
$gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
$gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gFg.Clear([System.Drawing.Color]::Transparent)

$cardRect = New-Object System.Drawing.RectangleF 180,160,664,664
$cardBrush = New-BrushFromHex $paper
$cardPen = New-PenFromHex "#203246" 24
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 100.0
$path.AddArc($cardRect.X, $cardRect.Y, $radius, $radius, 180, 90)
$path.AddArc($cardRect.Right - $radius, $cardRect.Y, $radius, $radius, 270, 90)
$path.AddArc($cardRect.Right - $radius, $cardRect.Bottom - $radius, $radius, $radius, 0, 90)
$path.AddArc($cardRect.X, $cardRect.Bottom - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$gFg.FillPath($cardBrush, $path)
$gFg.DrawPath($cardPen, $path)

$starPts = @(
  (New-Object System.Drawing.PointF 512,260),
  (New-Object System.Drawing.PointF 560,378),
  (New-Object System.Drawing.PointF 690,378),
  (New-Object System.Drawing.PointF 584,456),
  (New-Object System.Drawing.PointF 624,590),
  (New-Object System.Drawing.PointF 512,516),
  (New-Object System.Drawing.PointF 400,590),
  (New-Object System.Drawing.PointF 440,456),
  (New-Object System.Drawing.PointF 334,378),
  (New-Object System.Drawing.PointF 464,378)
)
$starBrush = New-BrushFromHex $accent
$gFg.FillPolygon($starBrush, $starPts)

$font = New-Object System.Drawing.Font("Georgia", 82, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-BrushFromHex "#203246"
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$gFg.DrawString("CW", $font, $textBrush, (New-Object System.Drawing.PointF 512, 700), $fmt)

$gFg.Dispose(); $path.Dispose(); $cardBrush.Dispose(); $cardPen.Dispose(); $starBrush.Dispose(); $font.Dispose(); $textBrush.Dispose(); $fmt.Dispose();
$bmpFg.Save($iconFgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpFg.Dispose()

# icon.png composite
$iconPath = Join-Path $resourcesDir "icon.png"
$bmpIcon = New-Object System.Drawing.Bitmap 1024,1024
$gIcon = [System.Drawing.Graphics]::FromImage($bmpIcon)
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gIcon.DrawImage((New-Object System.Drawing.Bitmap $iconBgPath),0,0,1024,1024)
$gIcon.DrawImage((New-Object System.Drawing.Bitmap $iconFgPath),0,0,1024,1024)
$gIcon.Dispose()
$bmpIcon.Save($iconPath,[System.Drawing.Imaging.ImageFormat]::Png)
$bmpIcon.Dispose()

# splash.png
$splashPath = Join-Path $resourcesDir "splash.png"
$bmpSplash = New-Object System.Drawing.Bitmap 2732,2732
$gS = [System.Drawing.Graphics]::FromImage($bmpSplash)
$gS.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gradRect = New-Object System.Drawing.Rectangle 0,0,2732,2732
$grad2 = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gradRect, [System.Drawing.ColorTranslator]::FromHtml($bg), [System.Drawing.ColorTranslator]::FromHtml($bg2), 135)
$gS.FillRectangle($grad2, $gradRect)
$gS.DrawImage((New-Object System.Drawing.Bitmap $iconPath), 854, 760, 1024, 1024)
$titleFont = New-Object System.Drawing.Font("Georgia", 120, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subFont = New-Object System.Drawing.Font("Trebuchet MS", 56, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$titleBrush = New-BrushFromHex "#fffaf2"
$subBrush = New-BrushFromHex "#f6b73c"
$fmt2 = New-Object System.Drawing.StringFormat
$fmt2.Alignment = [System.Drawing.StringAlignment]::Center
$gS.DrawString("Contract Whist", $titleFont, $titleBrush, (New-Object System.Drawing.PointF 1366, 1950), $fmt2)
$gS.DrawString("Score Tracker", $subFont, $subBrush, (New-Object System.Drawing.PointF 1366, 2060), $fmt2)
$gS.Dispose(); $grad2.Dispose(); $titleFont.Dispose(); $subFont.Dispose(); $titleBrush.Dispose(); $subBrush.Dispose(); $fmt2.Dispose();
$bmpSplash.Save($splashPath,[System.Drawing.Imaging.ImageFormat]::Png)
$bmpSplash.Dispose()

Write-Host "Generated branding assets in $resourcesDir"
