// Margine esterno per non disegnare sui bordi del canvas
let outerMargin = 100;
let rightMargin = 320; // Spazio riservato per la legenda
let dataObj;
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
  // Carica il CSV con header - aggiungi timestamp per evitare cache
  let timestamp = Date.now();
  dataObj = loadTable('dataset.csv?v=' + timestamp, 'csv', 'header', 
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
  
  // Fix per Safari: controlla se il font esiste prima di usarlo
  try {
    textFont('Atlas');
  } catch(e) {
    console.log("Font Atlas non disponibile, uso Arial");
  }
  
  // Calcola margini responsivi
  calculateMargins();
  
  console.log("=== DEBUG INFO ===");
  console.log("Window size:", windowWidth, "x", windowHeight);
  console.log("Browser:", navigator.userAgent.includes('Safari') ? 'Safari' : 'Other');
  
  // Controlla se ci sono errori di caricamento
  if (loadError) {
    console.error("✗ Il file dataset.csv non è stato caricato!");
    return;
  }
  
  if (!dataObj) {
    console.error("✗ Oggetto dataObj è null o undefined");
    return;
  }
  
  console.log("✓ Data object exists");
  console.log("Righe totali nel CSV:", dataObj.getRowCount());
  console.log("Numero colonne:", dataObj.getColumnCount());
  console.log("Nomi colonne:", dataObj.columns);
  
  // Mostra alcune righe di esempio
  if (dataObj.getRowCount() > 0) {
    console.log("Prima riga esempio:");
    console.log("  Volcano Name:", dataObj.getString(0, 'Volcano Name'));
    console.log("  Latitude:", dataObj.get(0, 'Latitude'));
    console.log("  Longitude:", dataObj.get(0, 'Longitude'));
  }
  
  // Filtra solo le righe con coordinate valide
  for (let i = 0; i < dataObj.getRowCount(); i++) {
    let latStr = dataObj.get(i, 'Latitude');
    let lonStr = dataObj.get(i, 'Longitude');
    let lat = parseFloat(latStr);
    let lon = parseFloat(lonStr);
    
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      validRows.push(i);
    }
  }
  
  console.log("Vulcani con coordinate valide:", validRows.length);
  
  if (validRows.length === 0) {
    console.error("ERRORE: Nessun vulcano con coordinate valide trovato!");
    return;
  }
  
  // Calcola min/max solo per le righe valide
  let lats = [];
  let lons = [];
  let elevs = [];
  
  for (let i of validRows) {
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    lats.push(lat);
    lons.push(lon);
    
    let elevStr = dataObj.get(i, 'Elevation (m)');
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

function calculateMargins() {
  if (width < 600) {
    outerMargin = 40;
    rightMargin = 0; // Niente legenda su mobile
  } else if (width < 900) {
    outerMargin = 60;
    rightMargin = 200;
  } else if (width < 1200) {
    outerMargin = 100;
    rightMargin = 220;
  } else {
    outerMargin = 100;
    rightMargin = 320;
  }
}

function draw() {
  background(15, 20, 35);
  
  if (loadError || !dataObj) {
    push();
    fill(255, 100, 100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("ERRORE: Impossibile caricare dataset.csv", width/2, height/2 - 20);
    textSize(14);
    fill(255);
    text("Controlla che il file sia nella stessa cartella di index.html", width/2, height/2 + 20);
    pop();
    return;
  }
  
  if (validRows.length === 0) {
    push();
    fill(255, 200, 100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Nessun vulcano con coordinate valide trovato", width/2, height/2);
    textSize(14);
    fill(255);
    text("Apri la Console (F12) per dettagli", width/2, height/2 + 30);
    pop();
    return;
  }
  
  drawTitle();
  
  // Legenda SEMPRE visibile a destra se c'è spazio
  if (width > 800) {
    drawLegend(width > 1200 ? 'full' : 'compact');
  }
  
  let hovered = null;
  
  // Disegna tutti i vulcani
  for (let i of validRows) {
    let name = dataObj.get(i, 'Volcano Name');
    let country = dataObj.get(i, 'Country');
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    let elevStr = dataObj.get(i, 'Elevation (m)');
    let elevation = parseFloat(elevStr);
    let type = dataObj.get(i, 'Type');
    let typeCategory = dataObj.get(i, 'TypeCategory');
    let status = dataObj.get(i, 'Status');
    let lastEruption = dataObj.get(i, 'Last Known Eruption');
    
    let x = map(lon, minLon, maxLon, outerMargin, width - outerMargin - rightMargin);
    let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin);
    
    let minSize = width < 600 ? 4 : 6;
    let maxSize = width < 600 ? 12 : 20;
    let size = minSize;
    if (!isNaN(elevation) && elevation > 0) {
      size = map(elevation, minElevation, maxElevation, minSize, maxSize);
      size = constrain(size, minSize, maxSize);
    }
    
    let col = statusColors[status] || '#FFFFFF';
    
    let d = dist(mouseX, mouseY, x, y);
    let isHovered = d < size + 3;
    
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
    
    drawGlyph(x, y, size, col, typeCategory, isHovered);
  }
  
  // Tooltip - SEMPRE disegnato per ultimo per stare sopra tutto
  if (hovered) {
    cursor('pointer');
    drawTooltip(hovered);
  } else {
    cursor('default');
  }
  
  // Info interazione
  push();
  fill(255, 150);
  noStroke();
  let fontSize = width < 600 ? 10 : 12;
  textSize(fontSize);
  textAlign(LEFT, BOTTOM);
  let infoText = width < 600 
    ? validRows.length + ' vulcani' 
    : 'Passa il mouse sui vulcani per scoprire di più • ' + validRows.length + ' vulcani';
  text(infoText, 20, height - 10);
  pop();
}

function drawGlyph(x, y, size, col, typeCategory, isHovered) {
  push();
  translate(x, y);
  
  if (isHovered) {
    noFill();
    stroke(255, 200);
    strokeWeight(2);
    ellipse(0, 0, size * 3.5, size * 3.5);
  }
  
  fill(col);
  noStroke();
  
  if (isHovered) {
    stroke(255, 255, 255, 200);
    strokeWeight(1.5);
  }
  
  if (typeCategory && typeCategory.includes('Stratovolcano')) {
    triangle(0, -size * 0.7, -size * 0.6, size * 0.5, size * 0.6, size * 0.5);
  } else if (typeCategory && typeCategory.includes('Shield')) {
    arc(0, size * 0.2, size * 1.8, size * 1.8, PI, TWO_PI);
    line(-size * 0.9, size * 0.2, size * 0.9, size * 0.2);
  } else if (typeCategory && typeCategory.includes('Caldera')) {
    stroke(col);
    strokeWeight(size * 0.25);
    noFill();
    ellipse(0, 0, size * 1.4, size * 1.4);
  } else if (typeCategory && typeCategory.includes('Complex')) {
    rectMode(CENTER);
    rect(0, 0, size * 1.3, size * 1.3);
  } else if (typeCategory && typeCategory.includes('Cone')) {
    triangle(0, -size * 0.6, -size * 0.5, size * 0.4, size * 0.5, size * 0.4);
  } else if (typeCategory && (typeCategory.includes('Submarine') || typeCategory.includes('Hydrophonic'))) {
    noFill();
    stroke(col);
    strokeWeight(2);
    arc(0, 0, size * 1.5, size * 1.5, 0, PI);
  } else {
    ellipse(0, 0, size * 1.3, size * 1.3);
  }
  
  pop();
}

function drawTitle() {
  push();
  fill(255);
  noStroke();
  
  let titleSize = width < 600 ? 18 : (width < 900 ? 22 : 28);
  let subtitleSize = width < 600 ? 10 : (width < 900 ? 11 : 13);
  
  textSize(titleSize);
  textAlign(LEFT, TOP);
  text('VULCANI DEL MONDO', 20, 25);
  
  if (width > 600) {
    textSize(subtitleSize);
    fill(200);
    text('Rappresentazione geografica attraverso un sistema di glifi', 20, 57);
  }
  pop();
}

function drawLegend(mode) {
  push();
  
  let legendW = mode === 'compact' ? 180 : 270;
  let legendH = mode === 'compact' ? 260 : 460;
  let legendX = width - legendW - 25;
  let legendY = 110;
  
  // Ombra
  noStroke();
  fill(0, 0, 0, 80);
  rect(legendX + 4, legendY + 4, legendW, legendH, 8);
  
  // Sfondo
  fill(15, 20, 35, 240);
  stroke(120, 130, 150);
  strokeWeight(1.5);
  rect(legendX, legendY, legendW, legendH, 8);
  
  // Bordo interno
  noFill();
  stroke(60, 70, 90);
  strokeWeight(1);
  rect(legendX + 3, legendY + 3, legendW - 6, legendH - 6, 6);
  
  // Titolo
  fill(255);
  noStroke();
  textSize(13);
  textAlign(LEFT, TOP);
  text('LEGENDA', legendX + 15, legendY + 15);
  
  let yPos = legendY + 40;
  let spacing = mode === 'compact' ? 17 : 20;
  let txtSize = mode === 'compact' ? 9 : 10;
  
  // STATUS
  textSize(10);
  fill(180);
  text('STATUS:', legendX + 15, yPos);
  yPos += spacing + 3;
  
  let statuses = mode === 'compact' 
    ? ['Historical', 'Holocene', 'Fumarolic'] 
    : ['Historical', 'Holocene', 'Pleistocene', 'Fumarolic', 'Unknown'];
  
  textSize(txtSize);
  for (let status of statuses) {
    fill(statusColors[status]);
    noStroke();
    ellipse(legendX + 20, yPos, 7, 7);
    fill(230);
    textAlign(LEFT, TOP);
    text(status, legendX + 32, yPos - 5);
    yPos += spacing;
  }
  
  // TIPO
  yPos += 8;
  fill(180);
  textSize(10);
  text('TIPO:', legendX + 15, yPos);
  yPos += spacing + 3;
  
  textSize(txtSize);
  if (mode === 'full') {
    // Stratovolcano
    fill(255);
    noStroke();
    triangle(legendX + 20, yPos - 3, legendX + 15, yPos + 4, legendX + 25, yPos + 4);
    text('Stratovolcano', legendX + 32, yPos - 5);
    yPos += spacing;
    
    // Shield
    arc(legendX + 20, yPos + 1, 11, 11, PI, TWO_PI);
    line(legendX + 14.5, yPos + 1, legendX + 25.5, yPos + 1);
    text('Shield', legendX + 32, yPos - 5);
    yPos += spacing;
    
    // Caldera
    noFill();
    stroke(255);
    strokeWeight(1.5);
    ellipse(legendX + 20, yPos, 9, 9);
    noStroke();
    fill(255);
    text('Caldera', legendX + 32, yPos - 5);
    yPos += spacing;
    
    // Complex
    noStroke();
    rectMode(CENTER);
    rect(legendX + 20, yPos, 8, 8);
    text('Complex', legendX + 32, yPos - 5);
    yPos += spacing;
    
    // Altri
    ellipse(legendX + 20, yPos, 7, 7);
    text('Altri', legendX + 32, yPos - 5);
    
    // ELEVAZIONE
    yPos += spacing + 15;
    fill(180);
    textSize(10);
    text('ELEVAZIONE:', legendX + 15, yPos);
    yPos += spacing + 3;
    
    fill(255);
    textSize(txtSize);
    ellipse(legendX + 18, yPos, 5, 5);
    text('Bassa', legendX + 32, yPos - 5);
    yPos += spacing;
    
    ellipse(legendX + 20, yPos, 10, 10);
    text('Media', legendX + 32, yPos - 5);
    yPos += spacing + 4;
    
    ellipse(legendX + 22, yPos, 16, 16);
    text('Alta', legendX + 32, yPos - 5);
  } else {
    // Versione compatta
    fill(255);
    noStroke();
    triangle(legendX + 20, yPos - 3, legendX + 15, yPos + 4, legendX + 25, yPos + 4);
    text('Strato', legendX + 32, yPos - 5);
    yPos += spacing;
    
    noFill();
    stroke(255);
    strokeWeight(1.5);
    ellipse(legendX + 20, yPos, 9, 9);
    noStroke();
    fill(255);
    text('Caldera', legendX + 32, yPos - 5);
    yPos += spacing;
    
    noStroke();
    ellipse(legendX + 20, yPos, 7, 7);
    text('Altri', legendX + 32, yPos - 5);
  }
  
  pop();
}

function drawTooltip(v) {
  push();
  
  let tooltipW = width < 600 ? 200 : 280;
  let padding = 12;
  let lineH = width < 600 ? 15 : 17;
  let titleH = width < 600 ? 20 : 28; // Più alto per fare spazio al simbolo
  
  // Calcola altezza necessaria
  let numLines = 2; // nome + paese
  if (v.type && v.type !== 'N/A') numLines++;
  if (v.typeCategory && v.typeCategory !== 'N/A') numLines++;
  numLines++; // status
  numLines++; // elevation
  if (v.lastEruption && v.lastEruption !== 'Sconosciuta') numLines++;
  numLines++; // coordinate
  
  let tooltipH = titleH + (numLines * lineH) + padding * 2;
  
  // POSIZIONAMENTO LATERALE (non sopra!)
  let tooltipX, tooltipY;
  let spacing = 30; // Distanza dal vulcano
  
  // Prima prova a DESTRA del vulcano
  tooltipX = v.x + spacing;
  tooltipY = v.y - tooltipH / 2;
  
  // Se va fuori a destra, metti a SINISTRA
  if (tooltipX + tooltipW > width - rightMargin - 30) {
    tooltipX = v.x - tooltipW - spacing;
  }
  
  // Se va fuori a sinistra, forza a destra con clip
  if (tooltipX < 30) {
    tooltipX = v.x + spacing;
    if (tooltipX + tooltipW > width - rightMargin - 30) {
      tooltipX = width - rightMargin - tooltipW - 30;
    }
  }
  
  // Aggiusta verticale
  if (tooltipY < 90) tooltipY = 90;
  if (tooltipY + tooltipH > height - 50) tooltipY = height - tooltipH - 50;
  
  // Linea connettore
  stroke(255, 255, 255, 80);
  strokeWeight(1);
  noFill();
  let connectorX = tooltipX + (tooltipX > v.x ? 0 : tooltipW);
  line(v.x, v.y, connectorX, tooltipY + tooltipH / 2);
  
  // Box tooltip
  fill(18, 22, 38, 250);
  stroke(255, 255, 255, 180);
  strokeWeight(1.5);
  rect(tooltipX, tooltipY, tooltipW, tooltipH, 6);
  
  // Bordo interno sottile
  noFill();
  stroke(80, 90, 110);
  strokeWeight(1);
  rect(tooltipX + 2, tooltipY + 2, tooltipW - 4, tooltipH - 4, 5);
  
  // Testo
  noStroke();
  let titleSize = width < 600 ? 11 : 12;
  let txtSize = width < 600 ? 9 : 10;
  
  textAlign(LEFT, TOP);
  
  // Nome vulcano con simbolo a sinistra
  fill(255);
  textSize(titleSize);
  let ty = tooltipY + padding;
  
  // Disegna il simbolo del vulcano nel tooltip
  let symbolSize = 7;
  let symbolX = tooltipX + padding + symbolSize / 2;
  let symbolY = ty + symbolSize / 2 + 2;
  drawGlyphInTooltip(symbolX, symbolY, symbolSize, statusColors[v.status] || '#FFFFFF', v.typeCategory);
  
  // Nome accanto al simbolo
  text(v.name, tooltipX + padding + symbolSize + 8, ty);
  ty += titleH;
  
  // Info dettagliate
  fill(220);
  textSize(txtSize);
  
  text('Paese: ' + v.country, tooltipX + padding, ty);
  ty += lineH;
  
  if (v.type && v.type !== 'N/A') {
    text('Tipo: ' + v.type, tooltipX + padding, ty);
    ty += lineH;
  }
  
  if (v.typeCategory && v.typeCategory !== 'N/A') {
    text('Categoria: ' + v.typeCategory, tooltipX + padding, ty);
    ty += lineH;
  }
  
  text('Status: ' + v.status, tooltipX + padding, ty);
  ty += lineH;
  
  let elevText = (!isNaN(v.elevation) && v.elevation > 0) 
    ? v.elevation.toFixed(0) + ' m' 
    : 'N/A';
  text('Elevazione: ' + elevText, tooltipX + padding, ty);
  ty += lineH;
  
  if (v.lastEruption && v.lastEruption !== 'Sconosciuta') {
    text('Ultima eruzione: ' + v.lastEruption, tooltipX + padding, ty);
    ty += lineH;
  }
  
  text('Lat: ' + v.lat.toFixed(2) + '° Lon: ' + v.lon.toFixed(2) + '°', tooltipX + padding, ty);
  
  pop();
}

// Funzione per disegnare il glifo nel tooltip (senza hover effect)
function drawGlyphInTooltip(x, y, size, col, typeCategory) {
  push();
  translate(x, y);
  
  fill(col);
  stroke(255, 255, 255, 150);
  strokeWeight(1);
  
  if (typeCategory && typeCategory.includes('Stratovolcano')) {
    triangle(0, -size * 0.7, -size * 0.6, size * 0.5, size * 0.6, size * 0.5);
  } else if (typeCategory && typeCategory.includes('Shield')) {
    arc(0, size * 0.2, size * 1.8, size * 1.8, PI, TWO_PI);
    line(-size * 0.9, size * 0.2, size * 0.9, size * 0.2);
  } else if (typeCategory && typeCategory.includes('Caldera')) {
    stroke(col);
    strokeWeight(size * 0.25);
    noFill();
    ellipse(0, 0, size * 1.4, size * 1.4);
  } else if (typeCategory && typeCategory.includes('Complex')) {
    rectMode(CENTER);
    rect(0, 0, size * 1.3, size * 1.3);
  } else if (typeCategory && typeCategory.includes('Cone')) {
    triangle(0, -size * 0.6, -size * 0.5, size * 0.4, size * 0.5, size * 0.4);
  } else if (typeCategory && (typeCategory.includes('Submarine') || typeCategory.includes('Hydrophonic'))) {
    noFill();
    stroke(col);
    strokeWeight(2);
    arc(0, 0, size * 1.5, size * 1.5, 0, PI);
  } else {
    ellipse(0, 0, size * 1.3, size * 1.3);
  }
  
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateMargins();
}