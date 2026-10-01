// ===== Agua - Ranking diario =====
// Pega TODO este código en el editor de Apps Script (Extensiones > Apps Script
// desde tu Google Sheet), sustituyendo lo que haya por defecto, y despliega
// como "Aplicación web" (Deploy > New deployment > Web app).

const SHEET_NAME = "Ranking";

// Tiene que ser IDÉNTICO a la constante RANKING_SECRET del index.html de la app.
// No es seguridad real, solo evita que alguien que no conoce este valor
// pueda escribir en tu hoja aunque encuentre la URL.
const APP_SECRET = "agua-rosana-2026";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Nombre", "Fecha", "ML", "Actualizado"]);
  }
  return sheet;
}

// Las fechas que Google Sheets guarda como texto "2026-09-29" a veces las
// convierte solas en un valor de fecha real. Esto normaliza cualquiera de
// los dos casos a un string "YYYY-MM-DD" para poder comparar sin líos.
function normDate_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v || "").trim();
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Recibe cada vez que alguien añade agua en la app: guarda/actualiza SU TOTAL
// de hoy (no suma, sobrescribe con el total acumulado que ya calcula la app,
// así un aviso duplicado o reintento de red nunca duplica litros).
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== APP_SECRET) {
      return jsonOut_({ ok: false, error: "secreto incorrecto" });
    }
    const name = String(data.name || "").trim().slice(0, 40);
    const date = String(data.date || "").trim(); // "YYYY-MM-DD"
    const ml = Math.max(0, parseInt(data.ml, 10) || 0);
    if (!name || !date) {
      return jsonOut_({ ok: false, error: "faltan datos (nombre o fecha)" });
    }

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === name && normDate_(values[i][1]) === date) {
        rowIndex = i + 1; // +1 porque getRange es 1-indexado
        break;
      }
    }

    const now = new Date();
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 3).setValue(ml);
      sheet.getRange(rowIndex, 4).setValue(now);
    } else {
      sheet.appendRow([name, date, ml, now]);
    }

    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

// Devuelve el ranking ordenado de más a menos ml.
//  - ?date=YYYY-MM-DD            -> ranking de ese día (como antes)
//  - ?from=YYYY-MM-DD&to=YYYY-MM-DD -> suma de cada persona entre esas fechas (semana, mes...)
// "version: 2" le sirve a la app para saber que este script ya entiende rangos.
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const date = String(p.date || "").trim();
    const from = String(p.from || "").trim();
    const to = String(p.to || "").trim();
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();

    if (from && to) {
      const totals = {}; // nombre -> { ml, days }
      for (let i = 1; i < values.length; i++) {
        const name = String(values[i][0] || "").trim();
        const rDate = normDate_(values[i][1]); // "YYYY-MM-DD": se puede comparar como texto
        const ml = Number(values[i][2]) || 0;
        if (!name || rDate < from || rDate > to) continue;
        if (!totals[name]) totals[name] = { name: name, ml: 0, days: 0 };
        totals[name].ml += ml;
        if (ml > 0) totals[name].days += 1;
      }
      const list = Object.keys(totals).map(function (k) { return totals[k]; });
      list.sort(function (a, b) { return b.ml - a.ml; });
      return jsonOut_({ ok: true, version: 2, from: from, to: to, ranking: list });
    }

    const rows = [];
    for (let i = 1; i < values.length; i++) {
      const name = String(values[i][0] || "").trim();
      const rDate = normDate_(values[i][1]);
      const ml = Number(values[i][2]) || 0;
      if (!name) continue;
      if (!date || rDate === date) rows.push({ name: name, ml: ml });
    }
    rows.sort(function (a, b) { return b.ml - a.ml; });
    return jsonOut_({ ok: true, version: 2, date: date, ranking: rows });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
