import {DateTime} from 'luxon';
import {collection,contacts,db,list,withLock,audit} from './store.js';
import {eligible,matches,merge,clean,escape,hash,tokenFor,quietAt,nextMorning,retryAction,ics} from './core.js';
export async function payload(campaign,c){
 const unsub=`${process.env.PUBLIC_API_URL}/u/${tokenFor(c.id,process.env.UNSUBSCRIBE_SECRET)}`;
 const values={...campaign.variables,first_name:c.firstName||'friend',email:c.email,logo_url:`${process.env.PUBLIC_APP_URL}/assets/zicounsels-logo.png`,preferences_url:`${process.env.PUBLIC_APP_URL}/preferences.html#${tokenFor(c.id,process.env.UNSUBSCRIBE_SECRET)}`,unsubscribe_url:unsub};
 const subject=merge(campaign.subject,values).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 const html=clean(merge(campaign.html,values))+`<div style="font:12px Arial;color:#667085;text-align:center;padding:24px">Zicounsels · ${escape(process.env.POSTAL_ADDRESS)}<br><a href="${unsub}">Unsubscribe</a> · <a href="${values.preferences_url}">Email preferences</a></div>`;
 const result={from:process.env.FROM_EMAIL,to:[c.email],reply_to:process.env.REPLY_TO,subject,html,text:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()+`\nUnsubscribe: ${unsub}`,headers:{'List-Unsubscribe':`<${unsub}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
 if(campaign.event)result.attachments=[{filename:'zicounsels-event.ics',content:Buffer.from(ics(campaign.event)).toString('base64')}];
 return result;
}
export async function inspectCampaign(camp){const cs=await contacts(),sup=new Set((await list('suppressions',10000)).map(s=>s.id));const audience=cs.filter(c=>matches(c,camp.filter)&&eligible(c,camp.kind,sup.has(c.id)));if(!audience.length)throw Error('No eligible contacts match this audience.');for(const c of audience)await payload(camp,c);return audience;}
export async function enqueue(camp){const audience=camp.recipientIds?camp.recipientIds.map(id=>({id})):await inspectCampaign(camp);const cursor=camp.queueCursor||0;const chunk=audience.slice(cursor,cursor+100);for(const c of chunk){const id=hash(`${camp.id}:${c.id}`);await collection('jobs').doc(id).create({campaignId:camp.id,contactId:c.id,state:'pending',due:camp.sendAt,attempts:0,createdAt:Date.now()}).catch(e=>{if(e.code!==6)throw e;});}await collection('campaigns').doc(camp.id).update({status:cursor+chunk.length>=audience.length?'scheduled':'queuing',queueCursor:cursor+chunk.length,recipientCount:audience.length});}
export async function sendProvider(body,key){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok){const e=Error(`Provider ${r.status}: ${data.message||'request failed'}`);e.retry=r.status===429||r.status>=500;throw e;}return data.id;}
async function claim(ref){return db.runTransaction(async t=>{const s=await t.get(ref),j=s.data(),now=Date.now();if(!j||!['pending','sending'].includes(j.state)||j.due>now||(j.state==='sending'&&j.lease>now))return null;if(j.firstAttempt&&retryAction(j.firstAttempt,now)==='review'){t.update(ref,{state:'review',error:'Delivery outcome uncertain beyond safe retry window. Check provider before creating another send.'});return null;}t.update(ref,{state:'sending',lease:now+120000,attempts:j.attempts+1});return {...j,id:ref.id};});}
export async function processJob(doc,cs){const j=await claim(doc.ref);if(!j)return;try{const camp=(await collection('campaigns').doc(j.campaignId).get()).data();if(!camp||camp.status!=='scheduled'){await doc.ref.update({state:!camp||camp.status==='cancelled'?'cancelled':'pending',due:Date.now()+60000});return;}if(camp.automationId){const flow=(await collection('automations').doc(camp.automationId).get()).data();if(!flow?.enabled){await doc.ref.update({state:'pending',due:Date.now()+300000});return;}}const c=cs.find(x=>x.id===j.contactId);const suppression=await collection('suppressions').doc(j.contactId).get();if(!c||!eligible(c,camp.kind,suppression.exists)||!matches(c,camp.filter)){await doc.ref.update({state:'suppressed'});return;}
 if(quietAt(Date.now())){await doc.ref.update({state:'pending',due:nextMorning(Date.now())});return;}
 // Non-event marketing is limited to two accepted messages in a rolling seven-day window.
 if(camp.kind==='marketing'&&!camp.eventExempt){const recent=await collection('jobs').where('contactId','==',c.id).get();const count=recent.docs.filter(x=>x.id!==j.id&&x.data().kind==='marketing'&&x.data().sentAt>Date.now()-7*86400000).length;if(count>=2){await doc.ref.update({state:'pending',due:Date.now()+86400000});return;}}
 let body=j.payload;if(!body){try{body=await payload(camp,c);}catch(e){e.retry=false;throw e;}}if(!j.payload)await doc.ref.update({payload:body,firstAttempt:Date.now()});
 const providerId=await sendProvider(body,j.id);await doc.ref.update({state:'accepted',providerId,sentAt:Date.now(),kind:camp.kind,error:''});
 }catch(e){await doc.ref.update({state:e.retry===false?'failed':'pending',due:Date.now()+Math.min(3600000,60000*2**Math.min(j.attempts,6)),error:String(e.message).slice(0,500)});}}
export async function tick(){return withLock('scheduler',async()=>{const started=Date.now();if(process.env.SEND_ENABLED!=='true')return {disabled:true};await runAutomations();const waiting=await collection('campaigns').where('status','==','queuing').limit(20).get();const campaigns=waiting.docs.map(d=>({id:d.id,...d.data()}));for(const c of campaigns){if(Date.now()-started>70000)break;try{await enqueue(c);}catch(e){await collection('campaigns').doc(c.id).update({status:'blocked',error:e.message});}}
 const cs=await contacts();const jobs=await collection('jobs').where('due','<=',Date.now()).orderBy('due').limit(200).get();let processed=0;for(const d of jobs.docs){if(Date.now()-started>190000)break;if(!['pending','sending'].includes(d.data().state))continue;await processJob(d,cs);processed++;await new Promise(r=>setTimeout(r,600));}
 // Remove due from terminal jobs so they cannot starve later queue pages.
 const terminal=await collection('jobs').where('due','<=',Date.now()).orderBy('due').limit(200).get();for(const d of terminal.docs)if(!['pending','sending'].includes(d.data().state))await d.ref.update({due:8640000000000000});
 await collection('system').doc('worker').set({lastRun:Date.now(),processed});return {processed};},240000);}
export const recipes={welcome:[['welcome-1',0],['welcome-2',2],['welcome-3',4],['welcome-4',7],['welcome-5',10]],webinar:[['invite',-14],['proof',-7],['reminder-3',-3],['logistics',-1],['three-hours',-0.125],['live',-15/1440],['replay',1],['conversion',3],['missed',3],['feedback',7]],volunteer:[['application',0],['info-session',2]],postsession:[['session-thanks',1],['session-check',7],['session-check',30]],course:[['course-reminder',0],['course-reminder',7],['course-reminder',14]],birthday:[['birthday',0]],anniversary:[['anniversary',0]],reengage:[['reengage',0]]};
async function runAutomations(){
 const start=Date.now(),flows=(await list('automations')).filter(a=>a.enabled&&['welcome','birthday','anniversary','reengage'].includes(a.recipe));if(!flows.length)return;
 const cs=await contacts(),today=DateTime.now().setZone('Africa/Lagos'),now=Date.now();
 for(const a of flows){
  const candidates=cs.filter(c=>matches(c,a.filter)).sort((x,y)=>x.id.localeCompare(y.id));
  const remaining=candidates.filter(c=>c.id>(a.cursor||''));let handled=0,last=a.cursor||'';
  for(const c of remaining){if(handled>=25||Date.now()-start>30000)break;handled++;last=c.id;let anchor,cycle;
   if(['birthday','anniversary'].includes(a.recipe)){if(c[a.recipe]!==today.toFormat('MM-dd'))continue;anchor=today.startOf('day').plus({hours:9}).toMillis();cycle=today.year;}
   else if(a.recipe==='reengage'){const seen=(await collection('engagement').doc(c.id).get()).data()?.at||Date.parse(c.lastEngagedAt||c.createdAt);if(!Number.isFinite(seen)||now-seen<90*86400000)continue;anchor=now;cycle=seen;}
   else {anchor=Date.parse(c.createdAt);if(!Number.isFinite(anchor)||anchor<a.enabledAt)continue;cycle=anchor;}
   await materializeSteps(a,c,anchor,String(cycle));
  }
  await collection('automations').doc(a.id).update({cursor:handled===remaining.length?'':last});
  if(Date.now()-start>30000)break;
 }
}
export async function materializeSteps(a,c,anchor,cycle){for(let i=0;i<a.steps.length;i++){const step=a.steps[i];const id=hash(`${a.id}:${c.id}:${cycle}:${i}`);const filter={contactIds:[c.id]};if(a.recipe==='webinar'){const tag=i>=6?(step.templateId==='missed'?`no-show:${a.eventKey}`:`attended:${a.eventKey}`):i>=3?`registered:${a.eventKey}`:null;if(tag)filter.tag=tag;}
 const campaign={id,name:`${a.name} · ${step.name}`,kind:a.kind,subject:step.subject,html:step.html,variables:a.variables,filter,sendAt:anchor+step.days*86400000,status:'scheduled',automationId:a.id,createdAt:Date.now(),approvedBy:a.approvedBy,eventExempt:a.recipe==='webinar'};if(step.templateId==='logistics'&&a.event)campaign.event=a.event;
 // Past webinar steps are deliberately skipped when enrolling late.
 if(a.recipe==='webinar'&&campaign.sendAt<Date.now())continue;
 await collection('campaigns').doc(id).create(campaign).catch(e=>{if(e.code!==6)throw e;});const jid=hash(`${id}:${c.id}`);await collection('jobs').doc(jid).create({campaignId:id,contactId:c.id,state:'pending',due:campaign.sendAt,attempts:0,createdAt:Date.now()}).catch(e=>{if(e.code!==6)throw e;});}}
