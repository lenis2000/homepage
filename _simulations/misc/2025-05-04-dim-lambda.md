---
title: Young diagrams of maximal dimension
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/yourusername/homepage/blob/master/_simulations/misc/2025-05-04-dim-lambda.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
---
<script src="{{site.url}}/js/d3.v7.min.js"></script>

<style>
  .chart-container {
    height: 400px;
    width: 100%;
  }
  .young-diagram-container {
    margin-top: 20px;
    text-align: center;
  }
  .young-box {
    fill: #4682b4;
    stroke: #000;
    stroke-width: 1px;
  }
  .young-box-new {
    fill: #ff7f50; /* Coral color for new boxes */
    stroke: #000;
    stroke-width: 1px;
  }
  .young-box-removed {
    fill: none;
    stroke: #ff0000; /* Red color for removed boxes */
    stroke-width: 2px;
    stroke-dasharray: 5,5;
  }
  .stats-card {
    margin-top: 20px;
  }
  .number-input-container {
    display: flex;
    align-items: center;
  }
  .number-controls {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
  }
  .number-control-btn {
    cursor: pointer;
    padding: 2px 8px;
    background: #f8f9fa;
    border: 1px solid #ced4da;
    user-select: none;
  }
  .number-control-btn:hover {
    background: #e9ecef;
  }
</style>

<div class="container mt-5">
  <div class="row">
    <div class="col-md-12">
      <p>
          This visualization displays the Young diagrams with the maximum dimension (number of standard Young tableaux)
          for each size $n$. For large $n$, partitions maximizing $f^\lambda$ are identified via heuristics similarly to those described in <a href="https://arxiv.org/abs/2311.15199">arXiv:2311.15199</a>.
      </p>
    </div>
  </div>

  <div class="row mt-4">
    <div class="col-md-4">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">Input</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label for="size-n" class="form-label">Size n:</label>
            <div class="number-input-container">
              <input type="number" class="form-control" id="size-n" min="1" max="116" value="10" required>
              <div class="number-controls">
                  <span class="number-control-btn" id="increment-btn">▲</span>
                  <span class="number-control-btn" id="decrement-btn">▼</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card stats-card">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">Information</h5>
        </div>
        <div class="card-body">
          <div id="stats-container">
            <p><strong>Partition:</strong> <span id="partition-display">-</span></p>
            <p><strong>Dimension $f^{\lambda}$:</strong> <span id="dimension-display">-</span></p>
            <p><strong>Scientific Notation:</strong> <span id="scientific-display">-</span></p>
            <p><strong>$c(\lambda) = -\log(f^{\lambda}/\sqrt{n!})/\sqrt{n}=$</strong> <span id="c-lambda-display">-</span></p>
          </div>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <div class="card">
        <div class="card-header bg-success text-white">
          <h5 class="card-title mb-0">Young Diagram</h5>
        </div>
        <div class="card-body">
          <div class="young-diagram-container" id="young-diagram-container"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
  // Store the partition data for each size n
  const partitionData = {
    1: {
      partition: [1],
      dimension: 1
    },
    2: {
      partition: [1, 1],
      dimension: 1
    },
    3: {
      partition: [2, 1],
      dimension: 2
    },
    4: {
      partition: [2, 1, 1],
      dimension: 3
    },
    5: {
      partition: [3, 1, 1],
      dimension: 6
    },
    6: {
      partition: [3, 2, 1],
      dimension: 16
    },
    7: {
      partition: [3, 2, 1, 1],
      dimension: 35
    },
    8: {
      partition: [4, 2, 1, 1],
      dimension: 90
    },
    9: {
      partition: [4, 2, 2, 1],
      dimension: 216
    },
    10: {
      partition: [4, 3, 2, 1],
      dimension: 768
    },
    11: {
      partition: [4, 3, 2, 1, 1],
      dimension: 2310
    },
    12: {
      partition: [5, 3, 2, 1, 1],
      dimension: 7700
    },
    13: {
      partition: [5, 3, 2, 2, 1],
      dimension: 21450
    },
    14: {
      partition: [5, 3, 2, 2, 1, 1],
      dimension: 69498
    },
    15: {
      partition: [5, 4, 3, 2, 1],
      dimension: 292864
    },
    16: {
      partition: [5, 4, 3, 2, 1, 1],
      dimension: 1153152
    },
    17: {
      partition: [6, 4, 3, 2, 1, 1],
      dimension: 4873050
    },
    18: {
      partition: [6, 4, 3, 2, 1, 1, 1],
      dimension: 16336320
    },
    19: {
      partition: [6, 4, 3, 2, 2, 1, 1],
      dimension: 64664600
    },
    20: {
      partition: [6, 5, 3, 2, 2, 1, 1],
      dimension: 249420600
    },
    21: {
      partition: [7, 5, 3, 2, 2, 1, 1],
      dimension: 1118939184
    },
    22: {
      partition: [6, 5, 4, 3, 2, 1, 1],
      dimension: 5462865408
    },
    23: {
      partition: [7, 5, 4, 3, 2, 1, 1],
      dimension: 28542158568
    },
    24: {
      partition: [7, 5, 4, 3, 2, 1, 1, 1],
      dimension: 117487079424
    },
    25: {
      partition: [7, 5, 4, 3, 2, 2, 1, 1],
      dimension: 547591590000
    },
    26: {
      partition: [8, 5, 4, 3, 2, 2, 1, 1],
      dimension: 2474843571200
    },
    27: {
      partition: [8, 6, 4, 3, 2, 2, 1, 1],
      dimension: 12760912164000
    },
    28: {
      partition: [8, 6, 4, 3, 3, 2, 1, 1],
      dimension: 57424104738000
    },
    29: {
      partition: [7, 6, 5, 4, 3, 2, 1, 1],
      dimension: 295284192952320
    },
    30: {
      partition: [8, 6, 5, 4, 3, 2, 1, 1],
      dimension: 1865134921890240
    },
    31: {
      partition: [8, 6, 5, 4, 3, 2, 1, 1, 1],
      dimension: 9241827385190400
    },
    32: {
      partition: [8, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 50385731994259200
    },
    33: {
      partition: [9, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 268401306245529600
    },
    34: {
      partition: [9, 7, 5, 4, 3, 2, 2, 1, 1],
      dimension: 1579812376072320000
    },
    35: {
      partition: [9, 7, 5, 4, 3, 3, 2, 1, 1],
      dimension: 7821859115070000000
    },
    36: {
      partition: [9, 7, 6, 4, 3, 3, 2, 1, 1],
      dimension: 40971642983700000000
    },
    37: {
      partition: [9, 7, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 222250513478508715200
    },
    38: {
      partition: [9, 7, 6, 5, 4, 3, 2, 1, 1],
      dimension: 1592694283209952665600
    },
    39: {
      partition: [9, 7, 6, 5, 4, 3, 2, 1, 1, 1],
      dimension: 9335226290275709091840
    },
    40: {
      partition: [9, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 58965081685061803130880
    },
    41: {
      partition: [10, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 366086379166733146521600
    },
    42: {
      partition: [10, 8, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 2455861544135906461632000
    },
    43: {
      partition: [10, 8, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 14064743140340298422496480
    },
    44: {
      partition: [11, 8, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 82628724406182220050744960
    },
    45: {
      partition: [10, 8, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 500283928761422348434320000
    },
    46: {
      partition: [11, 8, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 3099186881321017005002484000
    },
    47: {
      partition: [10, 8, 7, 6, 5, 4, 3, 2, 1, 1],
      dimension: 20368873512400427423405568000
    },
    48: {
      partition: [10, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1],
      dimension: 139108709149402516499579535360
    },
    49: {
      partition: [10, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 1007882872827294450598918225920
    },
    50: {
      partition: [11, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 7213044178117167522200420352000
    },
    51: {
      partition: [11, 9, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 54862456282689907329134847590400
    },
    52: {
      partition: [11, 9, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 360271734400780906661162863257600
    },
    53: {
      partition: [12, 9, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 2416328017978835907706221223561800
    },
    54: {
      partition: [11, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 16032089198265876501244987648140000
    },
    55: {
      partition: [12, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 112332940080014807351231850047731500
    },
    56: {
      partition: [12, 9, 8, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 780924182374434489607494144716850000
    },
    57: {
      partition: [12, 10, 8, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 5759492688586530968032605948341040000
    },
    58: {
      partition: [12, 10, 8, 6, 5, 4, 4, 3, 2, 2, 1, 1],
      dimension: 39204228543251710567342810799102400000
    },
    59: {
      partition: [11, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 284360991016399770894957040134389760000
    },
    60: {
      partition: [12, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 2321999844171845578871179664651452416000
    },
    // Continue up to n=116
    61: {
      partition: [12, 10, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1],
      dimension: 19896436084338134974427586952682903961600
    },
    62: {
      partition: [12, 10, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 148493270650299093215991941843059928064000
    },
    63: {
      partition: [13, 10, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1],
      dimension: 1128084815471490923775238783188995891011200
    },
    64: {
      partition: [13, 10, 8, 7, 6, 5, 4, 3, 3, 2, 1, 1, 1],
      dimension: 8229081864439402212381478702631306868113280
    },
    65: {
      partition: [13, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 64744511859060420712290642354586811061519360
    },
    66: {
      partition: [13, 10, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 492648887206925778427244427860670202969057200
    },
    67: {
      partition: [13, 11, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1],
      dimension: 4025571251354748853301084014788823689834654000
    },
    68: {
      partition: [13, 11, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1],
      dimension: 30473167912125109106974726128840645867371520000
    },
    69: {
      partition: [14, 11, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1],
      dimension: 234417911643806987948678393500955835502166016000
    },
    70: {
      partition: [14, 11, 9, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1],
      dimension: 1788611255686599443441275423897069708421376000000
    },
    // Adding more partitions up to n=116
    71: { partition: [14, 11, 9, 8, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 14061798146634215100928457529846541203122400000000 },
    72: { partition: [13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1], dimension: 130752274327952321538989760952406388528535044096000 },
    73: { partition: [13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1], dimension: 1099941833914297566548100976306304543754345185280000 },
    74: { partition: [14, 11, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1], dimension: 9393814297722007346466225462665628282244030499904000 },
    75: { partition: [14, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 1, 1, 1], dimension: 75591730449481189068765207148175917862445398493000000 },
    76: { partition: [14, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 660943493657107495213974182754150511637360513303040000 },
    77: { partition: [14, 11, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 5507479956694844226612276769373271537654140064265320000 },
    78: { partition: [14, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 49718318339225029555103035309089735554926840176109440000 },
    79: { partition: [14, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 418920939879777844937260609944023276410019030898651955200 },
    80: { partition: [15, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 3579026417818008407776702958356552842464133458949423759360 },
    81: { partition: [15, 12, 10, 8, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 29326030832439019031092736803263846956891854060380047278080 },
    82: { partition: [15, 12, 10, 9, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 245717058969967243667527972726893680531472205822714908672000 },
    83: { partition: [15, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1], dimension: 1958510306535009521762165974428282510483897121566558093312000 },
    84: { partition: [14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1], dimension: 17199984970509310503422142406316778944531851299986079744000000 },
    85: { partition: [14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1], dimension: 161866387856671801830938160974282163319008607501789408788480000 },
    86: { partition: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1], dimension: 1543188965753898098745955145496379055557243125097337202422906880 },
    87: { partition: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 1, 1, 1], dimension: 13652515506675457063836747192041480586149162971910780027773255200 },
    88: { partition: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 132012112829058929697216055665548406632996088226054058331660288000 },
    89: { partition: [15, 12, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 1202770010851978089499001986967434093160593877549352313484968012800 },
    90: { partition: [15, 13, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 11952161805200485671523852732672950906233029612342903238952910848000 },
    91: { partition: [15, 13, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 111536354532746933705105521827401388958780700059721074267272511488000 },
    92: { partition: [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 1053454252419345014848313815715121307642151973096789037261887897600000 },
    93: { partition: [16, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 9298019732498692589306447931761769662631984023874447420141412024320000 },
    94: { partition: [16, 13, 11, 10, 8, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 83528869990036960061655065586806227330592230516749107406742623092736000 },
    95: { partition: [16, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1], dimension: 738856195291160637064439093409373209747689102713743192921850842710016000 },
    96: { partition: [16, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 6830694040117548932247228149858288447418106733746110630642358121073868800 },
    97: { partition: [16, 13, 11, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 63933734724523910394059324668425220557070884535418451305089068784299552000 },
    98: { partition: [16, 14, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1], dimension: 587608644132988669062315659190628313018199189598748549625037176301076447232 },
    99: { partition: [16, 14, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 5629956124941094770622386912044341575706909420518139046529417862613615814000 },
    100: { partition: [17, 14, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 54539477511295000975066379739366669128884298419169669212903038310103287500000 },
    101: { partition: [16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 565378959002571348526487738883086152928500083237801155401255766231772364800000 },
    102: { partition: [16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 5686551912381574511129147722159555766486912859732682235293686582973153935360000 },
    103: { partition: [16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1], dimension: 61214329016711158166505670767097073373225632044596866872062611556033207085301760 },
    104: { partition: [16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 629571928828905856385137619784652309874964139464234066432099908346091489198080000 },
    105: { partition: [17, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 6543617427878537957159797488174446866494284857950790449673796864650405478400000000 },
    106: { partition: [17, 14, 12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 62248998806107993222904021013832709197228288195326145558076624865148293611520000000 },
    107: { partition: [17, 14, 12, 11, 9, 8, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1], dimension: 600822535255522047374450656754652331112658343843410146461744233385203670292889600000 },
    108: { partition: [17, 14, 12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1], dimension: 5859053607504252923711044267102909797677033029585662217958005496073729528960122880000 },
    109: { partition: [17, 14, 12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 59379551491616867820813793786673418100650673100467326423241849100982654799687188480000 },
    110: { partition: [17, 14, 12, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 593754279116521722049929039398826768910603501370575717477957906392395310042149879808000 },
    111: { partition: [17, 15, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1], dimension: 5843131836928986744562472498190299615029892226822600183226816624070074070360015831040000 },
    112: { partition: [17, 15, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 61105493625303738395253114613131217949919457622033925706446568203732810893059278458880000 },
    113: { partition: [18, 15, 13, 11, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 645284300395922462346988764778610006799667957567032614439503191406364806919846176670528000 },
    114: { partition: [18, 15, 13, 11, 9, 8, 7, 6, 5, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 6471311714640738998035388676878361545551725384849470054442985279137987684523862560930800000 },
    115: { partition: [18, 15, 13, 11, 10, 8, 7, 6, 5, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 66128905523715119393658109922164820371664898533283474357337419642390289909199389685625000000 },
    116: { partition: [18, 15, 13, 11, 10, 8, 7, 6, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1], dimension: 638413540225466549323771634427856615642473725894742100863592254944610659948329752000000000000 }
  };

  // Store the previous partition
  let previousPartition = null;

  // Function to draw the Young diagram for a given partition
  function drawYoungDiagram(partition, n) {
    const container = document.getElementById('young-diagram-container');
    container.innerHTML = '';

    // Set up dimensions
    const boxSize = 40;
    const margin = 20;

    // Get the previous partition if available
    const prevPartition = n > 1 ? partitionData[n-1].partition : null;

    // Calculate max dimensions considering both current and previous partitions
    const numRows = Math.max(partition.length, prevPartition ? prevPartition.length : 0);
    const numCols = Math.max(
      Math.max(...partition),
      prevPartition ? Math.max(...prevPartition) : 0
    );

    const width = numCols * boxSize + margin * 2;
    const height = numRows * boxSize + margin * 2;

    // Create SVG
    const svg = d3.select('#young-diagram-container')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create a map to track box statuses
    let boxStatuses = new Map();

    // If we have a previous partition, identify box statuses
    if (prevPartition) {
      // Create a map of boxes in the current partition
      const currentBoxes = new Set();
      for (let row = 0; row < partition.length; row++) {
        for (let col = 0; col < partition[row]; col++) {
          currentBoxes.add(`${row},${col}`);
        }
      }

      // Create a map of boxes in the previous partition
      const prevBoxes = new Set();
      for (let row = 0; row < prevPartition.length; row++) {
        for (let col = 0; col < prevPartition[row]; col++) {
          prevBoxes.add(`${row},${col}`);
        }
      }

      // Identify boxes that exist in both partitions (these haven't changed)
      const unchangedBoxes = new Set();
      prevBoxes.forEach(box => {
        if (currentBoxes.has(box)) {
          unchangedBoxes.add(box);
        }
      });

      // Identify boxes that exist in current but not in previous (new boxes)
      const newBoxes = new Set();
      currentBoxes.forEach(box => {
        if (!prevBoxes.has(box)) {
          newBoxes.add(box);
        }
      });

      // Identify boxes that exist in previous but not in current (removed boxes)
      const removedBoxes = new Set();
      prevBoxes.forEach(box => {
        if (!currentBoxes.has(box)) {
          removedBoxes.add(box);
        }
      });

      // For boxes in the current partition, determine if they're new, unchanged, or moved
      for (let row = 0; row < partition.length; row++) {
        for (let col = 0; col < partition[row]; col++) {
          const boxKey = `${row},${col}`;

          if (newBoxes.has(boxKey)) {
            // This is a new box
            boxStatuses.set(boxKey, 'new');
          } else {
            // All other boxes are considered unchanged
            boxStatuses.set(boxKey, 'unchanged');
          }
        }
      }

      // Mark removed boxes
      removedBoxes.forEach(boxKey => {
        boxStatuses.set(boxKey, 'removed');
      });
    }

    // First, draw the removed boxes (so they're in the background)
    if (prevPartition) {
      boxStatuses.forEach((status, boxKey) => {
        if (status === 'removed') {
          const [row, col] = boxKey.split(',').map(Number);
          svg.append('rect')
            .attr('class', 'young-box-removed')
            .attr('x', margin + col * boxSize)
            .attr('y', margin + row * boxSize)
            .attr('width', boxSize)
            .attr('height', boxSize);
        }
      });
    }

    // Then, draw the current boxes
    for (let row = 0; row < partition.length; row++) {
      const rowLength = partition[row];
      for (let col = 0; col < rowLength; col++) {
        const boxKey = `${row},${col}`;
        let boxClass = 'young-box';

        // If we have a previous partition, check if this box is new
        if (prevPartition) {
          const boxStatus = boxStatuses.get(boxKey);
          if (boxStatus === 'new') {
            boxClass = 'young-box-new';
          }
        }

        svg.append('rect')
          .attr('class', boxClass)
          .attr('x', margin + col * boxSize)
          .attr('y', margin + row * boxSize)
          .attr('width', boxSize)
          .attr('height', boxSize);
      }
    }

    // Add a legend
    if (prevPartition) {
      const legendX = margin;
      const legendY = height + 10;
      const legendSpacing = 120;

      // Existing boxes legend
      svg.append('rect')
        .attr('class', 'young-box')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', 20)
        .attr('height', 20);

      svg.append('text')
        .attr('x', legendX + 30)
        .attr('y', legendY + 15)
        .text('Existing');

      // New boxes legend
      svg.append('rect')
        .attr('class', 'young-box-new')
        .attr('x', legendX + legendSpacing)
        .attr('y', legendY)
        .attr('width', 20)
        .attr('height', 20);

      svg.append('text')
        .attr('x', legendX + legendSpacing + 30)
        .attr('y', legendY + 15)
        .text('New');

      // Removed boxes legend
      svg.append('rect')
        .attr('class', 'young-box-removed')
        .attr('x', legendX + legendSpacing * 2)
        .attr('y', legendY)
        .attr('width', 20)
        .attr('height', 20);

      svg.append('text')
        .attr('x', legendX + legendSpacing * 2 + 30)
        .attr('y', legendY + 15)
        .text('Removed');

      // Adjust SVG height to accommodate legend
      svg.attr('height', height + 40);
    }
  }

  // Function to calculate log factorial: log(n!)
  function logFactorial(n) {
    if (n <= 1) return 0;

    let logResult = 0;
    for (let i = 1; i <= n; i++) {
      logResult += Math.log(i);
    }
    return logResult;
  }

  // Function to calculate c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n)
  function calculateCLambda(dimension, n) {
    // For all n values, use logarithmic calculations to avoid overflow
    // Convert dimension to string to handle very large numbers
    const dimensionStr = dimension.toString();

    // For very large numbers (scientific notation with e+), extract the exponent
    let logDimension;
    if (dimensionStr.includes('e+')) {
      const parts = dimensionStr.split('e+');
      const mantissa = parseFloat(parts[0]);
      const exponent = parseInt(parts[1]);
      logDimension = Math.log(mantissa) + exponent * Math.log(10);
    } else {
      // For regular numbers, just take the log
      logDimension = Math.log(dimension);
    }

    // Calculate log(n!)
    const logNFactorial = logFactorial(n);

    // logSqrtFactorial = log(sqrt(n!)) = log(n!)/2
    const logSqrtFactorial = logNFactorial / 2;

    // c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n) = -(log(f^lambda) - log(sqrt(n!)))/sqrt(n)
    return -(logDimension - logSqrtFactorial) / Math.sqrt(n);
  }

  // Function to update the display with information for a given size n
  function updateDisplay(n) {
    const data = partitionData[n];

    if (data) {
      // Update partition display
      document.getElementById('partition-display').textContent = `[${data.partition.join(', ')}]`;

      // Format dimension with commas for readability
      const formattedDimension = data.dimension.toLocaleString();
      document.getElementById('dimension-display').textContent = formattedDimension;

      // Format dimension in scientific notation with LaTeX formatting
      let scientificNotation;
      if (data.dimension >= 1e10) { // Only use scientific notation for large numbers
        const exponent = Math.floor(Math.log10(data.dimension));
        const mantissa = data.dimension / Math.pow(10, exponent);
        scientificNotation = `${mantissa.toFixed(2)} * 10^{${exponent}}`;
      } else {
        scientificNotation = data.dimension.toString();
      }
      document.getElementById('scientific-display').innerHTML = scientificNotation;

      // Calculate and display c(lambda)
      const cLambda = calculateCLambda(data.dimension, n);
      document.getElementById('c-lambda-display').textContent = cLambda.toFixed(6);

      // Draw the Young diagram with the current n value
      drawYoungDiagram(data.partition, n);
    } else {
      document.getElementById('partition-display').textContent = 'Not available';
      document.getElementById('dimension-display').textContent = 'Not available';
      document.getElementById('scientific-display').textContent = 'Not available';
      document.getElementById('c-lambda-display').textContent = 'Not available';
      document.getElementById('young-diagram-container').innerHTML = '<p>Data not available for this size.</p>';
    }
  }

  // Add event listeners for the input field and control buttons
  document.addEventListener('DOMContentLoaded', function() {
    const inputElement = document.getElementById('size-n');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');

    // Initialize with default value
    updateDisplay(parseInt(inputElement.value));

    // Add event listener for input changes
    inputElement.addEventListener('input', function() {
      const n = parseInt(this.value);
      if (n >= 1 && n <= 116) {
        updateDisplay(n);
      }
    });

    // Add event listener for increment button
    incrementBtn.addEventListener('click', function() {
      const currentValue = parseInt(inputElement.value) || 0;
      const maxValue = parseInt(inputElement.max) || 116;

      if (currentValue < maxValue) {
        inputElement.value = currentValue + 1;
        updateDisplay(currentValue + 1);
      }
    });

    // Add event listener for decrement button
    decrementBtn.addEventListener('click', function() {
      const currentValue = parseInt(inputElement.value) || 0;
      const minValue = parseInt(inputElement.min) || 1;

      if (currentValue > minValue) {
        inputElement.value = currentValue - 1;
        updateDisplay(currentValue - 1);
      }
    });
  });

  // Handle window resize
  window.addEventListener('resize', function() {
    const inputElement = document.getElementById('size-n');
    updateDisplay(parseInt(inputElement.value));
  });
</script>
