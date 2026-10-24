#!/bin/sh
# Montaggio del video 6: unisce i pezzi delle due registrazioni (terminale e app) nell'ordine
# dell'elenco scritto da agente.mjs, tagliando le attese. L'uscita va poi a monta.sh come le altre
# registrazioni (copertine e musica).
# Uso: sh componi.sh <agente-it.json> <uscita.mp4>
set -e
EDL=$1; OUT=$2
T=$(mktemp -d)
FPS=30
for s in term app; do
  F=$(python3 -c "import json,sys;print(json.load(open('$EDL'))['$s']['file'])")
  ffmpeg -hide_banner -loglevel error -y -i "$F" -r $FPS -pix_fmt yuv420p -c:v libx264 -preset fast -crf 18 "$T/$s.mp4"
done
python3 - "$EDL" "$T" "$OUT" <<'P'
import json, subprocess, sys
edl, T, out = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(edl))
def dur(f):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
# l'inizio di ogni registrazione: la fine (orologio) meno la durata del video
start = {s: d[s]['end'] / 1000 - dur(f'{T}/{s}.mp4') for s in ('term', 'app')}
parts = []
for i, p in enumerate(d['edl']):
    a = p['from'] / 1000 - start[p['src']]
    b = p['to'] / 1000 - start[p['src']]
    if b - a < 0.2:
        continue
    f = f'{T}/p{i:03d}.mp4'
    subprocess.check_call(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',f'{max(0,a):.3f}','-i',f'{T}/{p["src"]}.mp4','-t',f'{b-a:.3f}','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-an',f])
    parts.append(f)
open(f'{T}/list.txt','w').write(''.join(f"file '{p}'\n" for p in parts))
subprocess.check_call(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',f'{T}/list.txt','-c','copy',out])
print(out, len(parts), 'pezzi', round(dur(out), 1), 's')
P
rm -rf "$T"
