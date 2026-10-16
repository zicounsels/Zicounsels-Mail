import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import {DateTime} from 'luxon';
export const hash = s => crypto.createHash('sha256').update(s).digest('hex');
export const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const email = s => String(s||'').trim().toLowerCase();
export const validEmail = s => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s) && s.length<255;
export const clean = html => sanitizeHtml(String(html), {allowedTags:['html','head','body','title','table','tbody','thead','tr','td','th','div','span','p','br','hr','h1','h2','h3','h4','strong','b','i','em','u','ul','ol','li','a','img','blockquote'],allowedAttributes:{'*':['style','align','valign','width','height','bgcolor','role'],a:['href','title','target'],img:['src','alt','width','height']},allowedSchemes:['https','mailto'],allowProtocolRelative:false,allowedStyles:{'*':{'color':[/^#[0-9a-f]{3,8}$/i,/^[a-z]+$/i],'background-color':[/^#[0-9a-f]{3,8}$/i,/^[a-z]+$/i],'font-family':[/^[\w\s,'-]+$/],'font-size':[/^\d+(px|pt|em|%)$/],'font-weight':[/^(normal|bold|[1-9]00)$/],'line-height':[/^[\d.]+(px|em|%)?$/],'text-align':[/^(left|right|center)$/],'padding':[/^[\d\s.px%em]+$/],'margin':[/^[\d\s.px%emauto-]+$/],'width':[/^[\d.]+(px|%)$/],'max-width':[/^[\d.]+(px|%)$/],'border-radius':[/^[\d.]+px$/],'text-decoration':[/^(none|underline)$/],'border':[/^[\dpx\s#\w]+$/]}}});
export function merge(template,values){return String(template).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,key)=>{if(!Object.hasOwn(values,key)||values[key]===undefined || values[key]===null || values[key]==='')throw Error(`Missing value: ${key}`);return escape(values[key]);});}
export function tokens(s){return [...new Set([...String(s).matchAll(/{{\s*(\w+)\s*}}/g)].map(m=>m[1]))];}
export function tokenFor(id,secret){return id+'.'+crypto.createHmac('sha256',secret).update(id).digest('base64url');}
export function verifyToken(token,secret){const [id,sig]=String(token||'').split('.'); if(!id||!sig||!/^[a-f0-9]{64}$/.test(id))return null;const a=Buffer.from(tokenFor(id,secret)),b=Buffer.from(String(token));return a.length===b.length&&crypto.timingSafeEqual(a,b)?id:null;}
export function eligible(c,kind,suppressed=false){return !suppressed&&c.status==='active'&&(kind==='hr'?c.hrConsent==='yes':c.consent==='yes'&&!!c.consentAt&&!!c.consentSource&&(c.minor!=='yes'||c.parentalConsent==='yes'));}
export function matches(c,filter={}){return (!filter.tag||c.tags.split(',').map(s=>s.trim()).includes(filter.tag))&&(!filter.segment||c.segment===filter.segment)&&(!filter.contactIds?.length||filter.contactIds.includes(c.id));}
export function quietAt(ms){const d=DateTime.fromMillis(ms,{zone:'Africa/Lagos'});return d.hour>=22||d.hour<7;}
export function nextMorning(ms){return DateTime.fromMillis(ms,{zone:'Africa/Lagos'}).plus({days:DateTime.fromMillis(ms,{zone:'Africa/Lagos'}).hour>=22?1:0}).startOf('day').plus({hours:7}).toMillis();}
export function dueFor(date,zone){const d=DateTime.fromISO(date,{zone});if(!d.isValid)throw Error('Invalid date or timezone');return d.toMillis();}
export function retryAction(firstAttempt,now){return now-firstAttempt>=23*3600000?'review':'retry';}
export function ics(event){const dt=s=>DateTime.fromISO(s,{setZone:true}).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Zicounsels//Compass//EN','BEGIN:VEVENT',`UID:${hash(JSON.stringify(event))}@zicounsels`,`DTSTAMP:${dt(new Date().toISOString())}`,`DTSTART:${dt(event.start)}`,`DTEND:${dt(event.end)}`,`SUMMARY:${esc(event.title)}`,`DESCRIPTION:${esc(event.url)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');}

export function validCelebration(s){if(!s)return true;return /^\d{2}-\d{2}$/.test(s)&&DateTime.fromISO('2000-'+s).isValid;}
