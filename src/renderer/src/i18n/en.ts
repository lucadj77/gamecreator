// Testi dell'interfaccia in inglese: è la lingua di riferimento, ogni chiave deve esistere qui.

export const en = {
  'app.openProject': 'Open project',
  'app.reload': 'Reload',
  'app.loading': 'Loading…',
  'app.empty': 'Open a folder that contains a gamecreator.json file.',
  'app.language': 'Language',

  'sidebar.sets': 'Sets',
  'sidebar.templates': 'Templates',
  'sidebar.unusedSheets': 'Sheets not linked to a set: {names}',

  'set.template': 'template {name}',
  'set.counts': '{rows} rows · {cards} cards',
  'set.noData': 'No data for this set.',
  'set.table': 'Table',
  'set.grid': 'Grid',
  'set.copies': '× {n}',

  'preview.title': 'Preview',
  'preview.front': 'Front',
  'preview.back': 'Back',
  'preview.noTemplate': 'Template "{name}" not found.',
  'preview.selectRow': 'Select a row to preview its card.',
  'preview.problems': 'Problems on this card',

  'asset.missing': 'missing: {name}',
  'asset.ambiguous': 'ambiguous: {name}',

  'error.generic': '{text}',
  'load.noProjectFile': 'The folder does not contain {file}',
  'load.unreadableProjectFile': '{file} cannot be read: {error}',
  'load.unsupportedDataFile': 'Unsupported data file format: {ext} (use .xlsx or .csv)',
  'load.newerFormat': 'The project uses format {version}, newer than this version of the app',
  'load.missingSheet': 'Set "{set}" cannot find sheet "{sheet}"',
  'load.missingTemplate': 'Set "{set}" uses template "{template}", which does not exist',
  'load.duplicateLayers': 'Template "{template}": repeated layer names ({names})',
  'load.unreadableTemplate': 'Template {file} cannot be read: {error}',
  'template.unknownLayerType': 'Template {file}: layer "{layer}" has unknown type "{type}"',
  'bind.unknownProperty': 'Column {column}: no such property',
  'bind.invalidValue': 'Column {column}: invalid value "{value}"'
}

export type MessageKey = keyof typeof en
