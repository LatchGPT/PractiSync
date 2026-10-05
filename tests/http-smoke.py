"""HTTP checks against the supervised local preview; no real identities."""
import json,urllib.request,urllib.parse,http.cookiejar,os
base=os.environ.get('PRACTISYNC_BASE_URL','http://localhost:4173')
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def request(opener,path,data=None,form=False):
 headers={'Origin':base}
 if data is not None:
  headers['Content-Type']='application/x-www-form-urlencoded' if form else 'application/json'
  data=urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()
 if form:headers['X-Auth-Return-Redirect']='1'
 req=urllib.request.Request(base+path,data=data,headers=headers)
 try:
  with opener.open(req) as response:return response.status,json.loads(response.read())
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
def login(role=None,password=None):
 op=client();status,csrf=request(op,'/api/auth/csrf');assert status==200,(status,csrf)
 values={'csrfToken':csrf['csrfToken'],'callbackUrl':base+'/'}
 if role:values['demoId']='demo-'+role
 else:values.update(username='demo.student',password=password)
 status,result=request(op,'/api/auth/callback/credentials',values,True);assert status==200 and 'error=' not in result.get('url',''),(status,result)
 return op
status,config=request(client(),'/api/config');assert config['demo'] and config['authConfigured'],config
assert request(client(),'/api/data')[0]==401
for role in ['student','coordinator','supervisor','admin']:
 op=login(role);status,data=request(op,'/api/data');assert status==200,(role,status,data)
 expected={'student':'STUDENT','coordinator':'COORDINATOR','supervisor':'SUPERVISOR','admin':'SUPER_ADMIN'}[role]
 assert data['user']['role']==expected,(role,data)
 assert 'passwordHash' not in data['user'],'Sensitive password hash leaked'
 if role in ['supervisor','admin']:assert not data['incidents']
 if role=='student':
  assert len(data['placements'])==1
  assert request(op,'/api/action',{'action':'dtr','values':{'placementId':'placement-2','date':'2026-10-02','startsAt':'2026-10-02T08:00','endsAt':'2026-10-02T17:00','breakMinutes':60,'narrative':'Scope negative HTTP test'}})[0]==403
 with op.open(base+'/') as response: html=response.read().decode()
 assert f'{role}-dashboard' in html,(role,'dashboard missing')
 print(role+': authenticated, scoped data checks passed')
op=login(password='Demo@2026!');assert request(op,'/api/data')[0]==200
print('Username/password form flow passed')
admin=login('admin');student=login('student')
status,result=request(admin,'/api/action',{'action':'featureSetting','values':{'role':'STUDENT','module':'attendance','enabled':False}})
assert status==200,(status,result)
try:
 status,scoped=request(student,'/api/data');assert status==200 and scoped['features']['attendance'] is False and scoped['entries']==[],(status,scoped)
 status,denied=request(student,'/api/action',{'action':'dtr','values':{'placementId':'placement-1','date':'2026-10-02','startsAt':'2026-10-02T08:00','endsAt':'2026-10-02T17:00','breakMinutes':60,'narrative':'Should be denied'}})
 assert status==403 and 'disabled' in denied['error'],(status,denied)
finally:
 status,result=request(admin,'/api/action',{'action':'featureSetting','values':{'role':'STUDENT','module':'attendance','enabled':True}})
 assert status==200,(status,result)
print('Admin module toggle and action denial passed')
csrf=request(op,'/api/auth/csrf')[1]['csrfToken'];request(op,'/api/auth/signout',{'csrfToken':csrf,'callbackUrl':base+'/'},True)
assert request(op,'/api/data')[0]==401
print('Sign-out and anonymous denial passed')
