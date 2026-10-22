# Using an Excel file you already have

If you already have an Excel file with the card data, formulas and analysis sheets, Naibi can use it as the project's data file. Two things to know before you start:

- Naibi reads the results Excel saved in the file and **does not recalculate the formulas** in the cells.
- When it saves the data of a set, Naibi rewrites the file: some objects it does not know, such as **charts**, are lost (see [Limits](#limits)).

The safest way is to keep the calculations in Excel, prepare a "clean" sheet for each set and edit the data only in Excel, pressing **Reload** in Naibi.

Back to the [guide](README.md).

## What Naibi does with the file

A project has one data file (usually `data/cards.xlsx`, set in `naibi.json` under `dataFile`). Each set is linked to a sheet of the file. The examples use a file with a "Units" sheet (columns Name, Attack, Defense, Cost with `=B2+C2`) and an "Analysis" sheet.

| Question                                                              | Answer                                                                                                                                                                                                                               | Example                                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Does it read formulas or results?                                     | The results Excel last saved in the file. Naibi does not recalculate cell formulas.                                                                                                                                                  | Cell D2 (Cost) holds `=B2+C2` and shows 5: Naibi reads `5`.                                                                                   |
| If I change a value in Naibi, do the formulas depending on it update? | No. The formula stays in the file, but the saved result stays the old one until you open and save the file in Excel.                                                                                                                 | In Naibi you raise the Footman's attack from 2 to 9 and save: the cost stays 5. Open and save the file in Excel, press Reload: it becomes 12. |
| Which row holds the headings?                                         | The first row with data. Each column with a heading becomes a field; columns without a heading are ignored.                                                                                                                          | Row 1: `Name`, `Attack`, `Cost` become the fields `{Name}`, `{Attack}`, `{Cost}`. A column with an empty heading does not show in Naibi.      |
| What about sheets that are not sets (analysis, lookup tables)?        | They stay in the file untouched. Naibi lists them as "Sheets not linked to a set".                                                                                                                                                   | The "Analysis" sheet with `=AVERAGE(Units!D2:D10)` stays as it is.                                                                            |
| When does Naibi rewrite the file?                                     | When you save changed data of a set, create a set with a new sheet, rename or delete a set. Opening the project, editing templates and exporting do not write to the file.                                                           | You fix a card name in the grid and press Save: the file is rewritten. You export the PDF: the file does not change.                          |
| What does it rewrite?                                                 | Only the cells of the columns with a heading in the changed sheets, and only if the text changed. A formula cell whose result does not change stays a formula. Formatting, colours, conditional formatting and data validation stay. | You change the Footman's attack: only B2 changes in the file, and it stays yellow; D2 stays `=B2+C2`.                                         |
| Empty rows between cards?                                             | They are skipped when reading; when saving, each card goes back to its row and the empty rows stay where they are.                                                                                                                   | Rows 2, 4 and 5 with data and row 3 empty: after saving row 3 is still empty.                                                                 |
| What is lost when rewriting?                                          | Anything the library Naibi uses does not know, in the whole file: in our tests **charts** disappear even from sheets Naibi does not use.                                                                                             | The chart in the "Analysis" sheet is gone after saving, even if you changed only "Units".                                                     |
| Does it notice if I change the file in Excel while Naibi is open?     | No. Press **Reload** (unsaved changes in Naibi are lost).                                                                                                                                                                            | You change a cost in Excel and save: Naibi shows the old value until you press Reload.                                                        |
| Number formats                                                        | Ignored. Dates arrive as `YYYY-MM-DD`.                                                                                                                                                                                               | A cell with 0.5 formatted as 50% shows on the card as `0.5`.                                                                                  |

## Three ways of working

If you already have an Excel file with calculations and analysis, way A is the best fit. B is for those who want to move to editing the data in Naibi; C for those who prefer to keep everything in Google Sheets.

| Way                           | How it works                                                                                                                                                                                        | Pros                                                               | Cons                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **A. Excel stays the source** | Your file becomes the project's data file. You add a "clean" sheet for each set, filled by formulas that take the values from your sheets. You edit only in Excel, save, and press Reload in Naibi. | Calculations and analysis stay live; no copying by hand.           | Do not save data from Naibi's grid: a save removes the charts from the file. Remember to save in Excel and reload. |
| **B. Copy the values**        | The project has its own data file. From your Excel file you copy the columns and paste them as _values only_ into the set's sheet.                                                                  | Your Excel file is never touched; in Naibi you can edit freely.    | Each update is a copy by hand; the two files can drift apart.                                                      |
| **C. Google Sheets**          | You upload the file to Google Drive as a Google sheet, share it with "anyone with the link" and use **Google Sheets…** ([5.6](README.md#56-data-from-google-sheets)) or `naibi pull-sheets`.        | Google calculates the formulas and Naibi gets the updated results. | One way only: the local copy has only values.                                                                      |

In all three cases, calculations that concern a single card can move into the template's formulas (see below).

## Step by step (way A)

**In Excel**

1. Make a backup copy of the file. It must be `.xlsx` (not `.xls` or `.xlsm` with macros).
2. For each kind of card create a new sheet, for example "Troops", shaped like this:
   - row 1: the headings, one per field, with no title above;
   - from row 2: one card per row, with no merged cells;
   - simple, stable heading names (`name`, `attack`, `cost`): they become the field names in Naibi.
3. Fill the sheet with formulas that take the values from your working sheets (`=Units!B5`, `=VLOOKUP(...)`). Your analysis sheets stay as they are.
4. Where the look of a number on the card matters, turn it into text in Excel: `=TEXT(Units!C5,"0%")` for a percentage. Otherwise Naibi gets `0.5`.
5. Save and close Excel. Saving updates the formula results Naibi will read.

**In Naibi**

6. Create a new project with an Excel data file. Close Naibi.
7. Copy your file into the project's `data` folder and name it `cards.xlsx` (or keep its name and change `dataFile` in `naibi.json`, for example `"data/game.xlsx"`).
8. Open the project: the sidebar shows "Sheets not linked to a set" with all the sheets of the file.
9. Create a template. For each layer that shows data, in **Value on cards** choose **Column** and give the sheet heading.
10. **New set**: choose the template and, under **Sheet**, the "Troops" sheet. The set shows the rows of the sheet right away.

**To update**

11. Change the numbers in Excel, save, then press **Reload** in Naibi.
12. Do not edit the data in Naibi's grid and do not rename or delete the set: those are the actions that rewrite the file. Editing templates, previews and exporting is safe.

## Moving calculations into templates

Calculations that use only the data of the same card can move into the template, where Naibi recalculates them at once on every change. In the layer choose **Formula** and write for example `{attack}+{defense}` or `=IF({cost}>5; "Rare"; "Common")`. The functions, each with an example, are in Help (F1, **Formulas** tab) and in [chapter 9](README.md#9-formulas-and-calculated-fields).

Calculations that look at other rows or sheets stay in Excel: column sums and averages, VLOOKUP, rankings, balancing.

## Limits

Tested with files saved by LibreOffice; with files saved by Microsoft Excel the result for charts, tables and images may differ.

| Situation                                                   | What happens                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Charts in any sheet                                         | On the first data save from Naibi they disappear from the file, even from unlinked sheets.                                                             |
| Title above the headings                                    | The first row with data becomes the heading row: the fields are wrong. The "clean" sheet solves it.                                                    |
| Formula cell edited in Naibi                                | The formula is replaced by the value you typed.                                                                                                        |
| Values depending on cells changed in Naibi                  | The old result stays until the file is opened and saved in Excel. Excel usually recalculates on opening; LibreOffice usually does not for Excel files. |
| Renaming a set                                              | The sheet is renamed; formulas in other sheets that refer to it keep the old name and break.                                                           |
| Deleting a set                                              | Its sheet leaves the file (a copy goes to `deleted/`); formulas that refer to it break.                                                                |
| Error cells (#DIV/0!, #N/A)                                 | They show as `[object Object]`.                                                                                                                        |
| FALSE                                                       | Shows as empty (TRUE shows as `true`).                                                                                                                 |
| Merged cells                                                | The value is repeated in all merged cells; the merge stays.                                                                                            |
| Excel table formatting                                      | Rows added by Naibi stay outside the table range.                                                                                                      |
| Files with images, comments or tables made by some programs | Naibi may fail to open them ("Cannot read properties of undefined").                                                                                   |
| Pivot tables, macros, shapes                                | Not tested: consider them at risk if Naibi saves.                                                                                                      |
| Excel open while Naibi saves                                | On Windows Excel locks the file and saving probably fails; on Mac whoever saves last wins.                                                             |

Naibi's automatic backups include the data file, but make your own copy before you start.
