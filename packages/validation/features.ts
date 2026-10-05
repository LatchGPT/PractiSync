export const modules=['classes','attendance','documents','competencies','incidents','jobs','announcements','directory','portfolio','policies'] as const;
export type Module=typeof modules[number];
export const configurableRoles=['STUDENT','COORDINATOR','SUPERVISOR'] as const;
export const moduleLabels:Record<Module,string>={classes:'Classes',attendance:'Attendance & DTR',documents:'Document clearance',competencies:'Competencies',incidents:'Support & SOS',jobs:'Internship board',announcements:'Announcements',directory:'Company directory',portfolio:'Portfolios',policies:'Course policies'};
