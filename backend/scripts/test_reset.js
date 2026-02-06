(async () => {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: 'admin', password: '29090803' }) });
    const loginJson = await login.json();
    const token = loginJson.token;
    const res = await fetch('http://localhost:5000/api/admin/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ userId: 4 }) });
    console.log('status', res.status);
    console.log(await res.json());
  } catch (err) { console.error(err); }
})();