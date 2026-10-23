# I video della guida

Video senza voce: testi grandi accanto agli elementi evidenziati, copertina iniziale e finale, logo di
Predigarama Games in un angolo, musica d'ambiente generata. Si fanno dal cloud con l'app compilata
(`npm ci && npx electron-vite build`) e il playwright globale, come gli screenshot in `scripts/guide`.

```bash
A=/tmp/stella-guide/video/assets && mkdir -p $A
python3 scripts/video/musica.py $A/musica.wav 300 && ffmpeg -y -i $A/musica.wav -b:a 160k $A/musica.m4a
cp scripts/video/assets/predigarama-logo.png $A/
for l in it en; do
  node scripts/video/copertine.mjs $A $l
  rm -rf /tmp/stella-guide/video-ud-$l
  OUT=/tmp/stella-guide/video xvfb-run -a -s "-screen 0 1600x1100x24" node --experimental-strip-types --no-warnings scripts/video/panoramica.mjs $l
  # l'ultimo comando stampa VIDEO <file.webm>
  sh scripts/video/monta.sh <file.webm> $A $l stella-panoramica-$l.mp4
done
```

- `lib.mjs`: lancia Electron con la registrazione di Playwright (1440×900), cursore finto (Playwright non registra il puntatore), `focus(elementi, testo, lato)` per riquadro e testo, `title(testo)` per i titoli di sezione, `click`, `type`. La durata di ogni testo dipende dalla sua lunghezza.
- `panoramica.mjs`: video 1, panoramica delle funzioni di base (circa 3 minuti), con il progetto di esempio di `scripts/guide/crea-progetto-esempio.mjs`.
- `copertine.mjs`: copertine iniziale e finale (logo da `build/icon.svg`, nome, sottotitolo, autore Luca, logo Predigarama).
- `musica.py`: brano d'ambiente generato (accordi tenuti e arpeggio in Do maggiore); nessun campione, nessun diritto di terzi.
- `monta.sh`: copertine + registrazione con il logo in basso a destra + musica a volume basso, in un mp4 H.264/AAC.
- `assets/predigarama-logo.png`: il logo ritagliato al cerchio, con sfondo trasparente.
- Note: il tasto Salva si chiama «Salvato» quando non c'è nulla da salvare; le finestre si chiudono con il loro tasto Chiudi (Esc arriva solo se il fuoco è dentro la finestra); il documento del video cita la Strega perché il Cavaliere viene rinominato durante la registrazione.
