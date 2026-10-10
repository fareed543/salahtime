<?php
// YouTube banner 2560x1440. Shapes are drawn at 2x and downsampled for smooth edges; text is drawn at 1x.
[$markPath, $outPath, $guidePath] = [$argv[1], $argv[2], $argv[3] ?? null];

const W = 2560;
const H = 1440;
const S = 2; // supersampling factor for shapes
const FONT_BOLD = 'C:/Windows/Fonts/segoeuib.ttf';
const FONT_SEMI = 'C:/Windows/Fonts/seguisb.ttf';
// Safe area visible on every device (YouTube spec): 1546 x 423, centred.
const SAFE_W = 1546;
const SAFE_H = 423;

function rgba($img, string $hex, int $alpha = 0): int
{
    return imagecolorallocatealpha($img, hexdec(substr($hex, 1, 2)), hexdec(substr($hex, 3, 2)), hexdec(substr($hex, 5, 2)), $alpha);
}

function roundedRect($img, float $x, float $y, float $w, float $h, float $r, int $color): void
{
    imagefilledrectangle($img, (int)($x + $r), (int)$y, (int)($x + $w - $r), (int)($y + $h), $color);
    imagefilledrectangle($img, (int)$x, (int)($y + $r), (int)($x + $w), (int)($y + $h - $r), $color);
    foreach ([[$x + $r, $y + $r], [$x + $w - $r, $y + $r], [$x + $r, $y + $h - $r], [$x + $w - $r, $y + $h - $r]] as [$cx, $cy]) {
        imagefilledellipse($img, (int)$cx, (int)$cy, (int)(2 * $r), (int)(2 * $r), $color);
    }
}

function textWidth(float $size, string $font, string $text): float
{
    $box = imagettfbbox($size, 0, $font, $text);
    return $box[2] - $box[0];
}

// ---- Layout (1x coordinates) -------------------------------------------------
$cx = W / 2;
$cy = H / 2;
$titleSize = 104;
$tagSize = 40;
$pillSize = 28;
$tag1 = 'Prayer times, azan alarms, Qibla';
$tag2 = "and your masjid\u{2019}s jamat times";
$pillText = "13 languages \u{00B7} works offline \u{00B7} salah-times.in";

$titleW = textWidth($titleSize, FONT_BOLD, 'SalahTime');
$textW = max($titleW, textWidth($tagSize, FONT_SEMI, $tag1), textWidth($tagSize, FONT_SEMI, $tag2));
$pillPadX = 34;
$pillW = textWidth($pillSize, FONT_SEMI, $pillText) + $pillPadX * 2;
$pillH = 68;
$textW = max($textW, $pillW);

$icon = 290;
$gap = 76;
$blockW = $icon + $gap + $textW;
$left = $cx - $blockW / 2;
$textX = $left + $icon + $gap;

// Vertical stack: title, 2 tagline lines, pill.
$titleH = 116;
$lineH = 54;
$stackH = $titleH + 18 + $lineH * 2 + 30 + $pillH;
$top = $cy - $stackH / 2;
$titleBase = $top + 100;
$tag1Base = $top + $titleH + 18 + 42;
$tag2Base = $tag1Base + $lineH;
$pillY = $tag2Base + 30;

// ---- 2x canvas: background, pattern, decoration, icon frame, pill -----------
$big = imagecreatetruecolor(W * S, H * S);
imagealphablending($big, true);
for ($y = 0; $y < H * S; $y++) {
    $t = $y / (H * S);
    $r = (int)(0x12 + (0x0c - 0x12) * $t);
    $g = (int)(0x4a + (0x34 - 0x4a) * $t);
    $b = (int)(0x40 + (0x2e - 0x40) * $t);
    imageline($big, 0, $y, W * S, $y, imagecolorallocate($big, $r, $g, $b));
}

// Soft mint glow behind the content.
for ($i = 0; $i < 28; $i++) {
    $k = 1 - $i / 28;
    imagefilledellipse($big, (int)($cx * S), (int)($cy * S), (int)(2600 * S * $k), (int)(1300 * S * $k), rgba($big, '#5fc2a6', 126));
}

// Geometric pattern: outlined 8-point stars (two squares, one rotated 45°) on a grid.
imagesetthickness($big, 2 * S);
$line = rgba($big, '#a8e0cf', 117);
$cell = 170;
for ($gy = -1; $gy <= H / $cell + 1; $gy++) {
    for ($gx = -1; $gx <= W / $cell + 1; $gx++) {
        $px = ($gx * $cell + ($gy % 2 ? $cell / 2 : 0)) * S;
        $py = ($gy * $cell) * S;
        $rad = 46 * S;
        foreach ([0, M_PI / 4] as $rot) {
            $pts = [];
            for ($k = 0; $k < 4; $k++) {
                $a = $rot + M_PI / 4 + $k * M_PI / 2;
                $pts[] = $px + $rad * cos($a);
                $pts[] = $py + $rad * sin($a);
            }
            imagepolygon($big, $pts, 4, $line);
        }
    }
}

// Decoration outside the safe area (shows on TV / wide desktop): crescents and stars.
// Translucent shapes are drawn opaque-in-layer (no blending) and merged once, so overlaps never double up.
function overlay($big, float $x, float $y, float $w, float $h, callable $draw): void
{
    $layer = imagecreatetruecolor((int)ceil($w), (int)ceil($h));
    imagealphablending($layer, false);
    imagesavealpha($layer, true);
    imagefill($layer, 0, 0, imagecolorallocatealpha($layer, 0, 0, 0, 127));
    $draw($layer);
    imagecopy($big, $layer, (int)$x, (int)$y, 0, 0, imagesx($layer), imagesy($layer));
    imagedestroy($layer);
}

function crescent($big, float $cx, float $cy, float $d, float $cutDx, float $cutDy, float $cutD): void
{
    $size = $d + 4;
    overlay($big, $cx - $size / 2, $cy - $size / 2, $size, $size, function ($layer) use ($size, $d, $cutDx, $cutDy, $cutD) {
        imagefilledellipse($layer, (int)($size / 2), (int)($size / 2), (int)$d, (int)$d, rgba($layer, '#c0e5da', 95));
        imagefilledellipse($layer, (int)($size / 2 + $cutDx), (int)($size / 2 + $cutDy), (int)$cutD, (int)$cutD, rgba($layer, '#000000', 127));
    });
}

crescent($big, 2290 * S, 560 * S, 300 * S, 60 * S, -50 * S, 270 * S);
crescent($big, 300 * S, 960 * S, 190 * S, -38 * S, -32 * S, 170 * S);
$star = rgba($big, '#e8f6f1', 70);
foreach ([[2140, 420, 10], [2430, 760, 7], [2210, 880, 6], [420, 470, 9], [180, 640, 6], [520, 1060, 7], [2470, 330, 5], [120, 1120, 5]] as [$sx, $sy, $sr]) {
    imagefilledellipse($big, $sx * S, $sy * S, $sr * 2 * S, $sr * 2 * S, $star);
}

// Icon frame: soft glow + light rim, like the Play feature graphic.
$iconX = $left;
$iconY = $cy - $icon / 2;
$frame = $icon + 24;
overlay($big, ($iconX - 12) * S, ($iconY - 12) * S, $frame * S, $frame * S, function ($layer) use ($frame) {
    roundedRect($layer, 0, 0, $frame * S - 1, $frame * S - 1, 78 * S, rgba($layer, '#c0e5da', 112));
    roundedRect($layer, 9 * S, 9 * S, ($frame - 18) * S - 1, ($frame - 18) * S - 1, 70 * S, rgba($layer, '#c0e5da', 84));
});

// Pill behind the bottom line: thin light rim, darker fill.
overlay($big, $textX * S, $pillY * S, $pillW * S, $pillH * S, function ($layer) use ($pillW, $pillH) {
    roundedRect($layer, 0, 0, $pillW * S - 1, $pillH * S - 1, ($pillH / 2) * S - 1, rgba($layer, '#ffffff', 108));
    roundedRect($layer, 2 * S, 2 * S, ($pillW - 4) * S - 1, ($pillH - 4) * S - 1, ($pillH / 2 - 2) * S - 1, rgba($layer, '#0b302a', 60));
});

$img = imagecreatetruecolor(W, H);
imagecopyresampled($img, $big, 0, 0, 0, 0, W, H, W * S, H * S);
imagedestroy($big);

// ---- App icon: brand mark with rounded corners (mask at 1024 px, then scaled) ----
$mark = imagecreatefrompng($markPath);
$ms = imagesx($mark);
$masked = imagecreatetruecolor($ms, $ms);
imagealphablending($masked, false);
imagesavealpha($masked, true);
imagefill($masked, 0, 0, imagecolorallocatealpha($masked, 0, 0, 0, 127));
$rr = $ms * 0.235;
for ($y = 0; $y < $ms; $y++) {
    for ($x = 0; $x < $ms; $x++) {
        $dx = max($rr - $x, 0, $x - ($ms - 1 - $rr));
        $dy = max($rr - $y, 0, $y - ($ms - 1 - $rr));
        if ($dx * $dx + $dy * $dy <= $rr * $rr) {
            imagesetpixel($masked, $x, $y, imagecolorat($mark, $x, $y));
        }
    }
}
imagealphablending($img, true);
imagecopyresampled($img, $masked, (int)$iconX, (int)$iconY, 0, 0, $icon, $icon, $ms, $ms);

// ---- Text (1x, GD anti-aliases TrueType) --------------------------------------
$white = imagecolorallocate($img, 0xff, 0xff, 0xff);
$mintText = imagecolorallocate($img, 0xa8, 0xe6, 0xd2);
$soft = imagecolorallocate($img, 0xd6, 0xef, 0xe7);
$salahW = textWidth($titleSize, FONT_BOLD, 'Salah');
imagettftext($img, $titleSize, 0, (int)$textX, (int)$titleBase, $white, FONT_BOLD, 'Salah');
imagettftext($img, $titleSize, 0, (int)($textX + $salahW + 2), (int)$titleBase, $mintText, FONT_BOLD, 'Time');
imagettftext($img, $tagSize, 0, (int)$textX, (int)$tag1Base, $soft, FONT_SEMI, $tag1);
imagettftext($img, $tagSize, 0, (int)$textX, (int)$tag2Base, $soft, FONT_SEMI, $tag2);
imagettftext($img, $pillSize, 0, (int)($textX + $pillPadX), (int)($pillY + $pillH / 2 + $pillSize * 0.38), $white, FONT_SEMI, $pillText);

imagepng($img, $outPath, 9);
echo sprintf("%s  %dx%d  %.0f KB\n", $outPath, W, H, filesize($outPath) / 1024);
echo sprintf("content box: x %.0f-%.0f, y %.0f-%.0f (safe area x %d-%d, y %d-%d)\n",
    $left - 10, $textX + $textW, $top, $pillY + $pillH, (W - SAFE_W) / 2, (W + SAFE_W) / 2, (H - SAFE_H) / 2, (H + SAFE_H) / 2);

// Optional preview with the safe area outlined (not for upload).
if ($guidePath) {
    $guide = imagecreatetruecolor(W, H);
    imagecopy($guide, $img, 0, 0, 0, 0, W, H);
    imagesetthickness($guide, 4);
    imagerectangle($guide, (W - SAFE_W) / 2, (H - SAFE_H) / 2, (W + SAFE_W) / 2, (H + SAFE_H) / 2, imagecolorallocate($guide, 255, 80, 80));
    $small = imagecreatetruecolor(1280, 720);
    imagecopyresampled($small, $guide, 0, 0, 0, 0, 1280, 720, W, H);
    imagepng($small, $guidePath);
}
