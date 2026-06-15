fetch('http://localhost:3000/api/task-models').then(r => {
  console.log('Status:', r.status);
  console.log('Content-Type:', r.headers.get('content-type'));
  return r.text();
}).then(console.log).catch(console.error);