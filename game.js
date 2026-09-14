// 卜卜大冒险 · Bobo Adventure v4
// 本版只针对：背景拼接、卜卜尺寸、顶部 HUD 排版进行调整。

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;

const CONFIG={playerSpeed:3.8,jumpPower:11.8,gravity:.55,maxFallSpeed:13,lives:3,levelWidth:8400,goalX:8100,
  noteSpeedMultiplier:1.45, noteBuffDuration:5.0, bouncePower:15.5};

const bobo=new Image();bobo.src="assets/bobo.png";
const bg=new Image();bg.src="assets/background.png";
let boboReady=false,bgReady=false;bobo.onload=()=>boboReady=true;bg.onload=()=>bgReady=true;

const keys={};
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==="Space"&&!e.repeat)jump();if(e.code==="KeyP"&&!e.repeat)togglePause();if(e.code==="KeyR"&&!e.repeat)restart()});
window.addEventListener("keyup",e=>keys[e.code]=false);

let state="start",cameraX=0,score=0,coinCount=0,lives=CONFIG.lives,startTime=0,elapsed=0,finishTime=0,celebrationStart=0;
const player={x:90,y:370,w:82,h:84,vx:0,vy:0,grounded:false,coyote:0,jumpBuffer:0,invincible:0};

const platforms=[
{x:0,y:470,w:620,h:70},{x:700,y:470,w:360,h:70},{x:1120,y:430,w:260,h:110},{x:1440,y:390,w:240,h:150},{x:1740,y:470,w:520,h:70},
{x:2330,y:440,w:180,h:100},{x:2590,y:400,w:190,h:140},{x:2870,y:350,w:190,h:190},{x:3160,y:470,w:480,h:70},
{x:3730,y:430,w:210,h:110},{x:4020,y:370,w:210,h:170},{x:4310,y:430,w:260,h:110},{x:4640,y:470,w:430,h:70},
{x:5150,y:420,w:190,h:120},{x:5410,y:350,w:190,h:190},{x:5680,y:410,w:220,h:130},{x:5990,y:470,w:420,h:70},
{x:6510,y:420,w:190,h:120},{x:6780,y:360,w:190,h:180},{x:7060,y:420,w:220,h:120},{x:7370,y:470,w:300,h:70},{x:7770,y:420,w:210,h:120},{x:8070,y:470,w:330,h:70}
];
const coinData=[[230,410],[310,410],[390,410],[760,410],[840,410],[1190,370],[1270,370],[1500,330],[1580,330],[1910,410],[1990,410],[2070,410],[2390,400],[2670,360],[2950,310],[3290,410],[3380,410],[3470,410],[3800,390],[3880,390],[4090,330],[4400,390],[4490,390],[4770,410],[4860,410],[4950,410],[5220,380],[5490,310],[5760,370],[6100,410],[6190,410],[6280,410],[6570,380],[6850,320],[7130,380],[7450,410],[7540,410],[7830,380],[8150,410],[8240,410]];
const coins=coinData.map(([x,y])=>({x,y,r:13,collected:false,phase:Math.random()*6}));

// ====== 可选机制 ① 舞台弹跳灯 ======
// 玩家可以主动跳上这些灯，也可以绕开它们；不会伤害玩家，也不会新增致死陷阱。
const bounceLights=[
  {x:815,y:446,w:62,h:24},
  {x:2440,y:416,w:62,h:24},
  {x:3860,y:406,w:62,h:24},
  {x:5500,y:326,w:62,h:24},
  {x:6840,y:336,w:62,h:24}
];

// ====== 可选机制 ② 音符 Buff ======
// 拾取后短暂加速，没有减速、扣血或其他负面效果。
const noteData=[[930,410],[2720,350],[4470,380],[6230,410],[7520,410]];
const notes=noteData.map(([x,y])=>({x,y,w:28,h:28,collected:false,phase:Math.random()*6}));
let speedBuffTimer=0;

const enemies=[{x:880,y:434,w:40,h:36,minX:760,maxX:1010,vx:1.1,alive:true},{x:1980,y:434,w:40,h:36,minX:1840,maxX:2200,vx:1.2,alive:true},{x:3320,y:434,w:40,h:36,minX:3230,maxX:3540,vx:1.3,alive:true},{x:4750,y:434,w:40,h:36,minX:4680,maxX:5030,vx:1.4,alive:true},{x:6150,y:434,w:40,h:36,minX:6050,maxX:6380,vx:1.5,alive:true},{x:7420,y:434,w:40,h:36,minX:7400,maxX:7640,vx:1.6,alive:true}];
const goal={x:CONFIG.goalX,y:320,w:18,h:150};

const screens={start:document.getElementById("startScreen"),pause:document.getElementById("pauseScreen"),over:document.getElementById("gameOverScreen"),win:document.getElementById("winScreen")};
function hideScreens(){Object.values(screens).forEach(s=>s.classList.add("hidden"))}
document.getElementById("startBtn").onclick=start;document.getElementById("resumeBtn").onclick=()=>setPause(false);document.getElementById("pauseRestartBtn").onclick=restart;document.getElementById("gameOverRestartBtn").onclick=restart;document.getElementById("winRestartBtn").onclick=restart;

function reset(){score=0;coinCount=0;lives=CONFIG.lives;cameraX=0;elapsed=0;state="playing";speedBuffTimer=0;player.x=90;player.y=386;player.vx=0;player.vy=0;player.grounded=false;player.coyote=0;player.jumpBuffer=0;player.invincible=0;coins.forEach(c=>c.collected=false);notes.forEach(n=>n.collected=false);enemies.forEach(e=>e.alive=true)}
function start(){reset();startTime=performance.now();hideScreens()}
function restart(){reset();startTime=performance.now();hideScreens()}
function togglePause(){if(state==="playing")setPause(true);else if(state==="paused")setPause(false)}
function setPause(v){state=v?"paused":"playing";if(v)screens.pause.classList.remove("hidden");else{screens.pause.classList.add("hidden");startTime=performance.now()-elapsed*1000}}
function jump(){if(state!=="playing")return;player.jumpBuffer=.12}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function updatePlayer(dt){
 const left=keys.ArrowLeft||keys.KeyA,right=keys.ArrowRight||keys.KeyD;
 const currentSpeed=CONFIG.playerSpeed*(speedBuffTimer>0?CONFIG.noteSpeedMultiplier:1);
 if(left&&!right)player.vx=-currentSpeed;else if(right&&!left)player.vx=currentSpeed;else player.vx*=.78;
 if(speedBuffTimer>0)speedBuffTimer=Math.max(0,speedBuffTimer-dt);
 player.x+=player.vx;player.x=Math.max(0,Math.min(player.x,CONFIG.levelWidth-player.w));
 player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);player.coyote=player.grounded?.1:Math.max(0,player.coyote-dt);
 if(player.jumpBuffer>0&&player.coyote>0){player.vy=-CONFIG.jumpPower;player.grounded=false;player.jumpBuffer=0;player.coyote=0}
 const oldY=player.y;player.vy=Math.min(CONFIG.maxFallSpeed,player.vy+CONFIG.gravity);player.y+=player.vy;player.grounded=false;
 for(const p of platforms){const horizontal=player.x+player.w>p.x&&player.x<p.x+p.w;const landing=player.vy>=0&&oldY+player.h<=p.y&&player.y+player.h>=p.y;if(horizontal&&landing){player.y=p.y-player.h;player.vy=0;player.grounded=true}}
 // 弹跳灯：只有从上方落下时触发，绕开它完全不影响原有路线。
 for(const light of bounceLights){
   const horizontal=player.x+player.w>light.x&&player.x<light.x+light.w;
   const landing=player.vy>=0&&oldY+player.h<=light.y&&player.y+player.h>=light.y;
   if(horizontal&&landing){
     player.y=light.y-player.h;
     player.vy=-CONFIG.bouncePower;
     player.grounded=false;
   }
 }
 if(player.invincible>0)player.invincible-=dt;if(player.y>H+120)loseLife()
}
function updateEnemies(){for(const e of enemies){if(!e.alive)continue;e.x+=e.vx;if(e.x<=e.minX||e.x+e.w>=e.maxX)e.vx*=-1;if(player.invincible<=0&&hit(player,e)){loseLife();return}}}
function collectCoins(){for(const c of coins){if(c.collected)continue;const b={x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2};if(hit(player,b)){c.collected=true;coinCount++;score+=100}}}
function collectNotes(){
 for(const n of notes){
   if(n.collected)continue;
   if(hit(player,n)){
     n.collected=true;
     speedBuffTimer=CONFIG.noteBuffDuration;
     score+=150;
   }
 }
}
function checkGoal(){const b={x:goal.x-10,y:goal.y,w:75,h:goal.h};if(hit(player,b))win()}
function loseLife(){if(state!=="playing")return;lives--;if(lives<=0){state="gameover";document.getElementById("gameOverText").textContent=`得分 ${score}　金币 ${coinCount}　坚持了 ${formatTime(elapsed)}`;screens.over.classList.remove("hidden");return}player.x=Math.max(60,cameraX+100);player.y=300;player.vx=0;player.vy=0;player.invincible=2.2}
function win(){if(state!=="playing")return;state="celebrating";finishTime=elapsed;celebrationStart=performance.now();player.x=goal.x-70;player.y=goal.y+goal.h-player.h;player.vx=0;player.vy=0;player.grounded=true;document.getElementById("finalStats").textContent=`最终得分 ${score}　金币 ${coinCount}　用时 ${formatTime(finishTime)}`;screens.win.classList.remove("hidden")}
function formatTime(seconds){const s=Math.floor(seconds);return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function updateCamera(){const target=player.x-300;cameraX+=(target-cameraX)*.09;cameraX=Math.max(0,Math.min(cameraX,CONFIG.levelWidth-W))}

// 背景修复：不再每帧用重叠的多张图片做循环拼接。
// 直接把一张已经处理好的宽幅背景当作单一舞台画布，根据相机位置裁切显示。
// 这样不会出现图片互相覆盖、重复叠在一起的问题。
function drawBackground(){ctx.fillStyle="#07133f";ctx.fillRect(0,0,W,H);if(!bgReady)return;
 const scale=H/bg.height,bgW=bg.width*scale;
 const maxScroll=Math.max(0,bgW-W);
 const scroll=Math.min(maxScroll,(cameraX/(CONFIG.levelWidth-W))*maxScroll);
 ctx.drawImage(bg,-scroll,0,bgW,H);
 if(scroll>=maxScroll-1){ctx.fillStyle="#07133f";ctx.fillRect(Math.max(0,bgW-scroll),0,W-Math.max(0,bgW-scroll),H)}
}
function drawPlatform(p){const x=Math.round(p.x-cameraX);if(x+p.w<0||x>W)return;ctx.fillStyle="#201d55";ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle="#3ccf72";ctx.fillRect(x,p.y,p.w,10);ctx.fillStyle="#8a4c2d";ctx.fillRect(x,p.y+10,p.w,p.h-10);ctx.strokeStyle="#512b27";ctx.lineWidth=3;for(let yy=p.y+25;yy<p.y+p.h;yy+=26){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+p.w,yy);ctx.stroke()}for(let xx=x;xx<x+p.w;xx+=52){ctx.beginPath();ctx.moveTo(xx,p.y+10);ctx.lineTo(xx,p.y+p.h);ctx.stroke()}ctx.fillStyle="#ffd33d";for(let xx=x+18;xx<x+p.w-10;xx+=72)ctx.fillRect(xx,p.y+2,10,4)}
function drawCoin(c,t){if(c.collected)return;const x=c.x-cameraX;if(x<-30||x>W+30)return;const s=.72+Math.abs(Math.sin(t*.006+c.phase))*.28;ctx.save();ctx.translate(x,c.y);ctx.scale(s,1);ctx.fillStyle="#ffcf27";ctx.fillRect(-10,-13,20,26);ctx.fillStyle="#fff079";ctx.fillRect(-4,-9,5,18);ctx.fillStyle="#e69a12";ctx.fillRect(-13,-5,4,10);ctx.fillRect(9,-5,4,10);ctx.restore()}
function drawBounceLight(light,t){
 const x=light.x-cameraX;if(x<-80||x>W+80)return;
 const pulse=1+Math.sin(t*.008)*.08;
 ctx.save();ctx.translate(x+light.w/2,light.y+light.h/2);ctx.scale(pulse,1);
 ctx.fillStyle="#16153f";ctx.fillRect(-31,-12,62,24);
 ctx.fillStyle="#45d9ff";ctx.fillRect(-25,-7,50,14);
 ctx.fillStyle="#fff36b";ctx.fillRect(-15,-4,30,8);
 ctx.fillStyle="#ff6ad5";ctx.fillRect(-31,8,62,4);
 ctx.restore();
}
function drawNote(n,t){
 if(n.collected)return;
 const x=n.x-cameraX;if(x<-40||x>W+40)return;
 const bob=Math.sin(t*.006+n.phase)*5;
 ctx.save();ctx.translate(x+n.w/2,n.y+n.h/2+bob);
 ctx.fillStyle="#ffe05a";ctx.font="bold 30px monospace";ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.fillText("♪",0,0);
 ctx.fillStyle="#fff";ctx.font="bold 11px monospace";ctx.fillText("+SPEED",0,23);
 ctx.restore();
}
function drawEnemy(e){if(!e.alive)return;const x=e.x-cameraX;if(x<-50||x>W+50)return;ctx.fillStyle="#f04469";ctx.fillRect(x+5,e.y+8,30,25);ctx.fillRect(x+10,e.y+3,20,5);ctx.fillStyle="#fff";ctx.fillRect(x+10,e.y+12,6,7);ctx.fillRect(x+24,e.y+12,6,7);ctx.fillStyle="#1b1740";ctx.fillRect(x+12,e.y+14,3,4);ctx.fillRect(x+25,e.y+14,3,4);ctx.fillStyle="#752443";ctx.fillRect(x,e.y+32,40,5)}
function drawGoal(){const x=goal.x-cameraX;if(x<-80||x>W+80)return;ctx.fillStyle="#eee";ctx.fillRect(x,goal.y,7,goal.h);ctx.fillStyle="#ff4057";ctx.beginPath();ctx.moveTo(x+7,goal.y+8);ctx.lineTo(x+68,goal.y+25);ctx.lineTo(x+7,goal.y+45);ctx.closePath();ctx.fill();ctx.fillStyle="#ffd33d";ctx.fillRect(x+27,goal.y+22,12,9);ctx.fillStyle="#5b351e";ctx.fillRect(x-18,goal.y+goal.h-12,46,12)}
function drawPlayer(){if(player.invincible>0&&Math.floor(player.invincible*10)%2===0)return;const x=Math.round(player.x-cameraX),y=Math.round(player.y);if(boboReady)ctx.drawImage(bobo,x,y,player.w,player.h);else{ctx.fillStyle="#ff7d16";ctx.fillRect(x+8,y+15,60,55);ctx.fillStyle="#65b83c";ctx.fillRect(x+20,y,14,25);ctx.fillRect(x+39,y-5,14,27)}}

// 顶部 HUD：扩大黑框并使用五个固定列，所有文字都严格留在框内。
function drawHUD(){
 const boxX=18,boxY=16,boxW=924,boxH=54;
 ctx.fillStyle="rgba(4,7,25,.94)";ctx.fillRect(boxX,boxY,boxW,boxH);
 ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.strokeRect(boxX,boxY,boxW,boxH);
 ctx.fillStyle="#fff";ctx.font="bold 17px monospace";ctx.textBaseline="middle";
 const cols=[38,190,390,570,735];
 ctx.fillText(`卜卜 × ${lives}`,cols[0],boxY+boxH/2);
 ctx.fillText(`SCORE ${String(score).padStart(6,"0")}`,cols[1],boxY+boxH/2);
 ctx.fillText(`COIN × ${String(coinCount).padStart(2,"0")}`,cols[2],boxY+boxH/2);
 ctx.fillText(`TIME ${formatTime(elapsed)}`,cols[3],boxY+boxH/2);
 const meters=Math.max(0,Math.floor((CONFIG.goalX-player.x)/10));
 ctx.fillText(`距离终点 ${meters}m`,cols[4],boxY+boxH/2);
 if(speedBuffTimer>0){
   ctx.fillStyle="#ffe05a";ctx.font="bold 13px monospace";
   ctx.fillText(`♪ 加速 ${speedBuffTimer.toFixed(1)}s`,755,boxY+boxH-5);
 }
 ctx.textBaseline="alphabetic";
}
function drawCelebration(now){const t=now-celebrationStart;ctx.fillStyle=`rgba(255,220,60,${.1+.12*Math.sin(t*.01)})`;ctx.fillRect(0,0,W,H);for(let i=0;i<34;i++){const seed=i*37,x=((seed*83+t*(.025+(i%5)*.004))%(W+80))-40,y=70+((seed*29)%180)+Math.sin(t*.004+i)*20,s=4+(i%3)*2;ctx.fillStyle=["#ffd33d","#ff5b73","#62d8ff","#b98cff"][i%4];ctx.font=`bold ${12+s}px monospace`;ctx.fillText(["★","✦","◆","■"][i%4],x,y)}const bounce=Math.abs(Math.sin(t*.008))*30;const x=Math.round(goal.x-cameraX-70+Math.sin(t*.006)*5),y=Math.round(goal.y+goal.h-player.h-bounce);if(boboReady)ctx.drawImage(bobo,x,y,player.w,player.h);ctx.save();ctx.translate(W/2,125);const sc=1+Math.sin(Math.min(t,600)*.008)*.06;ctx.scale(sc,sc);ctx.textAlign="center";ctx.font="bold 46px monospace";ctx.lineWidth=7;ctx.strokeStyle="#15103c";ctx.strokeText("通 关 ！",0,0);ctx.fillStyle="#ffd33d";ctx.fillText("通 关 ！",0,0);ctx.restore()}

let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.033);last=now;if(state==="playing"){elapsed=(now-startTime)/1000;updatePlayer(dt);updateEnemies();collectCoins();collectNotes();checkGoal();updateCamera()}ctx.clearRect(0,0,W,H);drawBackground();for(const p of platforms)drawPlatform(p);for(const light of bounceLights)drawBounceLight(light,now);for(const c of coins)drawCoin(c,now);for(const n of notes)drawNote(n,now);for(const e of enemies)drawEnemy(e);drawGoal();if(state==="celebrating")drawCelebration(now);else drawPlayer();drawHUD();requestAnimationFrame(loop)}requestAnimationFrame(loop);