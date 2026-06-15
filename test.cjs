fetch('http://localhost:3000/api/task-models').then(r => r.text()).then(console.log).catch(console.error);
