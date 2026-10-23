import type {Role} from '../validation/contracts';

const dashboardPaths:Record<Role,string>={
 STUDENT:'/dashboard/student',
 COORDINATOR:'/dashboard/coordinator',
 SUPERVISOR:'/dashboard/hte-supervisor',
 SUPER_ADMIN:'/dashboard/admin',
};

const dashboardSegments:Record<string,Role>={
 student:'STUDENT',
 coordinator:'COORDINATOR',
 'hte-supervisor':'SUPERVISOR',
 admin:'SUPER_ADMIN',
};

const workspaceViews:Record<Role,readonly string[]>={
 STUDENT:['overview','queue','classes','attendance','documents','competencies','incidents','jobs','announcements','profile','settings'],
 COORDINATOR:['overview','queue','classes','documents','competencies','incidents','jobs','announcements','policies','profile','settings'],
 SUPERVISOR:[],
 SUPER_ADMIN:['hte-requests','overview','queue','accounts','institution','required-documents','jobs','announcements','profile','settings'],
};

export function isRole(value:unknown):value is Role{
 return typeof value==='string'&&Object.hasOwn(dashboardPaths,value);
}

export function dashboardPathForRole(role:Role):string{
 return dashboardPaths[role];
}

export function canAccessWorkspaceView(role:Role,requested:string):boolean{
 const view=requested==='directory'?'jobs':requested;
 return workspaceViews[role].includes(view);
}

export function roleForDashboardSegment(segment:string):Role|null{
 return dashboardSegments[segment]??null;
}

export function safeInternalPath(value:unknown):string|null{
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return null;
 try{
  const base='https://practisync.invalid';
  const url=new URL(value,base);
  if(url.origin!==base)return null;
  return url.pathname+url.search;
 }catch{
  return null;
 }
}

export function postLoginPath(role:Role,requested:unknown):string{
 const safe=safeInternalPath(requested);
 if(!safe)return dashboardPathForRole(role);
 const url=new URL(safe,'https://practisync.invalid');
 const requestedRole=roleForDashboardSegment(url.pathname.split('/')[2]??'');
 if(requestedRole===role&&url.pathname===dashboardPathForRole(role)){
  if(url.searchParams.getAll('view').some(view=>!canAccessWorkspaceView(role,view)))return dashboardPathForRole(role);
  return safe;
 }
 return dashboardPathForRole(role);
}

export function loginCompletionPath(returnTo:unknown):string{
 const safe=safeInternalPath(returnTo)??'/';
 return '/login/complete?redirect='+encodeURIComponent(safe);
}
