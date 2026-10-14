export type FormValues=Record<string,string>;
export const demoAccounts=[{id:'demo-student',role:'STUDENT',name:'Jamie Reyes',title:'Student',description:'Track hours, build your portfolio, and find your next opportunity.',username:'demo.student'},{id:'demo-coordinator',role:'COORDINATOR',name:'Andrea Santos',title:'Coordinator',description:'Manage classes, review documents, and support your students.',username:'demo.coordinator'},{id:'demo-admin',role:'SUPER_ADMIN',name:'Alex Navarro',title:'Super Admin',description:'Manage accounts, departments, and university settings.',username:'demo.admin'},{id:'demo-supervisor',role:'SUPERVISOR',name:'Morgan Lee',title:'HTE Supervisor',description:'Review applicants and confirm assigned training progress.',username:'demo.supervisor'}] as const;
export const quickDemoAccounts=demoAccounts;
export function sampleFor(action:string,context:Record<string,string>):FormValues{
 const date='2026-10-02';
 const common={placementId:context.placementId??'',courseId:context.courseId??'course-it',classId:context.classId??'',jobId:context.jobId??'',companyId:context.companyId??'company-northstar'};
 const fixtures:Record<string,FormValues>={
 dtr:{...common,date,startsAt:'08:00',endsAt:'17:00',breakMinutes:'60',narrative:'Sample: Implemented form validation for the intern dashboard, wrote test cases, and reviewed feedback with my coordinator.'},
 class:{name:'OJT Practicum',section:'BSIT 4-C',courseId:common.courseId},
 incident:{...common,subject:'Sample: Request for coordinator guidance',narrative:'Fictional scenario: My assigned tasks have shifted away from my training plan. I would like help discussing this with my class coordinator.'},
 job:{companyId:common.companyId,title:'Frontend Development Intern',description:'Sample: Work with our product team on accessible interfaces, component testing, and design implementation. Mentorship and a structured training plan are included.',location:'Mandaluyong · Hybrid',courseId:common.courseId,skills:'React, TypeScript, CSS',openings:'3'},
 application:{jobId:common.jobId,coverLetter:'Sample: I am an IT student interested in accessible frontend development. My coursework includes React, database design, and collaborative projects. I would welcome the opportunity to learn with your team.'},
 announcement:{title:'Weekly check-in: October 9',body:'Sample: Bring your latest narrative and any questions to our Friday class check-in. Please review your document status before the session.',classId:common.classId},
 evaluation:{...common,kind:context.kind??'WEEKLY',date,technical:'4',communication:'4',professionalism:'5',problemSolving:'3'},
 review:{...common,rating:'4',body:'Sample: The team provided useful mentoring and regular feedback. A clearer onboarding checklist would make the first week easier.'},
 profile:{name:'Jamie Reyes'},
 };
 return {...(fixtures[action]??{})};
}
