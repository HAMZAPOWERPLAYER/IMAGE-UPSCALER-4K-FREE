/**
 * Built-in sample images for instant 1-click testing.
 * Generates realistic test images directly into File objects without any external downloads.
 */

export interface SampleImageDef {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  badge: string;
  generate: () => Promise<File>;
}

export async function createSamplePortrait(): Promise<File> {
  const width = 400;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Warm studio background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#2D231B');
  bg.addColorStop(0.5, '#4A3728');
  bg.addColorStop(1, '#1A140F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Soft background rim glow
  const rimGlow = ctx.createRadialGradient(280, 160, 20, 280, 160, 260);
  rimGlow.addColorStop(0, 'rgba(232, 163, 61, 0.25)');
  rimGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rimGlow;
  ctx.fillRect(0, 0, width, height);

  // Silhouette shoulders and neck
  ctx.fillStyle = '#140E0A';
  ctx.beginPath();
  ctx.moveTo(80, 480);
  ctx.bezierCurveTo(90, 390, 140, 370, 180, 360);
  ctx.lineTo(220, 360);
  ctx.bezierCurveTo(260, 370, 310, 390, 320, 480);
  ctx.closePath();
  ctx.fill();

  // Neck
  ctx.fillStyle = '#C8946E';
  ctx.beginPath();
  ctx.moveTo(180, 360);
  ctx.lineTo(180, 270);
  ctx.lineTo(220, 270);
  ctx.lineTo(220, 360);
  ctx.closePath();
  ctx.fill();

  // Face oval
  const faceGrad = ctx.createLinearGradient(160, 120, 240, 280);
  faceGrad.addColorStop(0, '#E4B28C');
  faceGrad.addColorStop(0.6, '#D19A74');
  faceGrad.addColorStop(1, '#A8714F');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(200, 210, 68, 88, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair style
  ctx.fillStyle = '#2C1D14';
  ctx.beginPath();
  ctx.arc(200, 175, 78, Math.PI * 0.9, Math.PI * 2.1);
  ctx.bezierCurveTo(280, 190, 270, 260, 250, 290);
  ctx.bezierCurveTo(220, 220, 180, 220, 150, 290);
  ctx.bezierCurveTo(130, 260, 120, 190, 200, 175);
  ctx.fill();

  // Eyes with fine pupil and highlights
  const drawEye = (cx: number, cy: number) => {
    // Sclera
    ctx.fillStyle = '#F4EBE2';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    ctx.fillStyle = '#4E3524';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#0F0B08';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Eyelash line
    ctx.strokeStyle = '#26180E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  };
  drawEye(175, 205);
  drawEye(225, 205);

  // Eyebrows with texture strokes
  ctx.strokeStyle = '#322013';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(160 + i * 2.5, 192);
    ctx.lineTo(162 + i * 2.5, 188);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(212 + i * 2.5, 188);
    ctx.lineTo(214 + i * 2.5, 192);
    ctx.stroke();
  }

  // Nose contour
  ctx.strokeStyle = '#A36E4D';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 205);
  ctx.lineTo(197, 235);
  ctx.lineTo(205, 237);
  ctx.stroke();

  // Lips
  ctx.fillStyle = '#B45749';
  ctx.beginPath();
  ctx.ellipse(200, 258, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#702D24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(184, 258);
  ctx.lineTo(216, 258);
  ctx.stroke();

  // Film grain & texture simulation
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Overlay label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = 'rgba(247, 243, 238, 0.75)';
  ctx.fillText('SAMPLE: PORTRAIT (400×480)', 16, 460);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.82));
  return new File([blob], 'sample_portrait_400x480.jpg', { type: 'image/jpeg' });
}

export async function createSampleArchitecture(): Promise<File> {
  const width = 480;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dramatic sky
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0F1A24');
  sky.addColorStop(0.6, '#283B4A');
  sky.addColorStop(1, '#614B3E');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Background skyscraper silhouettes
  ctx.fillStyle = '#1A232B';
  ctx.fillRect(40, 90, 80, 230);
  ctx.fillRect(340, 70, 90, 250);
  ctx.fillRect(140, 130, 60, 190);

  // Main glass modern tower (center)
  const towerLeft = 190;
  const towerWidth = 140;
  const towerTop = 40;

  // Tower body
  const glass = ctx.createLinearGradient(towerLeft, 0, towerLeft + towerWidth, 0);
  glass.addColorStop(0, '#365369');
  glass.addColorStop(0.5, '#567A94');
  glass.addColorStop(1, '#243A4B');
  ctx.fillStyle = glass;
  ctx.fillRect(towerLeft, towerTop, towerWidth, height - towerTop);

  // Crisp architectural grid windows
  const cols = 7;
  const rows = 14;
  const colW = (towerWidth - 16) / cols;
  const rowH = (height - towerTop - 20) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = towerLeft + 8 + c * colW;
      const wy = towerTop + 10 + r * rowH;
      const isLit = (r + c * 3) % 4 === 0 || (r * c) % 5 === 0;

      ctx.fillStyle = isLit ? '#FFE9A0' : '#14202A';
      ctx.fillRect(wx, wy, colW - 3, rowH - 4);

      if (isLit) {
        ctx.fillStyle = 'rgba(255, 233, 160, 0.15)';
        ctx.fillRect(wx - 2, wy - 2, colW + 1, rowH);
      }
    }
  }

  // Antenna / Spire on top
  ctx.strokeStyle = '#D1DCE5';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(towerLeft + towerWidth / 2, towerTop);
  ctx.lineTo(towerLeft + towerWidth / 2, towerTop - 32);
  ctx.stroke();

  // Spire red beacon light
  ctx.fillStyle = '#FF3B30';
  ctx.beginPath();
  ctx.arc(towerLeft + towerWidth / 2, towerTop - 32, 3, 0, Math.PI * 2);
  ctx.fill();

  // Street level glow
  const streetGlow = ctx.createLinearGradient(0, height - 30, 0, height);
  streetGlow.addColorStop(0, 'rgba(232, 163, 61, 0)');
  streetGlow.addColorStop(1, 'rgba(232, 163, 61, 0.4)');
  ctx.fillStyle = streetGlow;
  ctx.fillRect(0, height - 30, width, 30);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = 'rgba(247, 243, 238, 0.75)';
  ctx.fillText('SAMPLE: ARCHITECTURE (480×320)', 16, height - 16);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  return new File([blob], 'sample_architecture_480x320.png', { type: 'image/png' });
}

export async function createSampleSynthwave(): Promise<File> {
  const width = 360;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Retro dark purple space background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#0D0221');
  bg.addColorStop(0.55, '#241734');
  bg.addColorStop(0.56, '#0B0813');
  bg.addColorStop(1, '#05030A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Glowing 80s Sun
  const sunY = 195;
  const sunR = 75;
  const sunGrad = ctx.createLinearGradient(width / 2, sunY - sunR, width / 2, sunY + sunR);
  sunGrad.addColorStop(0, '#FFE600');
  sunGrad.addColorStop(0.6, '#FF007F');
  sunGrad.addColorStop(1, '#7928CA');

  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(width / 2, sunY, sunR, Math.PI, 0, false);
  ctx.fill();

  // Horizontal blind cutouts across the sun
  ctx.fillStyle = '#241734';
  const cuts = [150, 162, 172, 180, 186, 191];
  cuts.forEach((y, idx) => {
    ctx.fillRect(width / 2 - sunR - 10, y, (sunR + 10) * 2, 2 + idx * 0.75);
  });

  // Perspective 3D Neon Floor Grid
  const horizon = 200;
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1.5;

  // Horizontal grid lines with increasing spacing
  for (let y = horizon; y < height; y += (y - horizon + 4) * 0.35) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Radial grid lines converging to center horizon
  for (let x = -width; x < width * 2; x += 32) {
    ctx.beginPath();
    ctx.moveTo(width / 2, horizon);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Mountain silhouettes in front of sun
  ctx.fillStyle = '#10081C';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(60, 160);
  ctx.lineTo(120, horizon);
  ctx.lineTo(190, 145);
  ctx.lineTo(240, horizon);
  ctx.lineTo(310, 155);
  ctx.lineTo(width, horizon);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Vector Typography badge
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00F0FF';
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 12;
  ctx.fillText('UPSCALE', width / 2, 85);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('SAMPLE: VECTOR ART (360×360)', width / 2, 345);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  return new File([blob], 'sample_synthwave_360x360.png', { type: 'image/png' });
}

export const SAMPLE_IMAGES: SampleImageDef[] = [
  {
    id: 'sample-portrait',
    name: 'Vintage Portrait',
    category: 'Photographic',
    description: '400×480 • Facial features, subtle gradients & skin micro-texture',
    width: 400,
    height: 480,
    badge: 'Photo',
    generate: createSamplePortrait,
  },
  {
    id: 'sample-architecture',
    name: 'Modern Tower',
    category: 'Architecture',
    description: '480×320 • Repetitive window grid & sharp structural edges',
    width: 480,
    height: 320,
    badge: 'Detail',
    generate: createSampleArchitecture,
  },
  {
    id: 'sample-synthwave',
    name: 'Synthwave Art',
    category: 'Vector & Graphic',
    description: '360×360 • Neon contrast lines & typography',
    width: 360,
    height: 360,
    badge: 'Vector',
    generate: createSampleSynthwave,
  },
];
