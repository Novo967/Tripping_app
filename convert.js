// convert.js
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

const inputFile = path.join(__dirname, 'assets/videos/trekloadd.mp4');
const outputFile = path.join(__dirname, 'assets/videos/trekload_converted.mp4');

const args = [
  '-i', inputFile,
  '-c:v', 'libx264',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-y',
  outputFile
];

execFile(ffmpegPath, args, (err, stdout, stderr) => {
  if (err) {
    console.error('שגיאה בהרצה:', err);
    return;
  }
  console.log('המרה הסתיימה בהצלחה!');
  console.log(stderr);
});
