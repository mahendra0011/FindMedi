/* FindMedi Promo Film engine — 60s, 30fps timeline */
const FPS=30, $=s=>document.querySelector(s);
const SCENES=[
{i:1,t0:0,t1:2.6,cap:"Meet FindMedi — healthcare booking, reimagined.",pop:["FindMedi"]},
{i:2,t0:2.6,t1:5.2,cap:"No more queues. No more waiting.",pop:["queues","waiting"]},
{i:3,t0:5.2,t1:7.8,cap:"2M+ patients • 5K+ doctors • 120+ cities",pop:["2M+","5K+"]},
{i:4,t0:7.8,t1:11,cap:"Step 1 — Choose your specialty",pop:["specialty"]},
{i:5,t0:11,t1:13.8,cap:"Step 2 — Pick your verified doctor",pop:["verified"]},
{i:6,t0:13.8,t1:18,cap:"Step 3 — Date, time & visit mode",pop:["live"]},
{i:7,t0:18,t1:21,cap:"Step 4 — Confirm in one tap",pop:["one tap"]},
{i:8,t0:21,t1:24.5,cap:"Instant confirmation + smart reminders",pop:["Instant"]},
{i:9,t0:24.5,t1:27,cap:"Live tracking: Requested → Confirmed → Completed",pop:["Live"]},
{i:10,t0:27,t1:28.6,cap:"Everything built-in. Nothing to worry about.",pop:["built-in"]},
{i:11,t0:28.6,t1:30,cap:"FindMedi — Book care in seconds.",pop:["seconds"]},
];
const SPECS=[["❤","Cardiology"],["🧴","Dermatology"],["🧒","Pediatrics"],["🦴","Ortho"],["👂","ENT"],["🤰","Gynae"],["🩺","General"],["🧠","Mental"]];
const DOCS=[{n:"Dr. Ananya Sharma",s:"Cardiologist • 12 yrs",r:4.9,f:800},{n:"Dr. Rajesh Iyer",s:"Cardiologist • 9 yrs",r:4.7,f:600},{n:"Dr. Fatima Khan",s:"Cardiologist • 15 yrs",r:4.8,f:1000}];
const DATES=["Today","Tomorrow","Fri","Sat","Sun","Mon","Tue"];
const SLOTS=["09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM"];
const BOOKED=new Set(["10:00 AM","12:30 PM","02:30 PM"]);
const STATS=[["2M+","Patients",2000000,"2M+"],["5K+","Doctors",5000,"5K+"],["120+","Cities",120,"120+"],["4.8★","Rating",4.8,"4.8★"]];
const FEATS=[["⚡","Instant Confirmation"],["🔒","Slot Lock"],["🔁","1-Tap Reschedule"],["🔔","Smart Reminders"]];
let T=0,playing=true,t0=performance.now(),cur=0,raf;
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);$("#stage").style.transform=`scale(${s})`;}
function L(r){const st=$("#stage").getBoundingClientRect(),s=st.width/1920||1;return{x:(r.left-st.left)/s,y:(r.top-st.top)/s,w:r.width/s,h:r.height/s};}
addEventListener("resize",fit);
// ambient dust
(function(){const d=$("#dust");for(let k=0;k<34;k++){const p=document.createElement("i");p.className="dust";const sz=2+Math.random()*4;p.style.cssText=`left:${Math.random()*100}%;top:${60+Math.random()*50}%;width:${sz}px;height:${sz}px;animation-duration:${5+Math.random()*6}s;animation-delay:-${Math.random()*7}s;opacity:${.2+Math.random()*.5}`;d.appendChild(p);}})();
// cursor helper (Web Animations API = GPU smooth)
const cursor=$("#cursor");
function fly(x,y,dur){dur=dur||22;cursor.animate([{transform:`translate(${x}px,${y}px) scale(1)`},{transform:`translate(${x}px,${y}px) scale(.8)`},{transform:`translate(${x}px,${y}px) scale(1)`}],{duration:dur*33.33,easing:"cubic-bezier(.3,.7,.3,1)",fill:"forwards"});}
function ripple(x,y){const r=document.createElement("div");r.className="rip";r.style.left=x+"px";r.style.top=y+"px";$("#stage").appendChild(r);setTimeout(()=>r.remove(),900);pulse(x,y);}
function pulse(x,y){const p=document.createElement("div");p.className="mpulse";p.style.left=x+"px";p.style.top=y+"px";$("#stage").appendChild(p);setTimeout(()=>p.remove(),500);}
// ---- static content builders (module scope = fast) ----
(function(){const q=$("#queue");["🧑‍🦳","👩","🧑","👵","👴"].forEach(e=>{const d=document.createElement("div");d.className="q";d.textContent=e;q.appendChild(d);});
$("#mq").textContent=("Cardiology • Dermatology • Pediatrics • Orthopedics • ENT • Gynecology • General Physician • Mental Health • ").repeat(2);
const sr=$("#statRow");STATS.forEach(s=>{const d=document.createElement("div");d.className="stat";d.innerHTML=`<b data-n="${s[2]}" data-f="${s[3]}">0</b><span>${s[1]}</span>`;sr.appendChild(d);});
const st=$("#stars");for(let k=0;k<5;k++){const i=document.createElement("i");i.textContent="★";st.appendChild(i);}
const g=$("#specGrid");SPECS.forEach((s,k)=>{const d=document.createElement("div");d.className="spec";d.innerHTML=`<span class="em">${s[0]}</span>${s[1]}`;g.appendChild(d);});
const dl=$("#docList");DOCS.forEach(d=>{const el=document.createElement("div");el.className="doc";el.innerHTML=`<div class="av">👩‍⚕️</div><div><b>${d.n}<span class="vBadge">✓ Verified</span></b><small>${d.s}</small><div class="starsRow">★★★★★ ${d.r}</div></div><div class="fee">₹${d.f}</div>`;dl.appendChild(el);});
const ds=$("#dStrip");DATES.forEach(d=>{const p=document.createElement("div");p.className="dPill";p.textContent=d;ds.appendChild(p);});
const sg=$("#slotGrid");SLOTS.forEach(s=>{const p=document.createElement("div");p.className="slot"+(BOOKED.has(s)?" bk":"");p.textContent=s;sg.appendChild(p);});
const mr=$("#modeRow");["🏥 In-Clinic","📹 Video","📞 Audio","💬 Chat"].forEach(m=>{const p=document.createElement("div");p.className="mode";p.textContent=m;mr.appendChild(p);});
const fb=$("#formBox");[["Aarav Mehta",12],["+91 98••• ••210",22]].forEach(f=>{const d=document.createElement("div");d.className="fld";d.dataset.txt=f[0];d.dataset.len=f[1];fb.appendChild(d);});
const sc=$("#sumCard");["👩‍⚕️ Dr. Ananya Sharma","📅 Tomorrow • 11:30 AM","📹 Video Consult","💰 ₹800"].forEach(t=>{const d=document.createElement("div");d.textContent=t;sc.appendChild(d);});
const tn=$("#tlNodes");["Requested","Confirmed","Checked-in","Completed"].forEach(t=>{const d=document.createElement("div");d.className="tlN";d.textContent="✓ "+t;tn.appendChild(d);});
const mi=$("#miniRow");[["Routine Checkup","Pending","bA"],["Cardiology • 11:30 AM","Confirmed","bT"],["Blood Test","Completed","bE"]].forEach(m=>{const d=document.createElement("div");d.className="mini";d.innerHTML=`${m[0]}<span class="bdg ${m[2]}">${m[1]}</span>`;mi.appendChild(d);});
const fo=$("#featOrbit");FEATS.forEach(f=>{const d=document.createElement("div");d.className="feat";d.textContent=f[0]+" "+f[1];fo.appendChild(d);});
const om=$("#orbitMin");["🔔","📅","🛡️"].forEach((e,k)=>{const d=document.createElement("div");d.className="omin";d.textContent=e;d.style.left=(30+k*100)+"px";d.style.top=(100-k*30)+"px";om.appendChild(d);});
})();
// WAAPI helper
function an(el,kf,opt){try{el.getAnimations().forEach(a=>a.cancel());}catch(e){}return el.animate(kf,Object.assign({duration:500,easing:"cubic-bezier(.2,.9,.3,1.2)",fill:"forwards"},opt||{}));}
function wipe(){const w=$("#wipe .wipeBar");w.animate([{transform:"translateX(0)",opacity:1},{transform:"translateX(2140px)",opacity:1}],{duration:600,easing:"cubic-bezier(.5,0,.3,1)"});}
function streak(y,del){del=del||0;const s=document.createElement("div");s.className="streak";s.style.top=y+"px";s.style.left="0";$("#streakBox").appendChild(s);s.animate([{transform:"translateX(-500px)",opacity:0},{opacity:1,offset:.3},{transform:"translateX(2100px)",opacity:0}],{duration:700,delay:del,easing:"ease-in-out",fill:"forwards"});setTimeout(()=>s.remove(),1200+del);}
// ---- master timeline (seconds) ----
let timers=[],IVS=[];
function at(sec,fn){timers.push(setTimeout(fn,sec*1000));}
function show(i){document.querySelectorAll(".scene").forEach(s=>s.classList.remove("on"));const el=$("#s"+i);if(el)el.classList.add("on");cur=i;}
function setCap(i){const sc=SCENES[i-1];const box=$("#capWords");box.innerHTML="";sc.cap.split(" ").forEach(w=>{const s=document.createElement("span");s.className="w"+(sc.pop.some(p=>w.toLowerCase().includes(p.toLowerCase()))?" key":"");s.textContent=w;box.appendChild(s);});box.dataset.words=box.children.length;box.dataset.i=0;}
function litWords(){const box=$("#capWords");const n=+box.dataset.words||0;let k=+box.dataset.i||0;const sc=SCENES[cur-1];if(!sc)return;const span=(sc.t1-sc.t0)/Math.max(n,1);const want=Math.min(n,Math.floor((T-sc.t0)/span));while(k<want){const w=box.children[k];if(w){w.classList.add("lit");if(w.classList.contains("key")){w.classList.remove("pop");void w.offsetWidth;w.classList.add("pop");}}k++;}box.dataset.i=k;const sw=$("#capBox .capSweep");if(sw&&n)sw.style.width=(want/n*100)+"%";}
function phoneXY(n){const ph=$("#s"+n+" .phone");if(!ph)return{x:0,y:0};const l=L(ph.getBoundingClientRect());return{x:l.x+l.w/2,y:l.y+l.h/2};}
// scene actions
function A1(){$("#s1").classList.add("s1go");document.querySelectorAll("#s1 .brand span").forEach((s,k)=>{s.style.animationDelay=(0.45+k*.07)+"s";});}
function A2(){const s2=$("#s2");s2.classList.add("s2shake");$("#stage").classList.add("shakeAll");setTimeout(()=>$("#stage").classList.remove("shakeAll"),350);
document.querySelectorAll("#s2 .q").forEach((q,k)=>{an(q,[{opacity:0,transform:"translateX(-60px)"},{opacity:1,transform:"none"}],{duration:350,delay:30+k*50});});
at(3.8,()=>{s2.classList.remove("s2shake");s2.classList.add("s2heal");document.querySelectorAll("#s2 .hookB span").forEach((sp,k)=>{sp.style.animationDelay=(k*.12)+"s";});streak(300);});}
function A3(){document.querySelectorAll("#s3 .stat").forEach((el,k)=>{const from=[-500,500,-500,500][k];an(el,[{opacity:0,transform:`translateX(${from}px) scale(.8)`},{opacity:1,transform:"none"}],{duration:450,delay:k*80});
const b=el.querySelector("b"),target=+b.dataset.n,fin=b.dataset.f;const tS=performance.now();(function cnt(){const p=Math.min(1,(performance.now()-tS)/900);let v;if(target<10)v=(target*p).toFixed(1);else if(target<1000)v=Math.floor(target*p);else if(target<100000)v=(target*p/1000).toFixed(1)+"K+";else v=(target*p/1000000).toFixed(1)+"M+";b.textContent=p>=1?fin:v;if(p<1)requestAnimationFrame(cnt);})();});
document.querySelectorAll("#s3 .stars i").forEach((s,k)=>{an(s,[{opacity:0,transform:"scale(0) rotate(-90deg)"},{opacity:1,transform:"scale(1.4) rotate(0)"},{transform:"scale(1)"}],{duration:400,delay:450+k*90});});streak(250,200);}
function A4(){const sp=document.querySelectorAll("#s4 .spec");sp.forEach((el,k)=>{an(el,[{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"scale(1.08)"},{transform:"scale(1)"}],{duration:400,delay:k*55});});
at(9,()=>{const p=phoneXY(4);cursor.style.opacity=1;fly(p.x-30,p.y-160,20);
at(9.45,()=>{sp[0].classList.add("sel","fire");sp.forEach((e,j)=>{if(j!==0)e.classList.add("dim");});ripple(p.x-30,p.y-160);});});}
function A5(){const docs=document.querySelectorAll("#s5 .doc");docs.forEach((el,k)=>{an(el,[{opacity:0,transform:"translateX(140px)"},{opacity:1,transform:"none"}],{duration:450,delay:k*90});});
at(12.25,()=>{const p=phoneXY(5);cursor.style.opacity=1;fly(p.x+60,p.y+40,18);
at(12.7,()=>{const d=docs[0];d.style.borderColor="#2DD4BF";d.style.boxShadow="0 0 30px rgba(20,184,166,.6)";an(d,[{transform:"scale(1)"},{transform:"scale(1.05)"},{transform:"scale(1)"}],{duration:400});ripple(p.x+60,p.y+40);});});}
function A6(){const dp=document.querySelectorAll("#s6 .dPill");dp.forEach((el,k)=>{an(el,[{opacity:0,transform:"translateY(-18px)"},{opacity:1,transform:"none"}],{duration:300,delay:k*50});});
at(14.3,()=>{const strip=$("#s6 .dStrip");let sel=strip.querySelector(".dSel");if(!sel){sel=document.createElement("div");sel.className="dSel";strip.appendChild(sel);}
const t=dp[1];sel.style.left=t.offsetLeft+"px";sel.style.width=t.offsetWidth+"px";sel.style.top="0";sel.style.height="100%";
dp.forEach(e=>e.style.color="#94A3B8");dp[1].style.color="#fff";});
const sl=document.querySelectorAll("#s6 .slot");sl.forEach((el,k)=>{an(el,[{opacity:0,transform:"translateY(16px)"},{opacity:1,transform:"none"}],{duration:300,delay:300+k*60});});
at(15.2,()=>{const modes=document.querySelectorAll("#s6 .mode");modes.forEach(m=>{m.classList.remove("on");});const mr=$("#s6 .modeRow");let ms=mr.querySelector(".mSel");if(!ms){ms=document.createElement("div");ms.className="mSel";mr.appendChild(ms);}
const t=modes[1];ms.style.left=t.offsetLeft+"px";ms.style.width=t.offsetWidth+"px";t.classList.add("on");});
at(16.3,()=>{const avail=[...sl].filter(e=>!e.classList.contains("bk"));const pick=avail[5]||avail[0];const l=L(pick.getBoundingClientRect()),px=l.x+l.w/2,py=l.y+l.h/2;cursor.style.opacity=1;fly(px,py,16);
at(16.9,()=>{pick.classList.add("pick","pulse");ripple(px,py);streak(500);});});}
function A7(){const flds=document.querySelectorAll("#s7 .fld");flds.forEach((f,k)=>{const txt=f.dataset.txt;f.textContent="";at(18.3+k*.5,()=>{let c=0;const iv=setInterval(()=>{f.textContent=txt.slice(0,++c)+"▌";if(c>=txt.length){clearInterval(iv);f.textContent=txt;}},35);IVS.push(iv);});});
const rows=document.querySelectorAll("#s7 .sumCard div");rows.forEach((r,k)=>{at(19.3+k*.2,()=>{an(r,[{opacity:0,transform:"translateX(-24px)"},{opacity:1,transform:"none"}],{duration:300});});});
at(20.2,()=>{const b=$("#s7 #ctaBtn"),l=L(b.getBoundingClientRect()),px=l.x+l.w/2,py=l.y+l.h/2;cursor.style.opacity=1;fly(px,py,14);at(20.6,()=>{ripple(px,py);b.textContent="Booking…";});});}
function confetti(n){n=n||160;const box=$("#confetti");const cols=["#2DD4BF","#14B8A6","#10B981","#22D3EE","#F8FAFC","#FBBF24"];for(let k=0;k<n;k++){const c=document.createElement("i");c.className="cf";const sz=6+Math.random()*9;c.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz*.6}px;background:${cols[k%cols.length]}`;box.appendChild(c);const dx=(Math.random()-.5)*560,rot=Math.random()*900-450,dl=Math.random()*250;c.animate([{transform:"translate(0,-30px) rotate(0)",opacity:1},{transform:`translate(${dx}px,1150px) rotate(${rot}deg)`,opacity:.9}],{duration:1900+Math.random()*1300,delay:dl,easing:"cubic-bezier(.2,.6,.4,1)",fill:"forwards"});setTimeout(()=>c.remove(),3600+dl);}}
function A8(){const scr=$("#s8 .scr");scr.classList.remove("go");void scr.offsetWidth;scr.classList.add("go");cursor.style.opacity=0;
at(21.2,()=>{const l=L($("#s8 .glowBurst").getBoundingClientRect());const cx=l.x+l.w/2,cy=l.y+l.h/2;
[0,250].forEach(d=>{setTimeout(()=>{const s=document.createElement("div");s.className="shock";s.style.left=cx+"px";s.style.top=cy+"px";$("#stage").appendChild(s);setTimeout(()=>s.remove(),950);},d);});});
at(21.4,()=>{confetti(200);streak(320);$("#stage").classList.add("shakeAll");setTimeout(()=>$("#stage").classList.remove("shakeAll"),320);});
at(22.2,()=>{const tk=$("#s8 #tokNum");let n=1;const iv=setInterval(()=>{tk.textContent="A-"+String(n).padStart(2,"0");tk.animate([{transform:"scale(1.5)"},{transform:"scale(1)"}],{duration:150});if(++n>14)clearInterval(iv);},70);IVS.push(iv);});}
function A9(){const nodes=document.querySelectorAll("#s9 .tlN");nodes.forEach((el,k)=>{at(24.8+k*.45,()=>{an(el,[{opacity:0,transform:"scale(.5)"},{opacity:1,transform:"scale(1.25)"},{transform:"scale(1)"}],{duration:400});el.classList.add(k<3?"done":"now");pulse(340+k*410,505);});});
const fl=$("#tlFill"),dt=$("#tlDot");at(24.8,()=>{fl.animate([{width:"0"},{width:"100%"}],{duration:1600,easing:"ease-in-out",fill:"forwards"});dt.animate([{left:"0"},{left:"100%"}],{duration:1600,easing:"ease-in-out",fill:"forwards"});});
document.querySelectorAll("#s9 .mini").forEach((el,k)=>{at(25.6+k*.25,()=>{an(el,[{opacity:0,transform:"translateY(40px)"},{opacity:1,transform:"none"}],{duration:400});});});}
function A10(){const lg=$("#s10 .fLogo");an(lg,[{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"scale(1.1)"},{transform:"scale(1)"}],{duration:500});
const dirs=[[-700,0],[700,0],[0,-400],[0,400]];document.querySelectorAll("#s10 .feat").forEach((el,k)=>{try{el.getAnimations().forEach(a=>a.cancel());}catch(e){}an(el,[{opacity:0,transform:`translate(${dirs[k][0]}px,${dirs[k][1]}px) scale(.7)`},{opacity:1,transform:"translate(0,0) scale(1.08)"},{transform:"translate(0,0) scale(1)"}],{duration:500,delay:150+k*90});
(function bob(ph){el.animate([{transform:"translateY(-10px)"},{transform:"translateY(10px)"},{transform:"translateY(-10px)"}],{duration:3000,delay:ph,easing:"ease-in-out",iterations:Infinity});})(k*750);});streak(400,150);streak(650,300);}
function A11(){$("#s11").classList.add("s11go");
at(29.2,()=>{const u=$("#urlType"),txt="findmedi.com";let c=0;u.textContent="";const iv=setInterval(()=>{u.textContent=txt.slice(0,++c);if(c>=txt.length)clearInterval(iv);},50);IVS.push(iv);});
at(28.9,()=>{streak(420);});}
const ACT={1:A1,2:A2,3:A3,4:A4,5:A5,6:A6,7:A7,8:A8,9:A9,10:A10,11:A11};
// ---- playback engine ----
function playScene(i){show(i);setCap(i);if(i>1)wipe();ACT[i]();}
function resetStage(){timers.forEach(clearTimeout);timers=[];IVS.forEach(clearInterval);IVS=[];
document.querySelectorAll(".scene").forEach(s=>s.classList.remove("on","s1go","s2shake","s2heal","s11go"));
const s8=$("#s8 .scr");if(s8)s8.classList.remove("go");cursor.style.opacity=0;$("#confetti").innerHTML="";$("#streakBox").innerHTML="";
// loop-safe state reset (fixes mid-film stalls on replay)
document.querySelectorAll("#s2 .hookB span").forEach(sp=>{sp.style.animation="";});
document.querySelectorAll("#s1 .brand span").forEach(sp=>{sp.style.animation="";});
const tl=$("#s2 .hookB");if(tl)tl.style.opacity="";
document.querySelectorAll("#s4 .spec").forEach(e=>e.classList.remove("sel","fire","dim"));
document.querySelectorAll("#s5 .doc").forEach(e=>{e.style.borderColor="";e.style.boxShadow="";});
const dsel=$("#s6 .dSel");if(dsel)dsel.remove();const msel=$("#s6 .mSel");if(msel)msel.remove();
document.querySelectorAll("#s6 .dPill").forEach(e=>e.style.color="");
document.querySelectorAll("#s6 .slot").forEach(e=>e.classList.remove("pick","pulse"));
document.querySelectorAll("#s7 .fld").forEach(e=>e.textContent="");
const cb=$("#s7 #ctaBtn");if(cb)cb.textContent="Confirm Booking";
document.querySelectorAll("#s9 .tlN").forEach(e=>e.classList.remove("done","now"));
const uw=$("#urlType");if(uw)uw.textContent="";
try{["tlFill","tlDot"].forEach(id=>{const el=document.getElementById(id);if(el)el.getAnimations().forEach(a=>a.cancel());});}catch(e){}}
function tick(){if(!playing)return;const now=performance.now();T=(now-t0)/1000;
if(T>=30){restart();return;}
const sc=SCENES.find(s=>T>=s.t0&&T<s.t1);
if(sc&&sc.i!==cur)playScene(sc.i);
if(cur)litWords();
$("#progFill").style.width=(T/30*100)+"%";
const mm=String(Math.floor(T/60)).padStart(2,"0"),ss=String(Math.floor(T%60)).padStart(2,"0");$("#tcode").textContent=`${mm}:${ss} / 00:30`;
raf=requestAnimationFrame(tick);}
function restart(){resetStage();t0=performance.now();T=0;playing=true;$("#ppBtn").textContent="⏸";cancelAnimationFrame(raf);tick();}
$("#ppBtn").onclick=()=>{playing=!playing;$("#ppBtn").textContent=playing?"⏸":"▶";if(playing){t0=performance.now()-T*1000;tick();}else cancelAnimationFrame(raf);};
$("#rsBtn").onclick=restart;
document.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();$("#ppBtn").click();}if(e.key==="r"||e.key==="R")restart();});
addEventListener("load",()=>{fit();restart();});fit();restart();
