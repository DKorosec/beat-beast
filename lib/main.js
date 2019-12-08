/*
12 Hour game jam @ Inova IT on December 6-th.

The code is horrible. Because of the time limit. But hey. It works :^)
*/
const MAX_LIFE = 100;
const MAX_RETRY = 5;
const MAX_AURA = 60 * 2;
const G = {
  OPEN_GAME: false,
  TOTAL_SCORE: 0,
  PROTECTION_AURA_CNT: MAX_AURA,
  IS_DEAD: false,
  LIFE: MAX_LIFE,
  LIFE_CNT: MAX_RETRY,
  addScore(a) {
    if (!G.IS_DEAD) {
      G.TOTAL_SCORE += a;
      if (G.TOTAL_SCORE % 100 === 0) {
        const buzz = ['great,', 'good job,', 'keep it going,', 'how do you do it,', 'insane,', 'keep them coming,']
        const rpf = buzz[Math.floor(Math.random() * buzz.length)]
        G.SPEAK_STR(`${rpf} ${G.TOTAL_SCORE} POINTS`);
      }
    }
  },
  addHP() {
    if (G.IS_DEAD) return;
    this.LIFE = MAX_LIFE;
    this.LIFE_CNT = Math.min(G.LIFE_CNT + 1, MAX_RETRY);
    G.SPEAK_STR('Health pack pickup.');
  },
  decAura(a) {
    G.PROTECTION_AURA_CNT -= a;
    if (G.PROTECTION_AURA_CNT < 0) G.PROTECTION_AURA_CNT = 0;
  },
  addLife(a) {
    if (this.IS_DEAD) {
      return;
    }
    const remove = a < 0;
    if (remove && G.PROTECTION_AURA_CNT > 0) {
      return;
    }
    G.LIFE += a;
    if (G.LIFE > MAX_LIFE) G.LIFE = MAX_LIFE;
    if (G.LIFE < 0) {
      G.LIFE = 0;
      --G.LIFE_CNT;
      if (G.LIFE_CNT > 0) {
        const shield_cnt = G.LIFE_CNT - 1;
        if (shield_cnt > 1) {
          G.SPEAK_STR(`${shield_cnt} SHIELDS REMAINING!`);
        } else if (shield_cnt === 1) {
          G.SPEAK_STR(`1 SHIELD REMAINING!`);
        } else {
          G.SPEAK_STR(`THIS IS YOUR LAST CHANCE!`);
        }
        G.PROTECTION_AURA_CNT = MAX_AURA;
        G.LIFE = MAX_LIFE
      } else {
        G.SPEAK_STR(`YOU SUCK! But hey, at least you scored ${G.TOTAL_SCORE} points! Press R to restart.`);
        G.IS_DEAD = true;
        G.LIFE_CNT = 0;
      }
    }
  },
  getAuraP() {
    return G.PROTECTION_AURA_CNT / MAX_AURA;
  },
  hasAura() {
    return G.getAuraP() > 0;
  },
  getLifeP() {
    return G.LIFE / MAX_LIFE;
  },
  can: null,
  ctx: null,
  beatPower: 0,
  SPEAK_STR(text) {
    const utterThis = new SpeechSynthesisUtterance(text);
    const synth = window.speechSynthesis;
    utterThis.volume = 1;
    utterThis.pitch = sound.playbackRate;
    utterThis.rate = sound.playbackRate;
    synth.speak(utterThis);
  },
};



function RESET() {
  G.beatPower = 0;
  G.OPEN_GAME = true
  G.TOTAL_SCORE = 0
  G.PROTECTION_AURA_CNT = MAX_AURA
  G.IS_DEAD = false
  G.LIFE = MAX_LIFE
  G.LIFE_CNT = MAX_RETRY
  G.spawner = {
    body: null,
    x: G.w / 2,
    y: G.h / 2,
    dira: Math.PI / 2,
  };
  World.clear(engine.world);
  INIT_WORLD();
  sound.playMode('restart');
  sound.play();
  G.SPEAK_STR('Show me what you got!');
}

let Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Runner = Matter.Runner;
Composites = Matter.Composites;
let engine = null;
let render = null;
let runner = null;
let mouse = null;

window.onkeyup = function (event) {
  let key = event.key.toUpperCase();
  if (key == 'R') {
    RESET();
  } else {
    G.SPEAK_STR('Press R, to reset.');
  }
}


function preload() {
}

function initGame() {
  playbtn.textContent = 'loading...';
  playbtn.disabled = true;
  document.body.requestFullscreen().then(() => {
    sound = new p5.SoundFile(input_audio_file.files && input_audio_file.files[0] || `/sound/${songs_select.value}`, () => {
      gameplay.style.display = 'none'
      sound.amp(0.25);
      togglePlay();
      G.OPEN_GAME = true;
      if (!render.__running) {
        Render.run(render);
        render.__running = true;
      }
      G.SPEAK_STR('Show me what you got!');
    })
  })
}

function INIT_WORLD() {
  G.idx = 0;
  G.cntr = 0;

  G.LAST_KNOWN_X_Y_M = {
    x: 0,
    y: 0
  }
  const thick = 25;
  G.cursorThick = thick;
  G.cursorBody = Bodies.circle(0, 0, G.cursorThick / 2, {
    isStatic: true,
    render: {
      fillStyle: 'rgb(255,255,255)'
    }
  });
  G.cursorBody.__type = 'player';

  G.spawner.body = Bodies.circle(G.spawner.x, G.spawner.y, thick / 4, {
    isStatic: true, isSensor: true,
    render: {
      fillStyle: 'rgba(0,0,0,0)'
    }
  })
  G.spawner.body.__type = 'spawner';
  World.add(engine.world, [G.cursorBody, G.spawner.body]);
}

function handleEngineCollision(event){
    if(!G.OPEN_GAME || G.IS_DEAD) return;
    const wasprocessed = body => body.__delete;
    const isball = body => body.__type === 'ball';
    const isplayer = body => body.__type === 'player';
    const ishpball = body => isball(body) && body.__healthpack;
    const bodies = event.pairs.map(({bodyA,bodyB})=>[bodyA,bodyB])
    const collisions = bodies.filter(([a,b])=>(isball(a) && isplayer(b)) || (isball(b) && isplayer(a)));
    for(const [cola,colb] of collisions) {
        for(const a of [cola,colb]) {
            if(isball(a) && !wasprocessed(a)) {
                a.__delete = true;
                if(ishpball(a)){
                    G.addHP();
                } else G.addLife(-MAX_LIFE);
            }
        }
    }
}


function setup() {
  //document.body.requestFullscreen();
  engine = Engine.create()

  Matter.Events.on(engine, "collisionStart",handleEngineCollision);

  render = Render.create({
    engine: engine,
    options: {
      width: G.w,
      background: 'transparent',
      height: G.h
    },
    canvas: document.getElementById('canvas2')
  });
  render.options.wireframes = false
  G.spawner = {
    body: null,
    x: G.w / 2,
    y: G.h / 2,
    dira: Math.PI / 2,
  };
  G.canvasGAME = document.getElementById('canvas2');
  G.ctxGAME = G.canvasGAME.getContext('2d');
  mouse = Matter.Mouse.create(render.canvas);
  runner = Runner.create();
  //let cnv = createCanvas(100, 100);


  //cnv.mouseClicked(togglePlay);
  fft = new p5.FFT()
  fft.smoothing = 0.85;
  peakDetect = new p5.PeakDetect(undefined, undefined, 0.15, 1);


  engine.world.gravity.y = 0;
  INIT_WORLD();
  /*World.add(engine.world, [
    Bodies.rectangle(G.w / 2, thick / 2, G.w, thick, { isStatic: true }),
    Bodies.rectangle(G.w / 2, G.h - thick / 2, G.w, thick, { isStatic: true }),

    Bodies.rectangle(thick / 2, G.h / 2, thick, G.h, { isStatic: true }),
    Bodies.rectangle(G.w - thick / 2, G.h / 2, thick, G.h, { isStatic: true }),
    //Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
    //Bodies.rectangle(0, 300, 50, 600, { isStatic: true })
  ]);
  */
  //Engine.run(engine);
  //sound.setPitch(45);
}

//sound.setPitch -> slow motion to fast motion!


CanvasRenderingContext2D.prototype.thanosClr = function () {
  this.clearRect(0, 0, this.canvas.width, this.canvas.height);
}

CanvasRenderingContext2D.prototype.fillRectFULL = function () {
  this.fillRect(0, 0, this.canvas.width, this.canvas.height);
}

CanvasRenderingContext2D.prototype.linearGradientRender = function (cx, cy, r, t) {
  const g = this.createRadialGradient(cx, cy, r)
}



function draw() {
  if (!G.OPEN_GAME) {
    return;
  }
  ++G.cntr;
  Matter.Engine.update(engine, 1000 / 60);

  if (G.IS_DEAD) {
    mouse.position.x = G.LAST_KNOWN_X_Y_M.x;
    mouse.position.y = G.LAST_KNOWN_X_Y_M.y;
  }

  const mpx = mouse.position.x;
  const mpy = mouse.position.y;

  G.LAST_KNOWN_X_Y_M.x = mouse.position.x;
  G.LAST_KNOWN_X_Y_M.y = mouse.position.y;

  const dx = -G.spawner.x + mpx;
  const dy = -G.spawner.y + mpy;
  const n = (dx ** 2 + dy ** 2) ** 0.5;

  const maxDiagLen = ((G.w ** 2 + G.h ** 2) ** 0.5) / 2;
  const powerOfSound = Math.pow((n / maxDiagLen), 2);
  const normalPitch = 60;
  const minimalPitch = 50;
  const maxPitch = 70;

  let minVelocity = 5;
  let maxVelocity = 15;
  let nvelocityspeed = maxVelocity
  let rotationEverythingFactor = 1;
  let currentPitch = null;
  const MAX_PITCH_DIFF = Math.max(maxPitch - normalPitch, normalPitch - minimalPitch);
  if (n > maxDiagLen) {
    currentPitch = maxPitch;
    sound.setPitch(currentPitch);
  } else {
    rotationEverythingFactor = n / maxDiagLen;
    nvelocityspeed = minVelocity + (maxVelocity - minVelocity) * rotationEverythingFactor;
    currentPitch = maxPitch - (maxPitch - minimalPitch) * (1 - powerOfSound)
    sound.setPitch(currentPitch)
  }

  const pitchPDistance = Math.abs((normalPitch - currentPitch) / MAX_PITCH_DIFF);

  const ndx = dx / n;
  const ndy = dy / n;

  //dir vec spawnererja
  const [sdvx, sdvy] = [Math.cos(G.spawner.dira), Math.sin(G.spawner.dira)];
  //dx,dy vec  spawner na player
  //fking matter.js ko ma drugacni koordinatni sistem, 1 uro sn zgubo da sn ugotovo da ima Y os zrcaljeno. zato je - pri ndy. LOL FU LIFE
  const cross2d = ndx * sdvy + -ndy * sdvx;
  G.spawner.dira += -Math.sign(cross2d) * Math.PI / 180 * 0.5;
  //console.log(sdvx, sdvy, '|', dx, dy)
  G.spawner.x += sdvx * rotationEverythingFactor * 2.5;
  G.spawner.y += sdvy * rotationEverythingFactor * 2.5;
  G.idx += Math.PI / 180
  Body.setPosition(G.cursorBody, { x: mpx, y: mpy })
  Body.setPosition(G.spawner.body, { x: G.spawner.x, y: G.spawner.y })



  Body.setAngle(G.spawner.body, G.idx);
  background(0);

  const spectrum = fft.analyze(); // [0-255]
  peakDetect.update(fft);
  G.ctx.thanosClr();

  const spectNorm = spectrum.map(s => s / 255);
  const realSpectrLen = spectNorm.length / 2;

  const HP_P = 0.005;

  const bucketSize = 6;
  if (peakDetect.isDetected) {
    G.addScore(1);
    G.beatPower = peakDetect.penergy;

    //const rpb = 2 * Math.PI / fbw;
    for (let i = 0; i < bucketSize; i++) {
      const p = i / bucketSize * 2 * Math.PI;
      const [x, y] = [Math.cos(p + G.idx), Math.sin(p + G.idx)].map(v => v * nvelocityspeed);
      const isHealthPack = Math.random() <= HP_P;

      let ball = Bodies.circle(G.spawner.x, G.spawner.y, 10, {
        render: {
          fillStyle: isHealthPack ? 'rgb(0,255,0)' : 'rgb(255,255,255)',
          //strokeStyle: 'rgb(255,255,255)',
          //lineWidth: 3
        }
      });
      ball.__type = 'ball';
      ball.__healthpack = isHealthPack;

      ball.__velocitySpeed = nvelocityspeed;
      Matter.Body.setVelocity(ball, { x, y });
      World.add(engine.world, [ball]);
    }

  } else {
    G.beatPower *= 0.9;
  }


  //G.beatPower = 0;
  const P_GREEN = 0.15;
  const IN_P_GREEN = pitchPDistance <= P_GREEN;

  const INTERP_G = () => {
    const ACC = 1 - pitchPDistance;
    const T = 1 - P_GREEN;
    const MAX_HI = 255;
    const MAX_LO = 50;
    const MAX_HI_V = MAX_HI - MAX_LO;
    if (ACC <= T) {
      return ACC / T * MAX_LO;
    } else {
      return MAX_LO + ((ACC - T) / (1 - T)) * MAX_HI_V;
    }
  };

  const g = G.ctx.createRadialGradient(G.spawner.x, G.spawner.y, 0, G.spawner.x, G.spawner.y, G.w / 2);
  g.addColorStop(0, 'white');
  g.addColorStop(G.beatPower, `rgb(${Math.floor(255 * (pitchPDistance ** 2))},${Math.floor(INTERP_G())},${0})`);
  g.addColorStop(1, 'black');
  G.ctx.fillStyle = g;
  G.ctx.fillRect(0, 0, G.w, G.h);

  engine.world.bodies
    .filter(b => b.__type === 'ball')
    .forEach(b => {
      const f = Math.round(255 * b.speed / b.__velocitySpeed);
      if (f <= 35) {
        b.__delete = true;
      }
      b.render.fillStyle = b.__healthpack ? `rgb(${0},${Math.max(f, 80)},${0})` : `rgb(${f},${f},${f})`;
    });

  engine.world.bodies
    .filter(b =>
      b.__delete || b.position.x < -50 || b.position.y < -50 || b.position.x > G.w + 50 || b.position.y > G.h + 50)
    .forEach(e => {
      Matter.Composite.remove(engine.world, e)
    });

  
  if (!IN_P_GREEN) {
    G.addLife(-0.5);
  } else {
    G.addLife(2);
  }
  

  G.decAura(1);
  // do 12khz spektrum je zanimiv za rendat, ostalo je meeeh. Rendaj samo do zadnje signifikantne energije.
  let zeroI = realSpectrLen;
  for (let i = realSpectrLen / 4; i >= 0; i -= 2) {
    if (Math.abs(spectNorm[i]) >= 0.01) {
      zeroI = i;
      break;
    }
  }

  // nevem ce to fixa rendering bug, samo sem prevec zaspan da bi na to studiral. (ce ostane not v kodi je bil to fix, al pa sem pozabo ven dat)
  if (zeroI === 0) {
    zeroI = realSpectrLen;
  }

  G.ctx.save();
  G.ctx.translate(G.w / 2, G.h / 2);
  G.ctx.rotate(G.idx / 10); // malo rotiraj grafo okol centra da bo folk impressed. woow much woow.
  G.ctx.translate(-G.w / 2, -G.h / 2);


  for (const r of [-1, 1]) {
    G.ctx.beginPath();
    G.ctx.lineWidth = 3;
    //G.cntr = 0;
    for (let i = 0; i < realSpectrLen; i += 2) {
      const x = i / realSpectrLen * G.w;
      if (i === 0) {
        G.ctx.moveTo(x, G.h / 2 + G.h / 2 * spectNorm[(i + G.cntr) % zeroI] * r);
      }
      G.ctx.lineTo(x, G.h / 2 + G.h / 2 * spectNorm[(i + G.cntr) % zeroI] * r);
    }
    G.ctx.stroke();
  }

  G.ctx.restore();
  G.ctx.save();

  G.ctx.beginPath();
  G.ctx.arc(G.cursorBody.position.x, G.cursorBody.position.y, G.cursorThick + 12, 2 * Math.PI * (1 - G.getAuraP()), 2 * Math.PI);
  G.ctx.lineWidth = 5;
  G.ctx.strokeStyle = "white";
  G.ctx.stroke();


  G.ctx.beginPath();
  G.ctx.arc(G.cursorBody.position.x, G.cursorBody.position.y, G.cursorThick, 2 * Math.PI * (1 - G.getLifeP()) - G.idx, 2 * Math.PI - G.idx);
  G.ctx.lineWidth = 5;
  G.ctx.strokeStyle = "red";
  G.ctx.stroke();



  // -1 ker je zadi shield v bistvu tvoj raw hp.
  for (let i = 0; i < G.LIFE_CNT - 1; i++) {

    const vary = Math.PI / 180 * 5;

    const ppp = 2 * Math.PI / (MAX_RETRY - 1);

    G.ctx.beginPath();
    G.ctx.arc(G.cursorBody.position.x, G.cursorBody.position.y, G.cursorThick + 6, G.idx + ppp * i + vary, G.idx + ppp * (i + 1) - vary);
    G.ctx.lineWidth = 5;
    G.ctx.strokeStyle = "yellow";
    G.ctx.stroke();
  }


  G.ctx.font = '150px consolas';
  G.ctx.textAlign = "center";
  G.ctx.fillStyle = 'white';
  G.ctx.fillText(G.TOTAL_SCORE, G.spawner.body.position.x, G.spawner.body.position.y + 48);

  G.ctx.restore();
}

function togglePlay() {
  if (sound.isPlaying()) {
    sound.pause();
  } else {
    sound.loop();
  }
}

function main() {
  G.can = canvas;
  G.ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  G.w = canvas.width;
  G.h = canvas.height;
}

function reportWindowSize() {
  G.w = G.can.width = canvas2.width = window.innerWidth;
  G.h = G.can.height = canvas2.height = window.innerHeight
}

window.onresize = reportWindowSize;