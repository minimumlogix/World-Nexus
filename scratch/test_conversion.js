import { optimizeImage } from 'wasm-image-optimization';
import path from 'path';
import fs from 'fs';

const testInput = path.resolve('Worlds/arcanis/logo.avif');
const testOutput = path.resolve('scratch/logo.avif');

try {
  if (fs.existsSync(testOutput)) {
    fs.unlinkSync(testOutput);
  }
  const inputBuffer = fs.readFileSync(testInput);
  
  console.log('Optimizing image...');
  const result = await optimizeImage({
    image: inputBuffer,
    format: 'avif',
    quality: 80
  });
  
  console.log('result.data constructor name:', result.data?.constructor?.name);
  if (result.data) {
    fs.writeFileSync(testOutput, Buffer.from(result.data));
    console.log('Success! AVIF file created.');
    console.log('Input size:', inputBuffer.length, 'bytes');
    console.log('Output size:', fs.statSync(testOutput).size, 'bytes');
  } else {
    console.error('No data field in result!');
  }
} catch (err) {
  console.error('Error during conversion:', err);
}
