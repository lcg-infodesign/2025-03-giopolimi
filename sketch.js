// Margine esterno per non disegnare sui bordi del canvas
let outerMargin = 100;
let data;
let minLat, maxLat, minLon, maxLon;
let minElevation, maxElevation;
let validRows = [];
let loadError = false;

// Colori per status
const statusColors = {
  'Historical': '#FF6B6B',
  'Holocene': '#FFA500',
  'Pleistocene': '#4ECDC4',
  'Radiocarbon': '#95E1D3',
  'Fumarolic': '#FFE66D',
  'Uncertain': '#CCCCCC',
  'Unknown': '#888888'
};

function preload() {
  // Carica il CSV con header - p5.js gestisce gli errori automaticamente
  data = loadTable('dataset.csv', 'csv', 'header', 
    () => {
      console.log("✓ CSV caricato con successo");
    },
    (err) => {
      console.error("✗ ERRORE nel caricamento del CSV:", err);
      loadError = true;
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  
  console.log("=== DEBUG INFO ===");
  console.log("Window size:", windowWidth, "x", windowHeight);
  
  // Controlla se ci sono errori di caricamento
  if (loadError) {
    console.error("✗ Il file dataset.csv non è stato caricato!");
    console.log("Verifica:");
    console.log("1. Il file dataset.csv è nella stessa cartella di index.html");
    console.log("2. Il nome del file è esattamente 'dataset.csv' (minuscolo)");
    console.log("3. Il server permette il caricamento di file CSV");
    return;
  }
  
  if (!data) {
    console.error("✗ Oggetto data è null o undefined");
    return;
  }
  
  console.log("✓ Data object exists");
  console.log("Righe totali nel CSV:", data.getRowCount());
  console.log("Numero colonne:", data.getColumnCount());
  console.log("Nomi colonne:", data.columns);
  
  // Mostra alcune righe di esempio
  if (data.getRowCount() > 0) {
    console.log("Prima riga esempio:");
    console.log("  Volcano Name:", data.getString(0, 'Volcano Name'));
    console.log("  Latitude:", data.get(0, 'Latitude'));
    console.log("  Longitude:", data.get(0, 'Longitude'));
  }
  
  // Filtra solo le righe con coordinate valide
  for (let i = 0; i < data.getRowCount(); i++) {
    let latStr = data.get(i, 'Latitude');
    let lonStr = data.get(i, 'Longitude');
    let lat = parseFloat(latStr);
    let lon = parseFloat(lonStr);
    
    // Controlla se lat e lon sono numeri validi
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      validRows.push(i);
    }
  }
  
  console.log("Vulcani con coordinate valide:", validRows.length);
  
  if (validRows.length === 0) {
    console.error("ERRORE: Nessun vulcano con coordinate valide trovato!");
    console.log("Controlla che le colonne 'Latitude' e 'Longitude' esistano e contengano numeri");
    return;
  }
  
  // Calcola min/max solo per le righe valide
  let lats = [];
  let lons = [];
  let elevs = [];
  
  for (let i of validRows) {
    let lat = parseFloat(data.get(i, 'Latitude'));
    let lon = parseFloat(data.get(i, 'Longitude'));
    lats.push(lat);
    lons.push(lon);
    
    let elevStr = data.get(i, 'Elevation (m)');
    let elev = parseFloat(elevStr);
    if (!isNaN(elev) && elev > 0) elevs.push(elev);
  }
  
  minLat = min(lats);
  maxLat = max(lats);
  minLon = min(lons);
  maxLon = max(lons);
  minElevation = elevs.length > 0 ? min(elevs) : 0;
  maxElevation = elevs.length > 0 ? max(elevs) : 5000;
  
  console.log("Range Lat:", minLat.toFixed(2), "→", maxLat.toFixed(2));
  console.log("Range Lon:", minLon.toFixed(2), "→", maxLon.toFixed(2));
  console.log("Range Elevation:", minElevation.toFixed(0), "→", maxElevation.toFixed(0));
  console.log("==================");
}

function draw() {
  // Sfondo scuro
  background(15, 20, 35);
  
  // Se ci sono errori, mostra messaggio
  if (loadError || !data) {
    fill(255, 100, 100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("ERRORE: Impossibile caricare dataset.csv", width/2, height/2 - 20);
    textSize(14);
    text("Controlla che il file sia nella stessa cartella di index.html", width/2, height/2 + 20);
    return;
  }
  
  if (validRows.length === 0) {
    fill(255, 200, 100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Nessun vulcano con coordinate valide trovato", width/2, height/2);
    textSize(14);
    text("Apri la Console (F12) per dettagli", width/2, height/2 + 30);
    return;
  }
  
  // Titolo
  drawTitle();
  
  // Legenda (solo se c'è spazio)
  if (width > 900) {
    drawLegend();
  }
  
  // Variabile per memorizzare il vulcano su cui passa il mouse
  let hovered = null;
  
  // Ciclo per disegnare ogni vulcano valido
  for (let i of validRows) {
    // Leggo i dati dalle colonne
    let name = data.get(i, 'Volcano Name');
    let country = data.get(i, 'Country');
    let lat = parseFloat(data.get(i, 'Latitude'));
    let lon = parseFloat(data.get(i, 'Longitude'));
    let elevStr = data.get(i, 'Elevation (m)');
    let elevation = parseFloat(elevStr);
    let type = data.get(i, 'Type');
    let typeCategory = data.get(i, 'TypeCategory');
    let status = data.get(i, 'Status');
    let lastEruption = data.get(i, 'Last Known Eruption');
    
    // Converto le coordinate geografiche in coordinate del canvas
    let x = map(lon, minLon, maxLon, outerMargin, width - outerMargin);
    let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin);
    
    // Dimensione basata su elevazione
    let size = 10; // default
    if (!isNaN(elevation) && elevation > 0) {
      size = map(elevation, minElevation, maxElevation, 6, 20);
      size = constrain(size, 6, 20);
    }
    
    // Colore basato su status
    let col = statusColors[status] || '#FFFFFF';
    
    // Calcolo la distanza dal mouse
    let d = dist(mouseX, mouseY, x, y);
    let isHovered = d < size + 3;
    
    // Se il mouse è sopra il glifo, salvo i dati
    if (isHovered) {
      hovered = {
        x: x,
        y: y,
        name: name,
        country: country,
        lat: lat,
        lon: lon,
        elevation: elevation,
        type: type,
        typeCategory: typeCategory,
        status: status,
        lastEruption: lastEruption
      };
    }
    
    // Disegna il glifo
    drawGlyph(x, y, size, col, typeCategory, isHovered);
  }
  
  // Tooltip per vulcano selezionato
  if (hovered) {
    cursor('pointer');
    drawTooltip(hovered);
  } else {
    cursor('default');
  }
  
  // Info interazione
  fill(255, 150);
  noStroke();
  textSize(12);
  textAlign(LEFT);
  text('Passa il mouse sui vulcani per vedere i dettagli • ' + validRows.length + ' vulcani visualizzati', 20, height - 20);
}

function drawGlyph(x, y, size, col, typeCategory, isHovered) {
  push();
  translate(x, y);
  
  if (isHovered) {
    // Alone di evidenziazione
    noFill();
    stroke(255, 200);
    strokeWeight(2);
    ellipse(0, 0, size * 3.5, size * 3.5);
  }
  
  // Forma basata su tipo
  fill(col);
  noStroke();
  
  if (isHovered) {
    stroke(255, 255, 255, 200);
    strokeWeight(1.5);
  }
  
  // Diverse forme per diverse categorie
  if (typeCategory && typeCategory.includes('Stratovolcano')) {
    // Triangolo per stratovulcani
    triangle(0, -size * 0.7, -size * 0.6, size * 0.5, size * 0.6, size * 0.5);
  } else if (typeCategory && typeCategory.includes('Shield')) {
    // Arco per vulcani a scudo
    arc(0, size * 0.2, size * 1.8, size * 1.8, PI, TWO_PI);
    line(-size * 0.9, size * 0.2, size * 0.9, size * 0.2);
  } else if (typeCategory && typeCategory.includes('Caldera')) {
    // Anello per caldere
    stroke(col);
    strokeWeight(size * 0.25);
    noFill();
    ellipse(0, 0, size * 1.4, size * 1.4);
  } else if (typeCategory && typeCategory.includes('Complex')) {
    // Quadrato per complessi
    rectMode(CENTER);
    rect(0, 0, size * 1.3, size * 1.3);
  } else if (typeCategory && typeCategory.includes('Cone')) {
    // Triangolo piccolo per coni
    triangle(0, -size * 0.6, -size * 0.5, size * 0.4, size * 0.5, size * 0.4);
  } else if (typeCategory && (typeCategory.includes('Submarine') || typeCategory.includes('Hydrophonic'))) {
    // Forma ondulata per sottomarini
    noFill();
    stroke(col);
    strokeWeight(2);
    arc(0, 0, size * 1.5, size * 1.5, 0, PI);
  } else {
    // Cerchio di default
    ellipse(0, 0, size * 1.3, size * 1.3);
  }
  
  pop();
}

function drawTitle() {
  fill(255);
  noStroke();
  textSize(28);
  textAlign(LEFT);
  text('VULCANI DEL MONDO', 20, 45);
  
  textSize(13);
  fill(200);
  text('Mappa geografica • Colore = Status • Forma = Tipo • Dimensione = Elevazione', 20, 68);
}

function drawLegend() {
  let legendX = width - 330;
  let legendY = 100;
  
  // Box legenda con sfondo più opaco e ombra
  // Ombra
  noStroke();
  fill(0, 0, 0, 100);
  rect(legendX - 8, legendY - 8, 310, 500, 8);
  
  // Sfondo principale
  fill(15, 20, 35, 245);
  stroke(120, 130, 150);
  strokeWeight(2);
  rect(legendX - 10, legendY - 10, 310, 500, 8);
  
  // Bordo interno per maggiore definizione
  noFill();
  stroke(60, 70, 90);
  strokeWeight(1);
  rect(legendX - 8, legendY - 8, 306, 496, 7);
  
  // Titolo legenda
  fill(255);
  noStroke();
  textSize(15);
  textAlign(LEFT);
  text('LEGENDA', legendX, legendY + 12);
  
  // Status (colori)
  textSize(11);
  fill(180);
  text('STATUS (colore):', legendX, legendY + 40);
  
  let yOffset = legendY + 58;
  let statuses = ['Historical', 'Holocene', 'Pleistocene', 'Fumarolic', 'Unknown'];
  for (let status of statuses) {
    fill(statusColors[status]);
    ellipse(legendX + 8, yOffset, 10, 10);
    fill(255);
    noStroke();
    textAlign(LEFT);
    textSize(10);
    text(status, legendX + 25, yOffset + 4);
    yOffset += 22;
  }
  
  // Forme (tipi)
  yOffset += 15;
  fill(180);
  textSize(11);
  text('TIPO (forma):', legendX, yOffset);
  yOffset += 18;
  
  // Stratovolcano
  fill(255);
  noStroke();
  triangle(legendX + 8, yOffset - 6, legendX + 2, yOffset + 6, legendX + 14, yOffset + 6);
  textSize(10);
  text('Stratovolcano', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Shield
  arc(legendX + 8, yOffset + 2, 14, 14, PI, TWO_PI);
  line(legendX + 1, yOffset + 2, legendX + 15, yOffset + 2);
  text('Shield', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Caldera
  noFill();
  stroke(255);
  strokeWeight(2);
  ellipse(legendX + 8, yOffset, 12, 12);
  noStroke();
  fill(255);
  text('Caldera', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Complex
  rectMode(CENTER);
  rect(legendX + 8, yOffset, 10, 10);
  text('Complex', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Cone
  triangle(legendX + 8, yOffset - 5, legendX + 3, yOffset + 5, legendX + 13, yOffset + 5);
  text('Cone', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Submarine
  noFill();
  stroke(255);
  strokeWeight(2);
  arc(legendX + 8, yOffset, 12, 12, 0, PI);
  noStroke();
  fill(255);
  text('Submarine', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  // Altro
  ellipse(legendX + 8, yOffset, 10, 10);
  text('Altri tipi', legendX + 25, yOffset + 4);
  
  // Dimensione
  yOffset += 30;
  fill(180);
  textSize(11);
  text('DIMENSIONE (elevazione):', legendX, yOffset);
  yOffset += 18;
  
  fill(255);
  ellipse(legendX + 6, yOffset, 6, 6);
  textSize(10);
  text('Bassa', legendX + 25, yOffset + 4);
  yOffset += 22;
  
  ellipse(legendX + 8, yOffset, 12, 12);
  text('Media', legendX + 25, yOffset + 4);
  yOffset += 25;
  
  ellipse(legendX + 10, yOffset, 20, 20);
  text('Alta', legendX + 25, yOffset + 4);
}

function drawTooltip(v) {
  let tooltipW = 280;
  let padding = 12;
  let lineHeight = 18;
  let titleHeight = 22;
  
  // Calcola dinamicamente l'altezza in base ai campi disponibili
  let lines = 1; // titolo
  lines++; // paese
  if (v.type && v.type !== 'N/A') lines++;
  if (v.typeCategory && v.typeCategory !== 'N/A') lines++;
  lines++; // status
  lines++; // elevazione
  if (v.lastEruption && v.lastEruption !== 'Sconosciuta') lines++;
  lines++; // coordinate
  
  let tooltipH = titleHeight + (lines * lineHeight) + padding;
  
  // Posiziona SEMPRE a lato del vulcano, mai sopra
  // Prima prova a destra
  let tooltipX = v.x + 25;
  let tooltipY = v.y - tooltipH / 2;
  
  // Se esce a destra, metti a sinistra
  if (tooltipX + tooltipW > width - 20) {
    tooltipX = v.x - tooltipW - 25;
  }
  
  // Aggiusta verticalmente se esce dallo schermo
  if (tooltipY < 20) tooltipY = 20;
  if (tooltipY + tooltipH > height - 20) tooltipY = height - tooltipH - 20;
  
  // Box tooltip
  fill(20, 25, 40, 250);
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  rect(tooltipX, tooltipY, tooltipW, tooltipH, 6);
  
  // Linea che collega tooltip al vulcano
  stroke(255, 255, 255, 100);
  strokeWeight(1);
  line(v.x, v.y, tooltipX + (tooltipX > v.x ? 0 : tooltipW), tooltipY + tooltipH / 2);
  
  // Testo
  fill(255);
  noStroke();
  textSize(13);
  textAlign(LEFT);
  
  let ty = tooltipY + titleHeight;
  text(v.name, tooltipX + padding, ty);
  
  textSize(10);
  fill(220);
  ty += lineHeight + 2;
  text('Paese: ' + v.country, tooltipX + padding, ty);
  
  if (v.type && v.type !== 'N/A') {
    ty += lineHeight;
    text('Tipo: ' + v.type, tooltipX + padding, ty);
  }
  
  if (v.typeCategory && v.typeCategory !== 'N/A') {
    ty += lineHeight;
    text('Categoria: ' + v.typeCategory, tooltipX + padding, ty);
  }
  
  ty += lineHeight;
  text('Status: ' + v.status, tooltipX + padding, ty);
  
  ty += lineHeight;
  let elevText = (!isNaN(v.elevation) && v.elevation > 0) ? v.elevation.toFixed(0) + ' m' : 'N/A';
  text('Elevazione: ' + elevText, tooltipX + padding, ty);
  
  if (v.lastEruption && v.lastEruption !== 'Sconosciuta') {
    ty += lineHeight;
    text('Ultima eruzione: ' + v.lastEruption, tooltipX + padding, ty);
  }
  
  ty += lineHeight;
  text('Coordinate: ' + v.lat.toFixed(2) + '°, ' + v.lon.toFixed(2) + '°', tooltipX + padding, ty);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}