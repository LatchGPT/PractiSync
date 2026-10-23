import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { DatabaseSync } from 'node:sqlite';

// Run only against the dedicated SQLite weekly UI server; never against shared demo records.
const base='http://localhost:3106';
const output=resolve('.local/weekly-ui-evidence');await mkdir(output,{recursive:true});
const fixture=new DatabaseSync(resolve('.local/weekly-ui.sqlite'));
fixture.exec('PRAGMA busy_timeout=5000; BEGIN; DELETE FROM weekly_report_images; DELETE FROM weekly_reports; DELETE FROM weekly_course_periods; DELETE FROM weekly_question_sets; COMMIT;');fixture.close();
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[];
const monday=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z');monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));const week=monday.toISOString().slice(0,10);
async function signIn(role){
  const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  const csrf=await(await context.request.get(base+'/api/auth/csrf')).json();
  const login=await context.request.post(base+'/api/auth/callback/credentials',{headers:{Origin:base,'X-Auth-Return-Redirect':'1','x-real-ip':'2001:db8::'+crypto.randomUUID().slice(0,4)},form:{csrfToken:csrf.csrfToken,username:'demo.'+role,password:'Demo@2026!',callbackUrl:base+'/'}});
  assert.ok(!(await login.json()).url?.includes('error='));
  const consent=await context.request.post(base+'/api/consent',{headers:{Origin:base},data:{action:'ACCEPT',language:'en'}});assert.ok(consent.ok(),await consent.text());
  return context;
}
async function action(context,body){const r=await context.request.post(base+'/api/weekly-reports',{headers:{Origin:base},data:body});assert.ok(r.ok(),await r.text());return r.json();}
async function fits(page,label){const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width+1,label+' overflows');checks.push(label);}
async function shot(page,name){await page.screenshot({path:resolve(output,name+'.png'),fullPage:true,style:'nextjs-portal{display:none}'});}
try{
  const admin=await signIn('admin');
  const labels=['Needs continuous guidance','Needs frequent guidance','Works with some guidance','Works independently','Supports others'];
  const q={id:'communication',text:'How independently did you communicate your weekly progress?',competency:'Communication',kind:'CHOICE',labels};
  const existing=await(await admin.request.get(base+'/api/weekly-reports')).json();
  if(!existing.questionSets.some(s=>s.courseId===''))await action(admin,{action:'publish',courseId:'',week,questions:[q]});
  if(!existing.questionSets.some(s=>s.courseId==='course-it'))await action(admin,{action:'publish',courseId:'course-it',week,questions:[{...q,id:'technical',text:'How independently did you apply your course’s technical skills?',competency:'Technical practice',kind:'RATING'}]});
  const student=await signIn('student'),page=await student.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dashboard/student?view=competencies');
  await page.getByRole('heading',{name:'Your week at work',exact:true}).waitFor();
  const view=await(await student.request.get(base+'/api/weekly-reports')).json();
  assert.ok(!view.reports.some(r=>r.status==='SUBMITTED'),'Use a fresh dedicated weekly-ui.sqlite file for this check.');
  await page.getByRole('button',{name:'Continue to competency check',exact:true}).click();await page.getByRole('alert').filter({hasText:'Complete every report prompt'}).waitFor();checks.push('required-prompts');
  const text=['Documented integration work and reviewed assigned tasks.','Applied programming, testing and communication skills.','Learned to document assumptions and check acceptance criteria.','Requested guidance on a deployment issue.','Complete the remaining tests and discuss results with my mentor.'];
  const editor=page.getByRole('article');
  for(let n=0;n<5;n++)await editor.locator('textarea').nth(n).fill(text[n]);
  // Simulate a failed save: input must remain intact and the retry must succeed.
  await page.route('**/api/weekly-reports',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Simulated save outage. Your draft is still on this screen.'})}):route.continue(),{times:1});
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'Simulated save outage'}).waitFor();assert.equal(await editor.locator('textarea').first().inputValue(),text[0]);checks.push('failed-save-keeps-input');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved'}).waitFor();
  const png=await sharp({create:{width:300,height:200,channels:3,background:'#124c91'}}).png().toBuffer();
  await page.locator('input[type=file]').setInputFiles({name:'fictional-work-evidence.png',mimeType:'image/png',buffer:png});await page.getByRole('status').filter({hasText:'Image uploaded'}).waitFor();checks.push('private-image-upload');
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});await fits(page,'student-'+width);await shot(page,'student-report-'+width);}
  await page.getByRole('button',{name:'Continue to competency check',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.getByRole('radio').nth(3).check();await dialog.getByRole('button',{name:'Next',exact:true}).click();await dialog.getByRole('radio').nth(2).check();
  await fits(page,'quiz-mobile');await shot(page,'question-card-390');
  await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(d=>d.contains(document.activeElement)));checks.push('modal-focus-contained');
  await dialog.getByRole('button',{name:'Save draft and close',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.reload();
  await page.getByRole('button',{name:'Continue to competency check',exact:true}).click();await dialog.waitFor();assert.ok(await dialog.getByRole('radio').nth(3).isChecked());await dialog.getByRole('button',{name:'Next',exact:true}).click();assert.ok(await dialog.getByRole('radio').nth(2).isChecked());checks.push('resume-report-and-answers');
  await dialog.getByRole('button',{name:'Submit weekly report',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByText('Your report and competency answers are recorded together.',{exact:false}).waitFor();checks.push('combined-final-submission');
  const mine=await(await student.request.get(base+'/api/weekly-reports')).json(),image=mine.reports[0].attachments[0];assert.equal((await admin.request.get(base+'/api/weekly-reports/images/'+image.id)).status(),403);checks.push('admin-cannot-open-image');
  const coordinator=await signIn('coordinator'),review=await coordinator.newPage();await review.goto(base+'/dashboard/coordinator?view=competencies');await review.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();await review.getByRole('button',{name:/Jamie Reyes/}).click();await review.getByRole('heading',{name:'Jamie Reyes',exact:true}).waitFor();await shot(review,'coordinator-review-1440');checks.push('coordinator-individual-report');
  const analytics=await admin.newPage();await analytics.goto(base+'/dashboard/admin?view=competencies');await analytics.getByRole('heading',{name:'Weekly competency analytics',exact:true}).waitFor();
  await analytics.getByText('Competency scores are hidden until at least 3 distinct students submit.',{exact:false}).first().waitFor();
  for(const width of [1440,820,390]){await analytics.setViewportSize({width,height:1000});await fits(analytics,'analytics-'+width);await shot(analytics,'analytics-'+width);}
  const aggregate=await(await admin.request.get(base+'/api/weekly-reports')).json();assert.equal(aggregate.reports.length,0);assert.equal(aggregate.placements.length,0);checks.push('admin-aggregate-only');
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile(resolve(output,'checks.json'),JSON.stringify({checks,screenshots:output},null,2));console.log(JSON.stringify({passed:checks.length,checks,screenshots:output},null,2));
  await Promise.all([student.close(),coordinator.close(),admin.close()]);
}finally{await browser.close();}
