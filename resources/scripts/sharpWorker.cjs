const path = require('node:path');
const fs = require('node:fs/promises');

let sharp;
try {
  sharp = require('sharp');
} catch (err1) {
  try {
    const unpacked = path.resolve(__dirname, '../../app.asar.unpacked/node_modules/sharp');
    sharp = require(unpacked);
  } catch (err2) {
    try {
      const parentUnpacked = path.resolve(__dirname, '../../../app.asar.unpacked/node_modules/sharp');
      sharp = require(parentUnpacked);
    } catch (err3) {
      throw new Error(`Failed to load sharp module: ${err1.message}; ${err2.message}; ${err3.message}`);
    }
  }
}

async function run() {
  const rawArg = process.argv[2];
  if (!rawArg) {
    throw new Error('No options argument provided to sharpWorker');
  }

  const options = JSON.parse(rawArg);
  const task = options.task || 'packOrm';
  const { outputPath, quality = 82 } = options;

  if (!outputPath) {
    throw new Error('No outputPath specified');
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const isPng = outputPath.toLowerCase().endsWith('.png');
  const isJpg = outputPath.toLowerCase().endsWith('.jpg') || outputPath.toLowerCase().endsWith('.jpeg');

  if (task === 'packOrm') {
    const {
      aoPath,
      roughnessPath,
      metalnessPath,
      metalRoughnessPath,
      resolution = 2048
    } = options;

    if (!aoPath) {
      throw new Error('aoPath is required for packOrm');
    }

    const aoBuffer = await sharp(aoPath)
      .resize(resolution, resolution, { fit: 'fill' })
      .extractChannel('red')
      .raw()
      .toBuffer();

    let roughBuffer;
    let metalBuffer;

    if (metalRoughnessPath) {
      roughBuffer = await sharp(metalRoughnessPath)
        .resize(resolution, resolution, { fit: 'fill' })
        .extractChannel('green')
        .raw()
        .toBuffer();

      metalBuffer = await sharp(metalRoughnessPath)
        .resize(resolution, resolution, { fit: 'fill' })
        .extractChannel('blue')
        .raw()
        .toBuffer();
    } else {
      if (roughnessPath) {
        roughBuffer = await sharp(roughnessPath)
          .resize(resolution, resolution, { fit: 'fill' })
          .extractChannel('red')
          .raw()
          .toBuffer();
      } else {
        roughBuffer = Buffer.alloc(resolution * resolution, 128);
      }

      if (metalnessPath) {
        metalBuffer = await sharp(metalnessPath)
          .resize(resolution, resolution, { fit: 'fill' })
          .extractChannel('red')
          .raw()
          .toBuffer();
      } else {
        metalBuffer = Buffer.alloc(resolution * resolution, 0);
      }
    }

    const totalPixels = resolution * resolution;
    const ormBuffer = Buffer.alloc(totalPixels * 3);

    for (let i = 0; i < totalPixels; i++) {
      ormBuffer[i * 3 + 0] = aoBuffer[i];
      ormBuffer[i * 3 + 1] = roughBuffer[i];
      ormBuffer[i * 3 + 2] = metalBuffer[i];
    }

    const pipeline = sharp(ormBuffer, {
      raw: {
        width: resolution,
        height: resolution,
        channels: 3
      }
    });

    if (isPng) {
      await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(outputPath);
    } else {
      await pipeline.webp({
        quality,
        effort: 6,
        smartSubsample: true,
        minSize: true
      }).toFile(outputPath);
    }

    console.log(JSON.stringify({ success: true, outputPath }));
    return;
  }

  if (task === 'flipNormal') {
    // Normal map DirectX (Y-) <-> OpenGL (Y+): Invert the green channel
    const { inputPath, resolution } = options;
    if (!inputPath) throw new Error('inputPath is required for flipNormal');

    let base = sharp(inputPath);
    const meta = await base.metadata();
    const width = resolution || meta.width || 2048;
    const height = resolution || meta.height || 2048;

    const img = sharp(inputPath).resize(width, height, { fit: 'fill' });
    const r = await img.clone().extractChannel('red').raw().toBuffer();
    const g = await img.clone().extractChannel('green').raw().toBuffer();
    const b = await img.clone().extractChannel('blue').raw().toBuffer();

    const total = width * height;
    const flippedBuffer = Buffer.alloc(total * 3);
    for (let i = 0; i < total; i++) {
      flippedBuffer[i * 3 + 0] = r[i];
      flippedBuffer[i * 3 + 1] = 255 - g[i]; // Flip Green Channel (Y)
      flippedBuffer[i * 3 + 2] = b[i];
    }

    const pipeline = sharp(flippedBuffer, {
      raw: { width, height, channels: 3 }
    });

    if (isPng) {
      await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(outputPath);
    } else {
      await pipeline.webp({
        quality,
        effort: 6,
        smartSubsample: true,
        minSize: true
      }).toFile(outputPath);
    }

    console.log(JSON.stringify({ success: true, outputPath }));
    return;
  }

  if (task === 'invertRoughness') {
    // Inverts Roughness <-> Glossiness (1.0 - val)
    const { inputPath, resolution } = options;
    if (!inputPath) throw new Error('inputPath is required for invertRoughness');

    let pipeline = sharp(inputPath).negate({ alpha: false });
    if (resolution) {
      pipeline = pipeline.resize(resolution, resolution, { fit: 'fill' });
    }

    if (isPng) {
      await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(outputPath);
    } else {
      await pipeline.webp({
        quality,
        effort: 6,
        smartSubsample: true,
        minSize: true
      }).toFile(outputPath);
    }

    console.log(JSON.stringify({ success: true, outputPath }));
    return;
  }

  if (task === 'convertResize') {
    // Resizes and converts texture format with high compression efficiency & visually lossless quality
    const { inputPath, resolution } = options;
    if (!inputPath) throw new Error('inputPath is required for convertResize');

    let pipeline = sharp(inputPath).rotate();
    if (resolution) {
      pipeline = pipeline.resize(resolution, resolution, { fit: 'inside', withoutEnlargement: true });
    }

    if (isPng) {
      await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(outputPath);
    } else if (isJpg) {
      await pipeline.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
    } else {
      await pipeline.webp({
        quality,
        effort: 6,
        smartSubsample: true,
        minSize: true,
        alphaQuality: 85,
        preset: 'photo'
      }).toFile(outputPath);
    }

    console.log(JSON.stringify({ success: true, outputPath }));
    return;
  }

  throw new Error(`Unknown task: ${task}`);
}

run().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err.message || String(err) }));
  process.exit(1);
});
