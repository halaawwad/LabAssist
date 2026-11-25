import http from 'k6/http';
import {check,sleep} from 'k6';
import {SharedArray} from 'k6/data';
import {Trend} from 'k6/metrics';
const users=new SharedArray('disposable auth users',()=>JSON.parse(open(__ENV.AUTH_USERS_FILE)));
const base=__ENV.API_URL||'http://127.0.0.1:3100/v1';
const loginTime=new Trend('login_duration',true);
export const options={scenarios:{concurrent_login:{executor:'per-vu-iterations',vus:users.length,iterations:1,maxDuration:'2m'}},thresholds:{http_req_failed:['rate==0'],checks:['rate==1'],login_duration:['p(95)<2000']}};
export default function(){
 const user=users[__VU-1];const login=http.post(base+'/auth/login',JSON.stringify(user),{headers:{'Content-Type':'application/json'},tags:{name:'login'}});loginTime.add(login.timings.duration);
 if(!check(login,{'login accepted':r=>r.status===201}))return;
 const session=login.json();sleep(0.2);
 const me=http.get(base+'/auth/me',{headers:{Authorization:'Bearer '+session.accessToken},tags:{name:'me'}});
 check(me,{'correct role and own account':r=>r.status===200&&r.json('id')===session.account.id&&r.json('role')===user.role});
 const refresh=http.post(base+'/auth/refresh',JSON.stringify({refreshToken:session.refreshToken}),{headers:{'Content-Type':'application/json'},tags:{name:'refresh'}});
 if(!check(refresh,{'session rotated':r=>r.status===201&&r.json('refreshToken')!==session.refreshToken}))return;
 const logout=http.post(base+'/auth/logout','{}',{headers:{'Content-Type':'application/json',Authorization:'Bearer '+refresh.json('accessToken')},tags:{name:'logout'}});
 check(logout,{'logout accepted':r=>r.status===201&&r.json('ok')===true});
}
