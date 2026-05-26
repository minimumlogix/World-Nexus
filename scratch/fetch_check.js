// scratch/fetch_check.js
import http from 'http';

http.get('http://127.0.0.1:3000/', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Content length:', data.length);
    console.log('Start of content:', data.substring(0, 200));
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
