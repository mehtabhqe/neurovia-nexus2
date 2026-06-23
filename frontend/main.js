/* ── PARTICLES ─────────────────────────────────────────── */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let W, H, pts = [];
function resize(){
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
for(let i=0;i<90;i++){
  pts.push({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    r:Math.random()*1.2+.3,
    vx:(Math.random()-.5)*.25,
    vy:(Math.random()-.5)*.25,
    a:Math.random()*.6+.1
  });
}
function drawParticles(){
  ctx.clearRect(0,0,W,H);
  pts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=W; if(p.x>W)p.x=0;
    if(p.y<0)p.y=H; if(p.y>H)p.y=0;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(130,140,248,${p.a})`;
    ctx.fill();
  });
  pts.forEach((a,i)=>{
    pts.slice(i+1).forEach(b=>{
      const dx=a.x-b.x,dy=a.y-b.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(99,102,241,${(1-dist/120)*.18})`;
        ctx.lineWidth=.6;ctx.stroke();
      }
    });
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

/* ── REVEAL ────────────────────────────────────────────── */
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}
  });
},{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ── COUNTDOWN ─────────────────────────────────────────── */
const target=new Date('2028-03-30T00:00:00'); // 650 days from June 19 2026
function tick(){
  const diff=target-new Date();
  if(diff<=0)return;
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('d').textContent=pad(Math.floor(diff/86400000));
  document.getElementById('h').textContent=pad(Math.floor(diff%86400000/3600000));
  document.getElementById('m').textContent=pad(Math.floor(diff%3600000/60000));
  document.getElementById('s').textContent=pad(Math.floor(diff%60000/1000));
}
tick();setInterval(tick,1000);

/* ── SMOOTH SCROLL ─────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}
  });
});
