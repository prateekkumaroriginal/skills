#!/bin/bash
# Contact sheet of stills, sized to what a model actually sees (1568 px wide), each labelled with its time.
#   src/sheet.sh OUTDIR t1,t2,... [COLUMNS=3]   -> OUTDIR/t*.png (full size) and OUTDIR/sheet.jpg
#   RENDER=canvas/render.mjs src/sheet.sh ...   (stills from the canvas renderer)
# For fine detail (small text, overlaps), look at a full-size crop instead of the sheet:
#   ffmpeg -i OUTDIR/t0012.50.png -vf crop=W:H:X:Y crop.png
set -e
OUT=$(realpath -m "$1"); COLS=${3:-3}
cd "$(dirname "$0")"
FONT=$(ls ../assets/fonts/*.woff2 ../assets/fonts/*.ttf 2>/dev/null | head -1 || true)
node "${RENDER:-render.mjs}" "$OUT" --stills "$2"
cd "$OUT"
W=$(( 1568 / COLS )); H=$(( W * 9 / 16 ))
for f in t*.png; do
  label="drawtext=text='${f:1:7}s':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6"
  [ -n "$FONT" ] && label="drawtext=fontfile=$(realpath "$OLDPWD/$FONT"):text='${f:1:7}s':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6"
  ffmpeg -v error -y -i "$f" -vf "scale=${W}:${H},$label" "s_$f"
done
n=$(ls s_t*.png | wc -l); rows=$(( (n + COLS - 1) / COLS ))
ffmpeg -v error -y -pattern_type glob -i 's_t*.png' -vf "tile=${COLS}x${rows}" -q:v 3 sheet.jpg
rm s_t*.png
echo "$OUT/sheet.jpg"
