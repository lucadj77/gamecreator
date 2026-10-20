; Gli agenti IA in sandbox (Codex su Windows) girano come AppContainer e leggono solo le cartelle
; aperte a ALL APPLICATION PACKAGES (S-1-15-2-1). Program Files lo è già, la cartella per utente
; (AppData\Local\Programs\naibi) no: senza questo naibi-cli.cmd non parte dentro la sandbox.
; Solo lettura ed esecuzione, sulla sola cartella di Naibi (scelta di Luca, 2026-10-20).
!macro customInstall
  nsExec::Exec 'icacls "$INSTDIR" /grant *S-1-15-2-1:(OI)(CI)(RX) /T /C /Q'
  Pop $0
!macroend
