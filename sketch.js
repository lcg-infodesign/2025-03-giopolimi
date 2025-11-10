// Margine esterno per non disegnare sui bordi del canvas
let outerMargin = 100;
let rightMargin = 320;
let topMargin = 95; // Margine superiore più piccolo per ingrandire mappa
let dataObj;
let minLat, maxLat, minLon, maxLon;
let minElevation, maxElevation;
let validRows = [];
let loadError = false;
let countryFilter = 'All';
let uniqueCountries = [];
let countrySelect;

// Palette colori vintage ispirata a mappe antiche
const statusColors = {
  'Historical': '#8B3A3A',      
  'Holocene': '#B8860B',        
  'Pleistocene': '#5F8575',     
  'Radiocarbon': '#6B8E6B',     
  'Fumarolic': '#D4A574',       
  'Uncertain': '#8B8680',       
  'Unknown': '#6B6B6B'         
};

function preload() {
  let timestamp = Date.now();
  dataObj = loadTable('dataset.csv?v=' + timestamp, 'csv', 'header', 
    () => console.log("✓ CSV caricato con successo"),
    (err) => {
      console.error("✗ ERRORE nel caricamento del CSV:", err);
      loadError = true;
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Georgia');
  calculateMargins();
  
  console.log("=== DEBUG INFO ===");
  console.log("Window size:", windowWidth, "x", windowHeight);
  
  if (loadError || !dataObj) {
    console.error("✗ Errore caricamento dati");
    return;
  }
  
  console.log("✓ Righe totali:", dataObj.getRowCount());
  console.log("✓ Colonne:", dataObj.columns);
  
  // Filtra righe con coordinate valide
  for (let i = 0; i < dataObj.getRowCount(); i++) {
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      validRows.push(i);
    }
  }
  
  console.log("✓ Vulcani validi:", validRows.length);
  
  if (validRows.length === 0) {
    console.error("✗ Nessun vulcano con coordinate valide!");
    return;
  }
  
  // Raccogli tutti i paesi unici
  let countriesSet = new Set();
  for (let i of validRows) {
    let country = dataObj.get(i, 'Country');
    if (country && country !== '') {
      countriesSet.add(country);
    }
  }
  uniqueCountries = Array.from(countriesSet).sort();
  
  // Crea dropdown per filtro paesi
  createCountryFilter();
  
  // Calcola range geografici
  let lats = [], lons = [], elevs = [];
  
  for (let i of validRows) {
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    lats.push(lat);
    lons.push(lon);
    
    let elev = parseFloat(dataObj.get(i, 'Elevation (m)'));
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
  console.log("==================");
}

function createCountryFilter() {
  // Rimuovi il select precedente se esiste
  if (countrySelect) {
    countrySelect.remove();
  }
  
  // Crea il dropdown
  countrySelect = createSelect();
  countrySelect.option('All Countries', 'All');
  
  for (let country of uniqueCountries) {
    countrySelect.option(country);
  }
  
  countrySelect.changed(() => {
    countryFilter = countrySelect.value();
  });
  
  // Posiziona il dropdown
  positionCountryFilter();
  
  // Stile dropdown
  countrySelect.style('font-family', 'Georgia');
  countrySelect.style('font-size', width < 600 ? '12px' : '13px');
  countrySelect.style('padding', '8px 12px');
  countrySelect.style('background-color', 'rgb(230, 220, 195)');
  countrySelect.style('border', '2px solid rgb(90, 70, 50)');
  countrySelect.style('border-radius', '4px');
  countrySelect.style('color', 'rgb(50, 35, 25)');
  countrySelect.style('cursor', 'pointer');
  countrySelect.style('box-shadow', '2px 2px 4px rgba(80, 60, 40, 0.3)');
}

function positionCountryFilter() {
  if (!countrySelect) return;
  
  let filterX = 25;
  let filterY = width < 600 ? 50 : 79;
  
  countrySelect.position(filterX, filterY);
}

function calculateMargins() {
  if (width < 600) {
    outerMargin = 30; 
    rightMargin = 10;
    topMargin = 75; 
  } else if (width < 900) {
    outerMargin = 50; 
    rightMargin = 200;
    topMargin = 85; 
  } else if (width < 1200) {
    outerMargin = 60; 
    rightMargin = 230;
    topMargin = 90;
  } else {
    outerMargin = 70;
    rightMargin = 340;
    topMargin = 95;
  }
}

function draw() {
  background(235, 225, 205);
  
  if (loadError || !dataObj) {
    push();
    fill(100, 70, 50);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("ERROR: Unable to load dataset.csv", width/2, height/2 - 20);
    textSize(14);
    fill(120, 90, 70);
    text("Check that the file is in the same folder", width/2, height/2 + 20);
    pop();
    return;
  }
  
  if (validRows.length === 0) {
    push();
    fill(120, 90, 70);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("No volcanoes found", width/2, height/2);
    pop();
    return;
  }
  
  // Bordo decorativo
  drawVintageBorder();
  
  drawTitle();
  
  if (width > 800) {
    drawLegend(width > 1200 ? 'full' : 'compact');
  }
  
  let hovered = null;
  
  // Conta vulcani visibili e calcola range filtrato
  let visibleCount = 0;
  let filteredLats = [];
  let filteredLons = [];
  
  // Prima passata: raccoglie coordinate dei vulcani filtrati
  for (let i of validRows) {
    let country = dataObj.get(i, 'Country');
    
    if (countryFilter !== 'All' && country !== countryFilter) {
      continue;
    }
    
    visibleCount++;
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    filteredLats.push(lat);
    filteredLons.push(lon);
  }
  
  // Calcola range per il paese filtrato (con margine per evitare bordi)
  let displayMinLat = minLat;
  let displayMaxLat = maxLat;
  let displayMinLon = minLon;
  let displayMaxLon = maxLon;
  
  if (countryFilter !== 'All' && filteredLats.length > 0) {
    let fMinLat = min(filteredLats);
    let fMaxLat = max(filteredLats);
    let fMinLon = min(filteredLons);
    let fMaxLon = max(filteredLons);
    
    // Margine del 15% per non tagliare ai bordi
    let latPadding = (fMaxLat - fMinLat) * 0.15;
    let lonPadding = (fMaxLon - fMinLon) * 0.15;
    
    // Range è molto piccolo --> padding minimo
    if (latPadding < 2) latPadding = 2;
    if (lonPadding < 2) lonPadding = 2;
    
    displayMinLat = fMinLat - latPadding;
    displayMaxLat = fMaxLat + latPadding;
    displayMinLon = fMinLon - lonPadding;
    displayMaxLon = fMaxLon + lonPadding;
  }
  
  // Disegna vulcani
  for (let i of validRows) {
    let name = dataObj.get(i, 'Volcano Name');
    let country = dataObj.get(i, 'Country');
    
    // Filtro paese
    if (countryFilter !== 'All' && country !== countryFilter) {
      continue;
    }
    
    let lat = parseFloat(dataObj.get(i, 'Latitude'));
    let lon = parseFloat(dataObj.get(i, 'Longitude'));
    let elevation = parseFloat(dataObj.get(i, 'Elevation (m)'));
    let type = dataObj.get(i, 'Type');
    let typeCategory = dataObj.get(i, 'TypeCategory');
    let status = dataObj.get(i, 'Status');
    let lastEruption = dataObj.get(i, 'Last Known Eruption');
    
    // Usa il range filtrato per mappare le coordinate
    let x = map(lon, displayMinLon, displayMaxLon, outerMargin, width - outerMargin - rightMargin);
    let y = map(lat, displayMinLat, displayMaxLat, height - outerMargin, topMargin);
    
    let minSize = width < 600 ? 4 : 6;
    let maxSize = width < 600 ? 14 : 22;
    let size = minSize;
    if (!isNaN(elevation) && elevation > 0) {
      size = map(elevation, minElevation, maxElevation, minSize, maxSize);
      size = constrain(size, minSize, maxSize);
    }
    
    let col = statusColors[status] || '#8B7355';
    
    let d = dist(mouseX, mouseY, x, y);
    let isHovered = d < size * 0.9;
    
    if (isHovered) {
      hovered = {
        x, y, name, country, lat, lon, elevation, 
        type, typeCategory, status, lastEruption
      };
    }
    
    drawVintageGlyph(x, y, size, col, typeCategory, isHovered);
  }
  
  if (hovered) {
    cursor('pointer');
    drawVintageTooltip(hovered);
  } else {
    cursor('default');
  }
  
  // Info in basso
  push();
  fill(80, 60, 45, 200);
  noStroke();
  textSize(width < 600 ? 10 : 11);
  textAlign(LEFT, BOTTOM);
  textStyle(ITALIC);
  let infoText = width < 600 
    ? visibleCount + ' volcanoes shown' 
    : 'Passa il mouse sui vulcani per scoprire di più • ' + visibleCount + ' vulcani mostrati';
  text(infoText, 25, height - 20);
  pop();
}

function drawVintageBorder() {
  push();
  noFill();
  
  stroke(90, 70, 50);
  strokeWeight(3);
  rect(outerMargin - 50, topMargin - 20, 
       width - outerMargin - rightMargin - outerMargin + 90 , 
       height - topMargin - outerMargin + 40, 3);
  
  pop();
}

function drawVintageGlyph(x, y, size, col, typeCategory, isHovered) {
  push();
  translate(x, y);
  
  if (isHovered) {
    // Alone luminoso
    noFill();
    stroke(139, 90, 43, 120);
    strokeWeight(2.5);
    ellipse(0, 0, size * 3.5, size * 3.5);
  }
  
  fill(col);
  stroke(60, 45, 30, 200);
  strokeWeight(isHovered ? 2.5 : 1.8);
  
  // Glifo in base al tipo
  if (typeCategory && typeCategory.includes('Stratovolcano')) {
    triangle(0, -size * 0.75, -size * 0.65, size * 0.55, size * 0.65, size * 0.55);
  } else if (typeCategory && typeCategory.includes('Shield')) {
    arc(0, size * 0.25, size * 1.9, size * 1.9, PI, TWO_PI);
    line(-size * 0.95, size * 0.25, size * 0.95, size * 0.25);
  } else if (typeCategory && typeCategory.includes('Caldera')) {
    noFill();
    stroke(col);
    strokeWeight(size * 0.3);
    ellipse(0, 0, size * 1.5, size * 1.5);
  } else if (typeCategory && typeCategory.includes('Complex')) {
    rectMode(CENTER);
    rect(0, 0, size * 1.4, size * 1.4);
  } else if (typeCategory && typeCategory.includes('Cone')) {
    triangle(0, -size * 0.65, -size * 0.55, size * 0.45, size * 0.55, size * 0.45);
  } else if (typeCategory && (typeCategory.includes('Submarine') || typeCategory.includes('Hydrophonic'))) {
    noFill();
    arc(0, 0, size * 1.6, size * 1.6, 0, PI);
  } else {
    ellipse(0, 0, size * 1.4, size * 1.4);
  }
  
  pop();
}

function drawTitle() {
  push();
  fill(50, 35, 25);
  noStroke();
  
  let titleSize = width < 600 ? 20 : (width < 900 ? 26 : 34);
  let subtitleSize = width < 600 ? 11 : (width < 900 ? 12 : 14);
  
  textSize(titleSize);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  text('VULCANI DEL MONDO', 25, 9);
  
  if (width > 600) {
    textSize(subtitleSize);
    fill(80, 60, 45);
    textStyle(ITALIC);
    text('Rappresentazione geografica interattiva di un sistema di glifi', 25, 45);
  }
  pop();
}

function drawLegend(mode) {
  push();
  
  let legendW = mode === 'compact' ? 185 : 280;
  let legendH = mode === 'compact' ? 270 : 520;
  let legendX = width - legendW - 30;
  let legendY = 115;
  
  noStroke();
  fill(80, 60, 40, 50);
  rect(legendX + 5, legendY + 5, legendW, legendH, 4);
  
  // Sfondo
  fill(230, 220, 195, 250);
  stroke(90, 70, 50);
  strokeWeight(3);
  rect(legendX, legendY, legendW, legendH, 4);
  
  // Doppio bordo decorativo
  noFill();
  stroke(120, 100, 75);
  strokeWeight(1.5);
  rect(legendX + 6, legendY + 6, legendW - 12, legendH - 12, 3);
  
  stroke(140, 120, 90);
  strokeWeight(0.8);
  rect(legendX + 10, legendY + 10, legendW - 20, legendH - 20, 2);
  
  // Titolo
  fill(50, 35, 25);
  noStroke();
  textSize(15);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('LEGEND', legendX + 18, legendY + 18);
  textStyle(NORMAL);
  
  let yPos = legendY + 48;
  let spacing = mode === 'compact' ? 18 : 22;
  let txtSize = mode === 'compact' ? 10 : 11;
  
  // STATUS
  textSize(11);
  fill(80, 60, 45);
  text('Activity Status:', legendX + 18, yPos);
  yPos += spacing + 5;
  
  let statuses = mode === 'compact' 
    ? ['Historical', 'Holocene', 'Fumarolic'] 
    : ['Historical', 'Holocene', 'Pleistocene', 'Fumarolic', 'Unknown'];
  
  textSize(txtSize);
  for (let status of statuses) {
    fill(statusColors[status]);
    stroke(60, 45, 30);
    strokeWeight(1.2);
    ellipse(legendX + 23, yPos, 8, 8);
    
    fill(60, 45, 30);
    noStroke();
    textAlign(LEFT, TOP);
    text(status, legendX + 36, yPos - 6);
    yPos += spacing;
  }
  
  // TIPO
  yPos += 10;
  fill(80, 60, 45);
  textSize(11);
  text('Volcano Type:', legendX + 18, yPos);
  yPos += spacing + 5;
  
  textSize(txtSize);
  if (mode === 'full') {
    // Stratovolcano
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    triangle(legendX + 23, yPos - 4, legendX + 17, yPos + 5, legendX + 29, yPos + 5);
    noStroke();
    fill(60, 45, 30);
    text('Stratovolcano', legendX + 36, yPos - 6);
    yPos += spacing;
    
    // Shield
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    arc(legendX + 23, yPos + 2, 13, 13, PI, TWO_PI);
    line(legendX + 16.5, yPos + 2, legendX + 29.5, yPos + 2);
    noStroke();
    fill(60, 45, 30);
    text('Shield', legendX + 36, yPos - 6);
    yPos += spacing;
    
    // Caldera
    noFill();
    stroke(139, 90, 43);
    strokeWeight(2);
    ellipse(legendX + 23, yPos, 10, 10);
    noStroke();
    fill(60, 45, 30);
    text('Caldera', legendX + 36, yPos - 6);
    yPos += spacing;
    
    // Complex
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    rectMode(CENTER);
    rect(legendX + 23, yPos, 9, 9);
    noStroke();
    fill(60, 45, 30);
    text('Complex', legendX + 36, yPos - 6);
    yPos += spacing;
    
    // Submarine
    noFill();
    stroke(139, 90, 43);
    strokeWeight(1.5);
    arc(legendX + 23, yPos, 11, 11, 0, PI);
    noStroke();
    fill(60, 45, 30);
    text('Submarine', legendX + 36, yPos - 6);
    yPos += spacing;
    
    // Altri
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    ellipse(legendX + 23, yPos, 8, 8);
    noStroke();
    fill(60, 45, 30);
    text('Others', legendX + 36, yPos - 6);
    
    // ELEVAZIONE
    yPos += spacing + 18;
    fill(80, 60, 45);
    textSize(11);
    text('Elevation:', legendX + 18, yPos);
    yPos += spacing + 5;
    
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.2);
    textSize(txtSize);
    ellipse(legendX + 21, yPos, 6, 6);
    noStroke();
    fill(60, 45, 30);
    text('Low', legendX + 40, yPos - 6);
    yPos += spacing;
    
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.2);
    ellipse(legendX + 23, yPos, 11, 11);
    noStroke();
    fill(60, 45, 30);
    text('Medium', legendX + 40, yPos - 6);
    yPos += spacing + 5;
    
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.2);
    ellipse(legendX + 25, yPos, 18, 18);
    noStroke();
    fill(60, 45, 30);
    text('High', legendX + 40, yPos - 6);
  } else {
    // Versione compatta
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    triangle(legendX + 23, yPos - 4, legendX + 17, yPos + 5, legendX + 29, yPos + 5);
    noStroke();
    fill(60, 45, 30);
    text('Strato', legendX + 36, yPos - 6);
    yPos += spacing;
    
    noFill();
    stroke(139, 90, 43);
    strokeWeight(2);
    ellipse(legendX + 23, yPos, 10, 10);
    noStroke();
    fill(60, 45, 30);
    text('Caldera', legendX + 36, yPos - 6);
    yPos += spacing;
    
    fill(139, 90, 43);
    stroke(60, 45, 30);
    strokeWeight(1.5);
    ellipse(legendX + 23, yPos, 8, 8);
    noStroke();
    fill(60, 45, 30);
    text('Others', legendX + 36, yPos - 6);
  }
  
  pop();
}

function drawVintageTooltip(v) {
  push();
  
  let tooltipW = width < 600 ? 210 : 300;
  let padding = 14;
  let lineH = width < 600 ? 16 : 19;
  let titleH = width < 600 ? 22 : 32;
  
  let numLines = 2;
  if (v.type && v.type !== 'N/A') numLines++;
  if (v.typeCategory && v.typeCategory !== 'N/A') numLines++;
  numLines += 3; // status, elevation, coordinates
  if (v.lastEruption && v.lastEruption !== 'Unknown') numLines++;
  
  let tooltipH = titleH + (numLines * lineH) + padding * 2;
  
  let tooltipX, tooltipY;
  let spacing = 35;
  
  tooltipX = v.x + spacing;
  tooltipY = v.y - tooltipH / 2;
  
  if (tooltipX + tooltipW > width - rightMargin - 35) {
    tooltipX = v.x - tooltipW - spacing;
  }
  
  if (tooltipX < 35) {
    tooltipX = v.x + spacing;
    if (tooltipX + tooltipW > width - rightMargin - 35) {
      tooltipX = width - rightMargin - tooltipW - 35;
    }
  }
  
  if (tooltipY < 95) tooltipY = 95;
  if (tooltipY + tooltipH > height - 55) tooltipY = height - tooltipH - 55;
  
  // Linea connettore vintage
  stroke(100, 80, 60, 120);
  strokeWeight(1.5);
  noFill();
  let connectorX = tooltipX + (tooltipX > v.x ? 0 : tooltipW);
  line(v.x, v.y, connectorX, tooltipY + tooltipH / 2);
  
  // Box pergamena
  fill(230, 220, 195, 250);
  stroke(90, 70, 50);
  strokeWeight(3);
  rect(tooltipX, tooltipY, tooltipW, tooltipH, 5);
  
  // Bordi decorativi
  noFill();
  stroke(120, 100, 75);
  strokeWeight(1.5);
  rect(tooltipX + 4, tooltipY + 4, tooltipW - 8, tooltipH - 8, 4);
  
  stroke(140, 120, 90);
  strokeWeight(0.8);
  rect(tooltipX + 7, tooltipY + 7, tooltipW - 14, tooltipH - 14, 3);
  
  // Testo
  noStroke();
  let titleSize = width < 600 ? 12 : 14;
  let txtSize = width < 600 ? 10 : 11;
  
  textAlign(LEFT, TOP);
  
  // Nome vulcano
  fill(50, 35, 25);
  textSize(titleSize);
  textStyle(BOLD);
  let ty = tooltipY + padding;
  
  let symbolSize = 8;
  let symbolX = tooltipX + padding + symbolSize / 2;
  let symbolY = ty + symbolSize / 2 + 3;
  drawVintageGlyphSmall(symbolX, symbolY, symbolSize, statusColors[v.status] || '#8B7355', v.typeCategory);
  
  text(v.name, tooltipX + padding + symbolSize + 10, ty);
  ty += titleH;
  
  textStyle(NORMAL);
  
  // Info
  fill(60, 45, 30);
  textSize(txtSize);
  
  text('Country: ' + v.country, tooltipX + padding, ty);
  ty += lineH;
  
  if (v.type && v.type !== 'N/A') {
    text('Type: ' + v.type, tooltipX + padding, ty);
    ty += lineH;
  }
  
  if (v.typeCategory && v.typeCategory !== 'N/A') {
    text('Category: ' + v.typeCategory, tooltipX + padding, ty);
    ty += lineH;
  }
  
  text('Status: ' + v.status, tooltipX + padding, ty);
  ty += lineH;
  
  let elevText = (!isNaN(v.elevation) && v.elevation > 0) 
    ? v.elevation.toFixed(0) + ' m' 
    : 'Unknown';
  text('Elevation: ' + elevText, tooltipX + padding, ty);
  ty += lineH;
  
  if (v.lastEruption && v.lastEruption !== 'Unknown') {
    text('Last Eruption: ' + v.lastEruption, tooltipX + padding, ty);
    ty += lineH;
  }
  
  text('Lat: ' + v.lat.toFixed(2) + '° Lon: ' + v.lon.toFixed(2) + '°', tooltipX + padding, ty);
  
  pop();
}

function drawVintageGlyphSmall(x, y, size, col, typeCategory) {
  push();
  translate(x, y);
  
  fill(col);
  stroke(60, 45, 30, 180);
  strokeWeight(1.5);
  
  if (typeCategory && typeCategory.includes('Stratovolcano')) {
    triangle(0, -size * 0.75, -size * 0.65, size * 0.55, size * 0.65, size * 0.55);
  } else if (typeCategory && typeCategory.includes('Shield')) {
    arc(0, size * 0.25, size * 1.9, size * 1.9, PI, TWO_PI);
    line(-size * 0.95, size * 0.25, size * 0.95, size * 0.25);
  } else if (typeCategory && typeCategory.includes('Caldera')) {
    noFill();
    stroke(col);
    strokeWeight(size * 0.3);
    ellipse(0, 0, size * 1.5, size * 1.5);
  } else if (typeCategory && typeCategory.includes('Complex')) {
    rectMode(CENTER);
    rect(0, 0, size * 1.4, size * 1.4);
  }
  else if (typeCategory && typeCategory.includes('Cone')) {
    triangle(0, -size * 0.65, -size * 0.55, size * 0.45, size * 0.55, size * 0.45);
  } else if (typeCategory && (typeCategory.includes('Submarine') || typeCategory.includes('Hydrophonic'))) {
    noFill();
    arc(0, 0, size * 1.6, size * 1.6, 0, PI);
  } else {
    ellipse(0, 0, size * 1.4, size * 1.4);
  }
  
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateMargins();
  positionCountryFilter();
}