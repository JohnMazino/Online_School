(async () => {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: 'admin', password: '29090803' }) });
    const loginJson = await login.json();
    const token = loginJson.token;

    // Attempt to update settings
    const payload = { minPasswordLength: 9, enable2FA: true };
    const res = await fetch('http://localhost:5000/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    });
    console.log('status', res.status);
    console.log(await res.text());
  } catch (err) { console.error(err); }
})();