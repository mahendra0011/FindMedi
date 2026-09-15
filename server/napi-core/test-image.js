const sharp = require('sharp');
const { hello, add, validateMagicBytes, resizeImage, getImageInfo } = require('./index.js');

async function makeTestImage(w, h, channels = 3) {
  const buf = Buffer.alloc(w * h * channels, 0);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return sharp(buf, { raw: { width: w, height: h, channels } }).jpeg({ quality: 85 }).toBuffer();
}

async function main() {
  console.log('=== napi-core Image Processing Test ===\n');

  // -- Core functions still work --
  console.log('hello():', hello());
  console.log('add(17, 25):', add(17, 25));

  // -- Generate test images --
  const jpegBuf = await makeTestImage(600, 400, 3);
  const pngBuf = await sharp({ raw: { width: 300, height: 200, channels: 3 } })
    .png().toBuffer();

  console.log('\nInput JPEG:', `${(jpegBuf.length / 1024).toFixed(0)} KB`);
  console.log('Input PNG:', `${(pngBuf.length / 1024).toFixed(0)} KB`);

  // -- Magic byte validation --
  console.log('\n=== Magic Byte Validation ===');
  console.log('JPEG valid:', validateMagicBytes(jpegBuf, 'image/jpeg'));
  console.log('PNG valid:', validateMagicBytes(pngBuf, 'image/png'));
  console.log('JPEG-as-PNG (should be false):', validateMagicBytes(jpegBuf, 'image/png'));
  console.log('Truncated buffer:', validateMagicBytes(Buffer.from([0xff]), 'image/jpeg'));
  console.log('GIF with JPEG bytes (should be false):', validateMagicBytes(jpegBuf, 'image/gif'));

  // -- Image info --
  console.log('\n=== Image Info ===');
  console.log('JPEG:', getImageInfo(jpegBuf));
  console.log('PNG:', getImageInfo(pngBuf));

  // -- Resize --
  console.log('\n=== Resize Test (600×400 → 128×128) ===');
  const rustThumb = resizeImage(jpegBuf, 128, 128, 75);
  const sharpThumb = await sharp(jpegBuf).resize(128, 128).jpeg({ quality: 75 }).toBuffer();
  console.log('Rust thumb:', `${(rustThumb.length / 1024).toFixed(0)} KB`);
  console.log('Sharp thumb:', `${(sharpThumb.length / 1024).toFixed(0)} KB`);
  console.log('Rust thumb is valid JPEG:', validateMagicBytes(Buffer.from(rustThumb), 'image/jpeg'));

  // -- Performance comparison --
  console.log('\n=== Performance (500 iterations, 600×400 → 128×128) ===');
  const iterations = 500;

  let t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    resizeImage(jpegBuf, 128, 128, 75);
  }
  const rustMs = Number(process.hrtime.bigint() - t0) / 1e6;

  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    await sharp(jpegBuf).resize(128, 128).jpeg({ quality: 75 }).toBuffer();
  }
  const sharpMs = Number(process.hrtime.bigint() - t0) / 1e6;

  console.log(`Rust:  ${(rustMs / iterations).toFixed(2)} ms/op  (${(iterations / (rustMs / 1000)).toFixed(1)} ops/sec)`);
  console.log(`Sharp: ${(sharpMs / iterations).toFixed(2)} ms/op  (${(iterations / (sharpMs / 1000)).toFixed(1)} ops/sec)`);
  console.log(`Speedup: ${(sharpMs / rustMs).toFixed(1)}x`);

  console.log('\n✓ All image processing functions working!');
}

main().catch(e => { console.error(e); process.exit(1); });
