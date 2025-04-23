
#### 1  HTML – add the Six-vertex toggle  
Locate the block with the check-boxes “Show colors … Show height function”.  
Insert **after** the height-function div:

```html
<!-- Six-vertex toggle -->
<div style="margin-bottom: 8px;">
  <label for="sixvertex-toggle">
    <input type="checkbox" id="sixvertex-toggle"> Show six-vertex model (DWBC)
  </label>
</div>
```

---

#### 2  JS – new globals  
Near the other view flags (just after `let useHeightFunction = false;`) add:

```javascript
let useSixVertex = false;   // view flag
let sixVertexGroup;         // <g> holder for arrows
```

---

#### 3  JS – six-vertex checkbox listener  
Right after the existing listener for `#height-toggle`, append:

```javascript
document.getElementById("sixvertex-toggle")
        .addEventListener("change", function () {
          useSixVertex = this.checked;
          if (currentDominoes.length > 0) toggleSixVertex();
        });
```

---

#### 4  JS – reusable arrow-head marker  
Inside `renderDominoes()` **before** `svg.append("g")` is first called:

```javascript
// ---------- reusable marker (only once) ----------
if (svg.select("marker#arrowhead").empty()) {
  svg.append("defs").append("marker")
     .attr("id", "arrowhead")
     .attr("viewBox", "0 -5 10 10")
     .attr("refX", 10).attr("refY", 0)
     .attr("markerWidth", 6).attr("markerHeight", 6)
     .attr("orient", "auto")
     .append("path")
     .attr("d", "M0,-5L10,0L0,5")
     .attr("fill", "black")
     .attr("vector-effect","non-scaling-stroke");   // keeps arrowheads visible
}
```

---

#### 5  JS – even-n safeguard (inside `updateVisualization()`)  
Immediately after parsing `n`:

```javascript
// Six-vertex overlay relies on colour-parity ⇒ n must be even.
if (n % 2 !== 0 && useSixVertex) {
  console.warn("Six-vertex view disabled: n is odd — parity mismatch");
  useSixVertex = false;
  document.getElementById("sixvertex-toggle").checked = false;
}
```

---

#### 6  JS – helper for vertex keys  
Place near other utilities, directly above the new toggle function:

```javascript
const VERTEX_KEY = (x, y) => `${Math.round(x)},${Math.round(y)}`;
```

---

#### 7  JS – **full** `toggleSixVertex()` implementation  
Add **below** `toggleDimers()` (replace any previous draft):

```javascript
// ===========================================================
//   Toggle six-vertex (domain-wall BC) overlay
// ===========================================================
function toggleSixVertex() {

  /* 0. clear / early exit */
  if (sixVertexGroup) { sixVertexGroup.remove(); sixVertexGroup = null; }
  if (!useSixVertex)   return;

  /* 1. viewport transform identical to paths toggle */
  const minX = d3.min(currentDominoes, d => d.x),
        minY = d3.min(currentDominoes, d => d.y),
        maxX = d3.max(currentDominoes, d => d.x + d.w),
        maxY = d3.max(currentDominoes, d => d.y + d.h);

  const { width: W, height: H } = svg.node().getBoundingClientRect();
  const s  = Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.9;
  const tx = (W - (maxX - minX) * s) / 2 - minX * s;
  const ty = (H - (maxY - minY) * s) / 2 - minY * s;

  sixVertexGroup = svg.append("g")
      .attr("class", "six-vertex")
      .attr("transform", `translate(${tx},${ty}) scale(${s})`);

  /* 2. draw arrows + degree bookkeeping */
  const STROKE = (n <= 60 ? 5.5 : 3.5);           // lighter for huge n
  const USE_MARKER = (n <= 120);                  // drop heads if too many
  const deg = new Map();                          // vertex balance map

  const addEdge = (x1,y1,x2,y2)=>{
    sixVertexGroup.append("line")
      .attr("x1",x1).attr("y1",y1).attr("x2",x2).attr("y2",y2)
      .attr("stroke","black").attr("stroke-width",STROKE)
      .attr(USE_MARKER? "marker-end":null, USE_MARKER? "url(#arrowhead)":null);

    const a = VERTEX_KEY(x1,y1), b = VERTEX_KEY(x2,y2);
    deg.set(a,(deg.get(a)||0)-1);
    deg.set(b,(deg.get(b)||0)+1);
  };

  currentDominoes.forEach(d=>{
    const cx=d.x+d.w/2, cy=d.y+d.h/2;
    if (d.color==="green") {
      addEdge(d.x,cy,d.x+d.w,cy);
    } else if (d.color==="yellow") {
      const len=Math.min(d.w,d.h)*0.7, h=len/Math.SQRT2;
      addEdge(cx-h,cy+h,cx+h,cy-h);
    } else if (d.color==="red") {
      const len=Math.min(d.w,d.h)*0.7, h=len/Math.SQRT2;
      addEdge(cx-h,cy-h,cx+h,cy+h);
    }
    /* blue → no arrow */
  });

  /* 3. boundary-flux check; flip all arrows if reversed */
  let west=0,east=0,south=0,north=0;
  deg.forEach((v,k)=>{
    const [x,y]=k.split(',').map(Number);
    if (x===minX) west += v;
    if (x===maxX) east += v;
    if (y===minY) south+= v;
    if (y===maxY) north+= v;
  });

  const good   = (west>0 && south>0 && east<0 && north<0);
  const flipped= (west<0 && south<0 && east>0 && north>0);

  if (!good && flipped) {
    // swap end-points and move arrowhead to the new end
    sixVertexGroup.selectAll("line")
      .attr("marker-end",null)
      .attr("marker-start",USE_MARKER? "url(#arrowhead)":null)
      .each(function(){
        const l=d3.select(this),
              x1=l.attr("x1"),y1=l.attr("y1");
        l.attr("x1",l.attr("x2"))
         .attr("y1",l.attr("y2"))
         .attr("x2",x1).attr("y2",y1);
      });
    console.info("Six-vertex overlay: global orientation auto-flipped");
  } else if (!good) {
    console.warn("Six-vertex: boundary flux inconsistent");
  }

  sixVertexGroup.raise();
  if (checkerboardGroup) checkerboardGroup.raise();
}
```

---

#### 8  JS – render hook  
At the *end* of `renderDominoes()` (after dimers & height-function blocks) add:

```javascript
// Six-vertex overlay
if (useSixVertex) toggleSixVertex();
```

