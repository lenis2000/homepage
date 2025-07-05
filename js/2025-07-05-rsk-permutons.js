/* 2025‑07‑05‑rsk‑permutons.js — single‑file ES6 module
 *  Depends only on standard browser APIs.  Exported global object: `YoungPerm`.
 *  Usage in HTML:
 *      <script src="/js/2025-07-05-rsk-permutons.js"></script>
 *      <script>
 *          YoungPerm.initCanvas("shapeCanvas", "gridN");
 *          // later → YoungPerm.drawPermutationMatrix("permMatrix");
 *      </script>
 */

// ——— utils ———
function secureRandom() {
  const b = new Uint32Array(1); self.crypto.getRandomValues(b); return b[0]/2**32; }
const randInt = (a,b,r=secureRandom)=>Math.floor(r()*(b-a+1))+a;

// ——— hook length helper ———
function hookTable(shape){const h=[];for(let r=0;r<shape.length;r++){h[r]=[];for(let c=0;c<shape[r];c++){let right=shape[r]-c-1,below=0;for(let k=r+1;k<shape.length;k++)if(shape[k]>c)below++;h[r][c]=right+below+1;}}return h;}

// ——— Greene‑Nijenhuis‑Wilf sampler ———
function sampleSYT(shape,rng=secureRandom){const n=shape.reduce((a,b)=>a+b,0),T=shape.map(l=>Array(l).fill(0));for(let k=n;k>=1;k--){let r,c;do{r=randInt(0,shape.length-1,rng);c=randInt(0,shape[r]-1,rng);}while(T[r][c]);while(true){let down=0;for(let t=r+1;t<shape.length;t++)if(shape[t]>c&&!T[t][c])down++;const right=shape[r]-c-1-T[r].slice(c+1).filter(x=>x).length,total=down+right;if(!total)break;const step=randInt(1,total,rng);if(step<=right){do{c++;}while(T[r][c]);}else{do{r++;}while(T[r][c]);}}T[r][c]=k;}return T;}
const sampleTwoSYTs=(shape,r=secureRandom)=>[sampleSYT(shape,r),sampleSYT(shape,r)];

// ——— inverse RSK ———
function rskInverse(P,Q){const n=P.reduce((s,row)=>s+row.length,0),σ=Array(n);for(let k=n;k>=1;k--){let rQ=-1,cQ=-1;outer:for(let r=0;r<Q.length;r++)for(let c=0;c<Q[r].length;c++)if(Q[r][c]===k){rQ=r;cQ=c;break outer;}σ[k-1]=P[rQ][cQ];P[rQ].splice(cQ,1);Q[rQ].splice(cQ,1);if(!P[rQ].length){P.splice(rQ,1);Q.splice(rQ,1);} }return σ;}

// ——— matrix renderer ———
function renderMatrix(σ,container){const n=σ.length,tab=document.createElement("table");tab.style.borderCollapse="collapse";for(let i=0;i<n;i++){const row=tab.insertRow();for(let j=0;j<n;j++){const cell=row.insertCell();cell.textContent=σ[i]===j+1?"1":"0";cell.style.cssText="border:1px solid #666;padding:2px 4px;text-align:center;";}}container.innerHTML="";container.appendChild(tab);}

// ——— canvas helpers ———
let canvas,ctx,Ninput;
function snapShape(N){const w=canvas.width,h=canvas.height,img=ctx.getImageData(0,0,w,h).data,grid=[];for(let y=0;y<N;y++){grid[y]=[];for(let x=0;x<N;x++){const x0=Math.floor(x*w/N),x1=Math.floor((x+1)*w/N),y0=Math.floor(y*h/N),y1=Math.floor((y+1)*h/N);let dark=0,tot=0;for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const α=img[4*(yy*w+xx)+3];if(α>128)dark++;tot++;}grid[y][x]=dark/tot>0.3?1:0;}}const shape=[];for(let y=0;y<N;y++){let len=0;while(len<N&&grid[y][len])len++;if(!len)break;shape.push(len);}return shape;}

// ——— public API ———
const YoungPerm={
  initCanvas(canvasId,NinputId){canvas=document.getElementById(canvasId);ctx=canvas.getContext("2d");Ninput=document.getElementById(NinputId);let draw=false;canvas.onmousedown=()=>draw=true;canvas.onmouseup=canvas.onmouseleave=()=>draw=false;canvas.onmousemove=e=>{if(!draw)return;const r=canvas.getBoundingClientRect();ctx.fillRect(e.clientX-r.left,e.clientY-r.top,4,4);} ; },
  drawPermutationMatrix(targetId){const N=+Ninput.value||20,shape=snapShape(N);if(!shape.length){alert("Draw a Young diagram first!");return;}const [P,Q]=sampleTwoSYTs(shape),σ=rskInverse(JSON.parse(JSON.stringify(P)),JSON.parse(JSON.stringify(Q)));renderMatrix(σ,document.getElementById(targetId));}
};
self.YoungPerm=YoungPerm;