import requests, json
r = requests.post('http://localhost:5000/api/auth/login', json={'phone':'admin','password':'29090803'})
print('login', r.status_code)
print(r.text)
if r.status_code==200:
    token = r.json().get('token')
    h={'Authorization':f'Bearer {token}'}
    u = requests.get('http://localhost:5000/api/admin/users', headers=h)
    print('users', u.status_code)
    print(json.dumps(u.json(), indent=2, ensure_ascii=False))
else:
    print('login failed')
