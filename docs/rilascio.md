# Preparare una nuova versione

Ogni versione pubblicata ha le sue novità, scritte in [CHANGELOG.md](../CHANGELOG.md): Naibi le mostra a chi ha una versione precedente quando segnala l'aggiornamento, e GitHub le usa come testo della release.

## Durante lo sviluppo

Chi unisce una modifica che si vede nell'app aggiunge una riga alla sezione della prossima versione di `CHANGELOG.md`, in italiano sotto `### Italiano` e in inglese sotto `### English`. Le righe descrivono cosa cambia per chi usa l'app, non come è fatto il codice.

## Al momento del rilascio

1. Controlla che la sezione `## x.y.z` in cima a `CHANGELOG.md` sia completa e che `package.json` abbia la stessa versione (`npm version x.y.z --no-git-tag-version` aggiorna anche `package-lock.json`). Si alza il secondo numero per le funzioni nuove, il terzo per le sole correzioni.
2. Unisci tutto in `main`.
3. Dal Mac, nella cartella di Naibi:

   ```bash
   git checkout main
   git pull
   git tag v1.1.0
   git push origin v1.1.0
   ```

   con il numero della versione al posto di `1.1.0`.

4. L'azione **Build** di GitHub costruisce i pacchetti per Mac, Windows e Linux e pubblica la release con le novità. Se il tag non corrisponde alla versione di `package.json`, o manca la sezione in `CHANGELOG.md`, la release non viene creata e l'azione lo dice nel log.

Da quel momento le copie di Naibi già installate segnalano la nuova versione al primo avvio.

## Come funziona il controllo

All'avvio Naibi chiede a GitHub l'ultima release pubblicata di `lucadj77/naibi`. Se è più recente della versione installata mostra una striscia in alto con **Novità** e **Scarica**, che apre la pagina della release nel browser. **Salta questa versione** non la ripropone più; **Ricordamelo più tardi** la nasconde fino al prossimo avvio. Senza rete non compare nulla.

L'aggiornamento non si installa da solo: l'app non è firmata con un certificato Apple o Microsoft, e senza firma macOS non permette di sostituirla in automatico.
