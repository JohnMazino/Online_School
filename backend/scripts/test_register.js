const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+7 (912) 111-22-33', password: '123', firstName: 'Short', lastName: 'Pass' }) });
    console.log('status', res.status);
    console.log(await res.text());
  } catch (err) { console.error(err); }
})();