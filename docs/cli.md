# Comando naibi e strumenti per gli agenti IA

Il comando `naibi` permette a un agente IA (Claude Code, Codex, Cursor…) o a uno script di lavorare su un progetto senza aprire l'app: legge i dati, segnala i problemi e disegna le carte in PNG. È lo stesso programma dell'app avviato con `--cli`: nessuna finestra, stesso rendering delle esportazioni.

## Comandi

| Comando                                                                                                | Cosa fa                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `info <progetto>`                                                                                      | set, template e livelli, variabili, stili, asset, profili di esportazione                                                      |
| `check <progetto> [--set S]`                                                                           | problemi di ogni carta (immagini o font mancanti, variabili sconosciute, errori di markup e formule); esce con 1 se ce ne sono |
| `template <progetto> <nome>`                                                                           | livelli del template (per un derivato, già risolti, con il base e le differenze); con `--json` il template completo                                                                        |
| `rows <progetto> <set> [--json\|--csv]`                                                                | righe del set, separate da tab se non si indica altro                                                                          |
| `set-rows <progetto> <set> <file.json\|file.csv>`                                                      | sostituisce le righe del set, dopo aver fatto un backup del progetto                                                           |
| `render <progetto> [--set S] [--card 1,3,5-7] [--side front\|back\|both] [--dpi 150] [--out cartella]` | disegna le carte in PNG, di base in `export/naibi-render/<set>/<n>.png`                                                        |
| `export <progetto> --profile NOME`                                                                     | esegue un profilo di esportazione salvato nel progetto                                                                         |
| `new <nome> <cartella>`                                                                                | crea un progetto vuoto                                                                                                         |

`info`, `check` e `template` accettano `--json`. `naibi --help` elenca i comandi.

## Come si lancia

- App installata: `"<percorso del programma>" --cli <comando>`. Su Mac il programma è dentro il pacchetto, per esempio `"/Applications/Naibi.app/Contents/MacOS/Naibi" --cli info ~/Documents/Naibi/Prova`.
- Dal codice: una volta `npm run build`, poi `npm run naibi -- info <progetto>` oppure `node bin/naibi.mjs info <progetto>`. Con `npm link` il comando diventa `naibi` in ogni cartella.

Il comando non serve con l'app aperta: se l'app ha lo stesso progetto aperto, dopo le modifiche dell'agente si preme **Ricarica**, senza salvare prima, altrimenti la copia dell'app sovrascrive quella dell'agente.

## Skill per gli agenti

La skill è in [skill/naibi/SKILL.md](../skill/naibi/SKILL.md), in inglese: spiega il formato del progetto, il markup, le formule e il modo di lavorare (`info`, poi le modifiche, poi `check` e `render` per controllare). Il segnaposto `{{NAIBI_COMMAND}}` indica come lanciare il comando.

Nell'app il pulsante **Strumenti IA…** (schermata di ingresso e barra in alto) mostra la skill con il comando di questo computer già inserito. Si può copiare e incollare nell'agente, chiedendogli di installarla, oppure salvare come file in `<cartella>/naibi/SKILL.md`; Claude Code legge le skill da `~/.claude/skills` o da `.claude/skills` dentro un progetto. Solo le istruzioni intorno alla skill sono tradotte.

Quando cambia il formato del progetto va aggiornata anche la skill.
