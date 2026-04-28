import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    // console.log(message);
  });

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.round(progress * 100));
  });

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Compression settings: 720p, 1.5-2.5Mbps, AAC audio
  // -vf "scale=-2:720" ensures height is 720 and width is proportional (even number)
  // -b:v 2000k sets bitrate to 2Mbps
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', 'scale=-2:720',
    '-b:v', '2000k',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName
  ]);

  const data = await ffmpeg.readFile(outputName);
  return new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
}

export function validateAuditionVideo(file: File): Promise<{ valid: boolean, error?: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      
      const duration = Math.round(video.duration);

      if (duration > 60) {
        resolve({ valid: false, error: `Maximum length is 60s. Your video is ${duration}s.` });
      } else {
        resolve({ valid: true });
      }
    };
    video.onerror = () => resolve({ valid: false, error: 'Invalid video file.' });
    video.src = URL.createObjectURL(file);
  });
}
