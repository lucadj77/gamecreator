import type { MessageKey } from './en'

export const it: Record<MessageKey, string> = {
  'app.openProject': 'Apri progetto',
  'app.reload': 'Ricarica',
  'app.loading': 'Caricamento…',
  'app.empty': 'Apri una cartella che contiene un file gamecreator.json.',
  'app.language': 'Lingua',

  'sidebar.sets': 'Set',
  'sidebar.templates': 'Template',
  'sidebar.unusedSheets': 'Fogli non collegati a un set: {names}',

  'set.template': 'template {name}',
  'set.counts': '{rows} righe · {cards} carte',
  'set.noData': 'Nessun dato per questo set.',
  'set.table': 'Tabella',
  'set.grid': 'Griglia',
  'set.copies': '× {n}',

  'preview.title': 'Anteprima',
  'preview.front': 'Fronte',
  'preview.back': 'Retro',
  'preview.noTemplate': 'Template "{name}" non trovato.',
  'preview.selectRow': 'Seleziona una riga per vedere la carta.',
  'preview.problems': 'Problemi su questa carta',

  'asset.missing': 'manca: {name}',
  'asset.ambiguous': 'ambiguo: {name}',

  'error.generic': '{text}',
  'load.noProjectFile': 'La cartella non contiene {file}',
  'load.unreadableProjectFile': '{file} non è leggibile: {error}',
  'load.unsupportedDataFile': 'Formato del file dati non supportato: {ext} (usa .xlsx o .csv)',
  'load.newerFormat':
    "Il progetto usa il formato {version}, più recente di questa versione dell'app",
  'load.missingSheet': 'Il set "{set}" non trova il foglio "{sheet}"',
  'load.missingTemplate': 'Il set "{set}" usa il template "{template}", che non esiste',
  'load.duplicateLayers': 'Template "{template}": nomi di livello ripetuti ({names})',
  'load.unreadableTemplate': 'Il template {file} non è leggibile: {error}',
  'template.unknownLayerType':
    'Template {file}: il livello "{layer}" ha un tipo sconosciuto "{type}"',
  'bind.unknownProperty': 'Colonna {column}: proprietà inesistente',
  'bind.invalidValue': 'Colonna {column}: valore non valido "{value}"'
}
