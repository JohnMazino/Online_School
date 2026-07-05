(async () => {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: 'admin', password: '29090803' }) });
    const loginJson = await login.json();
    console.log('login status', login.status);
    if (!loginJson.token) {
      console.log('login response', loginJson);
      return;
    }
    const token = loginJson.token;
    const users = await fetch('http://localhost:5000/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
    console.log('users status', users.status);
    console.log(await users.json());

    const stats = await fetch('http://localhost:5000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
    console.log('stats status', stats.status);
    const sjson = await stats.json();
    console.log(JSON.stringify(sjson, null, 2));

    // Get current settings
    const sets = await fetch('http://localhost:5000/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
    console.log('settings status', sets.status);
    console.log(await sets.json());

    // Update settings (minPasswordLength -> 10)
    const update = await fetch('http://localhost:5000/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ minPasswordLength: 10 }) });
    console.log('update settings status', update.status);
    console.log(await update.json());

    // Test export xlsx
    const xlsx = await fetch('http://localhost:5000/api/admin/export?format=xlsx', { headers: { 'Authorization': `Bearer ${token}` } });
    console.log('xlsx status', xlsx.status, 'content-type', xlsx.headers.get('content-type'));

  } catch (err) { console.error(err); }
})();