// In Entwicklung (BASE_URL = "/") sollen Daten unter "/data" liegen,
// in Produktion (BASE_URL = "./") unter "./data" innerhalb von dist/app.asar.
export const DATA_BASE_PATH = import.meta.env.VITE_DATA_BASE_PATH ?? `${import.meta.env.BASE_URL}data`;
export const EXCEL_FILENAME = "Gesamtdaten_harmonisiert.xlsx";
export const MENTAL_MAPS_FILENAME = "Export_Mental_Maps.geojson";

export const EXCEL_PATH = `${DATA_BASE_PATH}/${EXCEL_FILENAME}`;
export const MENTAL_MAPS_PATH = `${DATA_BASE_PATH}/${MENTAL_MAPS_FILENAME}`;
