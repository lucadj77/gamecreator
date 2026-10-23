#!/bin/sh
# Montaggio di un video: copertina iniziale, registrazione con il logo Predigarama in un angolo, copertina finale, musica.
# Uso: sh monta.sh <registrazione.webm> <cartella assets> <it|en> <uscita.mp4>
# assets: intro-<lang>.png, outro-<lang>.png (1440x900, da copertine.mjs), predigarama-logo.png, musica.m4a (da musica.py)
set -e
IN=$1; A=$2; L=$3; OUT=$4
W=1440; H=900; FPS=30
INTRO=4; OUTRO=5; FADE=0.6
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" 2>/dev/null || true)
T=$(mktemp -d)
# la registrazione in mp4 a frame costanti (il webm di Playwright non dichiara la durata)
ffmpeg -hide_banner -loglevel error -y -i "$IN" -r $FPS -pix_fmt yuv420p -c:v libx264 -preset fast -crf 20 "$T/base.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/base.mp4")
TOT=$(python3 -c "print($INTRO + $DUR + $OUTRO)")
ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate $FPS -t $INTRO -i "$A/intro-$L.png" \
  -i "$T/base.mp4" \
  -loop 1 -framerate $FPS -t $OUTRO -i "$A/outro-$L.png" \
  -i "$A/predigarama-logo.png" \
  -stream_loop -1 -i "$A/musica.m4a" \
  -filter_complex "\
    [0:v]format=yuv420p,fade=t=in:st=0:d=$FADE,fade=t=out:st=$(python3 -c "print($INTRO-$FADE)"):d=$FADE[v0]; \
    [3:v]scale=120:-1[logo]; \
    [1:v][logo]overlay=W-w-24:H-h-24:format=auto,format=yuv420p,fade=t=in:st=0:d=$FADE,fade=t=out:st=$(python3 -c "print($DUR-$FADE)"):d=$FADE[v1]; \
    [2:v]format=yuv420p,fade=t=in:st=0:d=$FADE,fade=t=out:st=$(python3 -c "print($OUTRO-1.2)"):d=1.2[v2]; \
    [v0][v1][v2]concat=n=3:v=1:a=0[v]; \
    [4:a]atrim=0:$TOT,volume=0.28,afade=t=in:st=0:d=2,afade=t=out:st=$(python3 -c "print($TOT-3)"):d=3[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT"
rm -rf "$T"
echo "$OUT $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s"
