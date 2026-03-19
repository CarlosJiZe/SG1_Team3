// ============================================================
//  GreenGrid Dashboard — charts-duck.js
//  Duck curve, Paradox duck, Paradox clock, Battery SoC
// ============================================================

// ─── Duck curve (main section — hidden placeholder in HTML) ─────────────────
function initDuckCurve() {
  if (!document.querySelector("#duckCurve")) return
}

function wireScenarioToggle() {
  const scenarioMap = { no_solar: null, bad_design: "unadvised", optimized: "well_designed" }
  d3.selectAll(".scenario-btn[data-scenario]").on("click", function() {
    const btnScenario = this.getAttribute("data-scenario")
    const jsonKey = scenarioMap[btnScenario]
    d3.selectAll(".scenario-btn[data-scenario]").classed("active", false)
    d3.select(this).classed("active", true)
    d3.select("#duckCurve").selectAll("*").remove()
    if (!jsonKey) { renderNoSolarDuck(); return }
    state.currentDuckScenario = jsonKey
    drawDuckCurve(state.allData.duckData[jsonKey])
  })
}

function applyDuckLineFilter(value) {
  const svg = d3.select("#duckCurve svg g")
  if (svg.empty()) return
  svg.selectAll(".duck-load").transition().duration(300).attr("opacity", value==="all"||value==="load" ? 1 : 0)
  svg.selectAll(".duck-solar").transition().duration(300).attr("opacity", value==="all"||value==="solar" ? 1 : 0)
  svg.selectAll(".duck-net").transition().duration(300).attr("opacity", value==="all"||value==="net" ? 1 : 0)
}

function updateDuckDropdown(scenario) {
  const sel = document.getElementById("duckLineDropdown")
  if (!sel) return
  sel.innerHTML = scenario==="no_solar"
    ? `<option value="all">All Lines</option><option value="load">Grid Load</option>`
    : `<option value="all">All Lines</option><option value="load">Load</option><option value="solar">Solar Generation</option><option value="net">Net Load (Duck)</option>`
  sel.value = "all"
}

function renderNoSolarDuck() {
  const data = state.allData.duckData["well_designed"]
  d3.select("#duckCurve").selectAll("*").remove()
  const container = document.querySelector("#duckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top:60, right:180, bottom:50, left:70 }
  const width  = totalW - margin.left - margin.right, height = 380

  const svgEl = d3.select("#duckCurve").append("svg")
    .attr("width", width+margin.left+margin.right).attr("height", height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28)
    .attr("text-anchor","middle").style("font-size","15px").style("font-weight","600")
    .style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text("Daily Load Profile — No Solar")

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.avg_load_kw)*1.2]).range([height,0])
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${d.toFixed(1)} kW`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+48).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-52).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Power (kW)")
  updateDuckDropdown("no_solar")
  const line = d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  const area = d3.area().x(d=>x(d.hour)).y0(height).y1(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  svg.append("path").datum(data).attr("class","duck-load").attr("fill","#fce4e4").attr("opacity",0.6).attr("d",area)
  const lp = svg.append("path").datum(data).attr("class","duck-load").attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("d",line)
  animatePath(lp, 0)
  svg.selectAll(".hover-bar").data(data).enter().append("rect").attr("class","hover-bar")
    .attr("x",d=>x(d.hour)-width/24/2).attr("y",0).attr("width",width/24).attr("height",height).attr("fill","transparent")
    .on("mouseover",(event,d)=>showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br><em style="color:#aaa">No solar — 100% grid</em>`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
  const lgD = svg.append("g").attr("transform",`translate(${width+8},0)`)
  lgD.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke","#e53935").attr("stroke-width",2.5)
  lgD.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text("Grid Load")
  const sn = document.getElementById("duck-source-note")
  if (sn) sn.textContent = "360-day aggregated avg · no_solar scenario"
}

function drawDuckCurve(data) {
  d3.select("#duckCurve").selectAll("*").remove()
  updateDuckDropdown("solar")
  const container = document.querySelector("#duckCurve")
  const totalW = container ? container.clientWidth - 80 : 720
  const margin = { top:60, right:180, bottom:50, left:70 }
  const width  = totalW - margin.left - margin.right, height = 380

  const svgEl = d3.select("#duckCurve").append("svg")
    .attr("width", width+margin.left+margin.right).attr("height", height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const duckTitle = state.currentDuckScenario==="unadvised" ? "Duck Curve — Unadvised Solar System" : "Duck Curve — Well Designed Solar System"
  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28).attr("text-anchor","middle").style("font-size","15px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text(duckTitle)

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const yMin = d3.min(data,d=>d.avg_net_load_kw)
  const yMax = d3.max(data,d=>Math.max(d.avg_load_kw,d.avg_solar_kw))
  const y = d3.scaleLinear().domain([yMin*1.15, yMax*1.1]).range([height,0])

  svg.append("line").attr("x1",0).attr("x2",width).attr("y1",y(0)).attr("y2",y(0)).attr("stroke","#ccc").attr("stroke-dasharray","4,3")
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${d.toFixed(1)} kW`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+48).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-54).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Power (kW)")

  // Surplus fill
  const surplusPoints = []
  for (let i=0;i<data.length;i++) {
    const cur=data[i], prev=data[i-1], next=data[i+1]
    if (prev&&prev.avg_net_load_kw>=0&&cur.avg_net_load_kw<0) {
      const t=prev.avg_net_load_kw/(prev.avg_net_load_kw-cur.avg_net_load_kw)
      surplusPoints.push({hour:prev.hour+t*(cur.hour-prev.hour),avg_net_load_kw:0})
    }
    if (cur.avg_net_load_kw<0) surplusPoints.push(cur)
    if (next&&cur.avg_net_load_kw<0&&next.avg_net_load_kw>=0) {
      const t=cur.avg_net_load_kw/(cur.avg_net_load_kw-next.avg_net_load_kw)
      surplusPoints.push({hour:cur.hour+t*(next.hour-cur.hour),avg_net_load_kw:0})
    }
  }
  svg.append("path").datum(surplusPoints).attr("class","duck-net duck-solar").attr("fill","#c8f0d8").attr("opacity",0.6)
    .attr("d",d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(d.avg_net_load_kw)).curve(d3.curveLinear))
  svg.append("path").datum(data).attr("class","duck-net").attr("fill","#fce4e4").attr("opacity",0.4)
    .attr("d",d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(Math.max(0,d.avg_net_load_kw))).curve(d3.curveMonotoneX))

  const netPath  = svg.append("path").datum(data).attr("class","duck-net").attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("stroke-dasharray","6,3").attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_net_load_kw)).curve(d3.curveMonotoneX))
  const loadPath = svg.append("path").datum(data).attr("class","duck-load").attr("fill","none").attr("stroke","#37474f").attr("stroke-width",2.5).attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX))
  const solarPath= svg.append("path").datum(data).attr("class","duck-solar").attr("fill","none").attr("stroke","#fbc02d").attr("stroke-width",2.5).attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_solar_kw)).curve(d3.curveMonotoneX))
  animatePath(netPath,0); animatePath(loadPath,300); animatePath(solarPath,600)

  svg.selectAll(".hover-bar").data(data).enter().append("rect").attr("class","hover-bar")
    .attr("x",d=>x(d.hour)-width/24/2).attr("y",0).attr("width",width/24).attr("height",height).attr("fill","transparent")
    .on("mouseover",(event,d)=>showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br>Solar: ${fmtKw(d.avg_solar_kw)}<br>Net Load: ${fmtKw(d.avg_net_load_kw)}<br>Battery SoC: ${fmt(d.avg_battery_soc)}%`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)

  const sn4 = document.getElementById("duck-source-note")
  if (sn4) sn4.textContent = `360-day aggregated avg · ${state.currentDuckScenario} scenario`
  ;[{color:"#37474f",label:"Load",dash:null},{color:"#fbc02d",label:"Solar",dash:null},{color:"#e53935",label:"Net Load",dash:"6,3"}]
    .forEach((item,i)=>{
      const g = svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
      g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",item.color).attr("stroke-width",2.5).attr("stroke-dasharray",item.dash||"none")
      g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(item.label)
    })
}

// ─── Paradox duck (independent copy) ────────────────────────────────────────
function initParadoxDuck() {
  if (!document.getElementById("paradoxDuckDropdown")) {
    const toggle = document.querySelector("#paradoxToggle")
    const dropWrapper = document.createElement("div")
    dropWrapper.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:16px;"
    dropWrapper.innerHTML = `
      <label style="font-size:13px;color:#4a6358;font-family:Poppins,sans-serif;font-weight:600;">Show:</label>
      <select id="paradoxDuckDropdown" style="font-family:Poppins,sans-serif;font-size:13px;padding:6px 14px;border-radius:20px;border:1.5px solid #2c7a55;color:#1e2b24;background:#fff;cursor:pointer;outline:none;">
        <option value="all">All Lines</option><option value="load">Grid Load</option>
      </select>`
    toggle.appendChild(dropWrapper)
    document.getElementById("paradoxDuckDropdown").addEventListener("change", function() {
      applyParadoxLineFilter(this.value)
    })
  }
  document.querySelectorAll("#paradoxToggle .scenario-btn").forEach(btn=>{
    btn.addEventListener("click", function() {
      document.querySelectorAll("#paradoxToggle .scenario-btn").forEach(b=>b.classList.remove("active"))
      this.classList.add("active")
      state.paradoxScenario = this.getAttribute("data-pscenario")
      updateParadoxDropdown()
      if (state.paradoxScenario==="no_solar") renderParadoxNoSolar()
      else renderParadoxDuck(state.allData.duckData[state.paradoxScenario==="bad_design" ? "unadvised" : "well_designed"])
    })
  })
  renderParadoxNoSolar()
}

function updateParadoxDropdown() {
  const sel = document.getElementById("paradoxDuckDropdown")
  if (!sel) return
  sel.innerHTML = state.paradoxScenario==="no_solar"
    ? `<option value="all">All Lines</option><option value="load">Grid Load</option>`
    : `<option value="all">All Lines</option><option value="load">Load</option><option value="solar">Solar Generation</option><option value="net">Net Load (Duck)</option>`
  sel.value = "all"
}

function applyParadoxLineFilter(value) {
  const svg = d3.select("#paradoxDuckCurve svg g")
  if (svg.empty()) return
  svg.selectAll(".pduck-load").transition().duration(300).attr("opacity", value==="all"||value==="load" ? 1 : 0)
  svg.selectAll(".pduck-solar").transition().duration(300).attr("opacity", value==="all"||value==="solar" ? 1 : 0)
  svg.selectAll(".pduck-net").transition().duration(300).attr("opacity", value==="all"||value==="net" ? 1 : 0)
}

function renderParadoxNoSolar() {
  const data = state.allData.duckData["well_designed"]
  d3.select("#paradoxDuckCurve").selectAll("*").remove()
  const container = document.querySelector("#paradoxDuckCurve")
  const totalW = container ? container.clientWidth-80 : 720
  const margin = {top:60,right:180,bottom:50,left:70}
  const width  = totalW-margin.left-margin.right, height = 380

  const svgEl = d3.select("#paradoxDuckCurve").append("svg").attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)
  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28).attr("text-anchor","middle").style("font-size","15px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text("Daily Load Profile — No Solar")

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.avg_load_kw)*1.2]).range([height,0])
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${d.toFixed(1)} kW`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+48).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-52).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Power (kW)")

  const line = d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  const area = d3.area().x(d=>x(d.hour)).y0(height).y1(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX)
  svg.append("path").datum(data).attr("class","pduck-load").attr("fill","#fce4e4").attr("opacity",0.6).attr("d",area)
  const lp = svg.append("path").datum(data).attr("class","pduck-load").attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("d",line)
  animatePath(lp,0)
  svg.selectAll(".hover-bar").data(data).enter().append("rect").attr("class","hover-bar").attr("x",d=>x(d.hour)-width/24/2).attr("y",0).attr("width",width/24).attr("height",height).attr("fill","transparent")
    .on("mouseover",(event,d)=>showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br><em style="color:#aaa">No solar — 100% grid</em>`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
  const lg = svg.append("g").attr("transform",`translate(${width+8},0)`)
  lg.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke","#e53935").attr("stroke-width",2.5)
  lg.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text("Grid Load")

  const numDays = getNumDays()
  const sn = document.getElementById("paradox-source-note")
  if (sn) sn.textContent = `Each point is the average power (kW) at that hour, computed across ${numDays} simulated days · no_solar scenario`
}

function renderParadoxDuck(data) {
  d3.select("#paradoxDuckCurve").selectAll("*").remove()
  const container = document.querySelector("#paradoxDuckCurve")
  const totalW = container ? container.clientWidth-80 : 720
  const margin = {top:60,right:180,bottom:50,left:70}
  const width  = totalW-margin.left-margin.right, height = 380

  const svgEl = d3.select("#paradoxDuckCurve").append("svg").attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)
  const titleLabel = state.paradoxScenario==="bad_design" ? "Duck Curve — Unadvised Solar System" : "Duck Curve — Well Designed Solar System"
  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28).attr("text-anchor","middle").style("font-size","15px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text(titleLabel)

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const yMin = d3.min(data,d=>d.avg_net_load_kw)
  const yMax = d3.max(data,d=>Math.max(d.avg_load_kw,d.avg_solar_kw))
  const y = d3.scaleLinear().domain([yMin*1.15,yMax*1.1]).range([height,0])

  svg.append("line").attr("x1",0).attr("x2",width).attr("y1",y(0)).attr("y2",y(0)).attr("stroke","#ccc").attr("stroke-dasharray","4,3")
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${d.toFixed(1)} kW`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+48).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-54).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Power (kW)")

  const surplusPoints = []
  for (let i=0;i<data.length;i++) {
    const cur=data[i],prev=data[i-1],next=data[i+1]
    if (prev&&prev.avg_net_load_kw>=0&&cur.avg_net_load_kw<0) { const t=prev.avg_net_load_kw/(prev.avg_net_load_kw-cur.avg_net_load_kw); surplusPoints.push({hour:prev.hour+t*(cur.hour-prev.hour),avg_net_load_kw:0}) }
    if (cur.avg_net_load_kw<0) surplusPoints.push(cur)
    if (next&&cur.avg_net_load_kw<0&&next.avg_net_load_kw>=0) { const t=cur.avg_net_load_kw/(cur.avg_net_load_kw-next.avg_net_load_kw); surplusPoints.push({hour:cur.hour+t*(next.hour-cur.hour),avg_net_load_kw:0}) }
  }
  svg.append("path").datum(surplusPoints).attr("class","pduck-net pduck-solar").attr("fill","#c8f0d8").attr("opacity",0.6)
    .attr("d",d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(d.avg_net_load_kw)).curve(d3.curveLinear))
  svg.append("path").datum(data).attr("class","pduck-net").attr("fill","#fce4e4").attr("opacity",0.4)
    .attr("d",d3.area().x(d=>x(d.hour)).y0(y(0)).y1(d=>y(Math.max(0,d.avg_net_load_kw))).curve(d3.curveMonotoneX))

  const netP  = svg.append("path").datum(data).attr("class","pduck-net").attr("fill","none").attr("stroke","#e53935").attr("stroke-width",2.5).attr("stroke-dasharray","6,3").attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_net_load_kw)).curve(d3.curveMonotoneX))
  const loadP = svg.append("path").datum(data).attr("class","pduck-load").attr("fill","none").attr("stroke","#37474f").attr("stroke-width",2.5).attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_load_kw)).curve(d3.curveMonotoneX))
  const solarP= svg.append("path").datum(data).attr("class","pduck-solar").attr("fill","none").attr("stroke","#fbc02d").attr("stroke-width",2.5).attr("d",d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_solar_kw)).curve(d3.curveMonotoneX))
  animatePath(netP,0); animatePath(loadP,300); animatePath(solarP,600)

  svg.selectAll(".hover-bar").data(data).enter().append("rect").attr("class","hover-bar").attr("x",d=>x(d.hour)-width/24/2).attr("y",0).attr("width",width/24).attr("height",height).attr("fill","transparent")
    .on("mouseover",(event,d)=>showTooltip(`<strong>Hour ${d.hour}:00</strong><br>Load: ${fmtKw(d.avg_load_kw)}<br>Solar: ${fmtKw(d.avg_solar_kw)}<br>Net Load: ${fmtKw(d.avg_net_load_kw)}`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)

  ;[{color:"#37474f",label:"Load",dash:null},{color:"#fbc02d",label:"Solar",dash:null},{color:"#e53935",label:"Net Load",dash:"6,3"}].forEach((item,i)=>{
    const g=svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",item.color).attr("stroke-width",2.5).attr("stroke-dasharray",item.dash||"none")
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(item.label)
  })

  const numDays = getNumDays()
  const scenLabel = state.paradoxScenario==="bad_design" ? "unadvised" : state.paradoxScenario==="optimized" ? "well_designed" : "no_solar"
  const sn = document.getElementById("paradox-source-note")
  if (sn) sn.textContent = `Each point is the average power (kW) at that hour, computed across ${numDays} simulated days · ${scenLabel} scenario`
}

// ─── Paradox clock ───────────────────────────────────────────────────────────
function initParadoxClock() {
  const data = state.allData.duckData["well_designed"]
  if (!data) return
  const peakSolarHour = data.reduce((max,d)=>d.avg_solar_kw>max.avg_solar_kw?d:max,data[0]).hour
  const peakLoadHour  = data.reduce((max,d)=>d.avg_load_kw>max.avg_load_kw?d:max,data[0]).hour
  const gapHours      = Math.abs(peakLoadHour-peakSolarHour)
  const twenty4 = d3.scaleLinear().domain([0,24]).range([0,360])
  const rad = Math.PI/180
  const clockRadius=160, margin2=50
  const w=(clockRadius+margin2)*2, h=(clockRadius+margin2)*2+64
  const cx=w/2, cy=clockRadius+margin2
  const innerLabelR=clockRadius-30, needleLen=-(clockRadius-68)

  const svg = d3.select("#paradoxClock").append("svg").attr("width",w).attr("height",h)
  const face = svg.append("g").attr("transform",`translate(${cx},${cy})`)

  face.append("circle").attr("r",clockRadius).attr("fill","#fff").attr("stroke","#dde8e2").attr("stroke-width",2)
  face.append("path")
    .attr("d",d3.arc().innerRadius(0).outerRadius(clockRadius-4).startAngle(twenty4(peakSolarHour)*rad).endAngle(twenty4(peakLoadHour)*rad)())
    .attr("fill","#fff9c4").attr("opacity",0.85)

  face.selectAll(".hour-tick").data(d3.range(0,24)).enter().append("line").attr("class","hour-tick")
    .attr("x1",0).attr("x2",0).attr("y1",clockRadius).attr("y2",d=>d%6===0?clockRadius-14:clockRadius-7)
    .attr("stroke",d=>d%6===0?"#4a6358":"#b0c8c0").attr("stroke-width",d=>d%6===0?2:1)
    .attr("transform",d=>`rotate(${twenty4(d)})`)

  face.selectAll(".inner-num").data(d3.range(0,24)).enter().append("text").attr("class","inner-num")
    .attr("text-anchor","middle")
    .attr("x",d=>innerLabelR*Math.sin(twenty4(d)*rad))
    .attr("y",d=>-innerLabelR*Math.cos(twenty4(d)*rad)+4)
    .style("font-size",d=>d%6===0?"12px":"9px").style("font-weight",d=>d%6===0?"700":"400")
    .style("fill",d=>d%6===0?"#2c7a55":"#9ab0a8").style("font-family","Poppins,sans-serif")
    .text(d=>`${d}h`)

  face.append("circle").attr("r",7).attr("fill","#1e2b24")
  face.append("text").attr("x",-38).attr("y",-18).attr("text-anchor","middle").style("font-size","30px").style("font-weight","800").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text(`${gapHours}h`)
  face.append("text").attr("x",-38).attr("y",12).attr("text-anchor","middle").style("font-size","11px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("gap")

  function drawNeedle(hour,color,animDelay) {
    const deg=twenty4(hour)
    const needle = face.append("line").attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",0).attr("stroke",color).attr("stroke-width",3.5).attr("stroke-linecap","round").attr("transform","rotate(0)")
    const dot    = face.append("circle").attr("cx",0).attr("cy",0).attr("r",9).attr("fill",color).attr("stroke","#fff").attr("stroke-width",2).attr("transform","rotate(0)")
    needle.transition().delay(animDelay).duration(900).ease(d3.easeElastic.period(0.5)).attr("y2",needleLen).attr("transform",`rotate(${deg})`)
    dot.transition().delay(animDelay).duration(900).ease(d3.easeElastic.period(0.5)).attr("cy",needleLen).attr("transform",`rotate(${deg})`)
  }

  const legendY=cy+clockRadius+38, itemW=160, startX=cx-itemW
  ;[{color:"#fbc02d",label:`Solar peak  ${peakSolarHour}:00h`},{color:"#e53935",label:`Demand peak  ${peakLoadHour}:00h`}]
    .forEach(({color,label},i)=>{
      const lx=startX+i*itemW
      svg.append("circle").attr("cx",lx+7).attr("cy",legendY).attr("r",7).attr("fill",color)
      svg.append("text").attr("x",lx+20).attr("y",legendY).attr("dominant-baseline","middle").style("font-size","12px").style("font-weight","600").style("fill","#4a6358").style("font-family","Poppins,sans-serif").text(label)
    })

  let animated = false
  const observer = new IntersectionObserver(entries=>{
    if (entries[0].isIntersecting && !animated) {
      animated = true
      drawNeedle(peakSolarHour,"#fbc02d",0)
      drawNeedle(peakLoadHour,"#e53935",400)
    }
  },{threshold:0.4})
  observer.observe(document.getElementById("paradoxClock"))
}

// ─── Battery SoC ────────────────────────────────────────────────────────────
function initBatterySocChart() {
  if (!document.querySelector("#batterySocChart")) return
  drawBatterySocChart()
}

function drawBatterySocChart() {
  const container = document.querySelector("#batterySocChart")
  d3.select("#batterySocChart").selectAll("svg, .bsoc-legend").remove()
  const wd = state.allData.duckData["well_designed"]
  const uv = state.allData.duckData["unadvised"]
  const totalW = container.clientWidth-80||720
  const margin = {top:60,right:160,bottom:55,left:70}
  const width = totalW-margin.left-margin.right, height = 300

  const svgEl = d3.select("#batterySocChart").append("svg").attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
  const svg = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  svgEl.append("text").attr("x",margin.left+width/2).attr("y",28).attr("text-anchor","middle").style("font-size","15px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text("Battery State of Charge Throughout the Day")

  const x = d3.scaleLinear().domain([0,23]).range([0,width])
  const y = d3.scaleLinear().domain([0,100]).range([height,0])

  svg.append("rect").attr("x",x(7)).attr("y",0).attr("width",x(17)-x(7)).attr("height",height).attr("fill","#fffde7").attr("opacity",0.5)
  svg.append("text").attr("x",x(12)).attr("y",-10).attr("text-anchor","middle").style("font-size","10px").style("fill","#f9a825").style("font-family","Poppins,sans-serif").text("☀ Solar charging")
  svg.append("rect").attr("x",x(18)).attr("y",0).attr("width",x(20)-x(18)).attr("height",height).attr("fill","#fce4e4").attr("opacity",0.6)
  svg.append("text").attr("x",x(19)).attr("y",-10).attr("text-anchor","middle").style("font-size","10px").style("fill","#e53935").style("font-family","Poppins,sans-serif").text("⚡ Peak demand")

  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(h=>`${h}h`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d=>`${d}%`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+46).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").text("Time of Day")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-54).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").text("Battery SoC (%)")

  const area = d3.area().x(d=>x(d.hour)).y0(height).y1(d=>y(d.avg_battery_soc)).curve(d3.curveMonotoneX)
  const line = d3.line().x(d=>x(d.hour)).y(d=>y(d.avg_battery_soc)).curve(d3.curveMonotoneX)
  svg.append("path").datum(wd).attr("fill","#2c7a55").attr("opacity",0.1).attr("d",area)
  svg.append("path").datum(uv).attr("fill","#e57373").attr("opacity",0.1).attr("d",area)
  const wdPath = svg.append("path").datum(wd).attr("fill","none").attr("stroke","#2c7a55").attr("stroke-width",3).attr("d",line)
  const uvPath = svg.append("path").datum(uv).attr("fill","none").attr("stroke","#e57373").attr("stroke-width",3).attr("d",line)
  animatePath(wdPath,0); animatePath(uvPath,400)

  const wdAt18=wd.find(d=>d.hour===18), uvAt18=uv.find(d=>d.hour===18)
  ;[{d:wdAt18,c:"#2c7a55",dy:-14},{d:uvAt18,c:"#e57373",dy:-16}].forEach(({d,c,dy})=>{
    svg.append("circle").attr("cx",x(d.hour)).attr("cy",y(d.avg_battery_soc)).attr("r",5).attr("fill",c).attr("stroke","white").attr("stroke-width",2).style("opacity",0).transition().delay(1200).duration(300).style("opacity",1)
    svg.append("text").attr("x",x(d.hour)+8).attr("y",y(d.avg_battery_soc)+dy).style("font-size","11px").style("font-weight","700").style("fill",c).style("font-family","Poppins,sans-serif").text(`${fmt(d.avg_battery_soc,0)}%`).style("opacity",0).transition().delay(1200).duration(300).style("opacity",1)
  })

  const crossV = svg.append("line").attr("y1",0).attr("y2",height).attr("stroke","#999").attr("stroke-width",1).attr("stroke-dasharray","3,3").style("opacity",0)
  svg.append("rect").attr("width",width).attr("height",height).attr("fill","transparent")
    .on("mousemove",function(event){
      const hour = Math.round(x.invert(d3.pointer(event)[0]))
      if (hour<0||hour>23) return
      const w=wd.find(d=>d.hour===hour), u=uv.find(d=>d.hour===hour)
      if (!w||!u) return
      crossV.attr("x1",x(hour)).attr("x2",x(hour)).style("opacity",1)
      showTooltip(`<strong>${hour}:00h</strong><br><span style="color:#2c7a55">●</span> Well Designed: <strong>${fmt(w.avg_battery_soc,1)}%</strong><br><span style="color:#e57373">●</span> Unadvised: <strong>${fmt(u.avg_battery_soc,1)}%</strong><br><span style="color:#999;font-size:11px">Δ ${fmt(w.avg_battery_soc-u.avg_battery_soc,1)} pp</span>`)
      moveTooltip(event)
    })
    .on("mouseout",()=>{crossV.style("opacity",0);hideTooltip()})

  ;[{label:"Well Designed",color:"#2c7a55",i:0},{label:"Unadvised",color:"#e57373",i:1}].forEach(({label,color,i})=>{
    const g=svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",color).attr("stroke-width",2.5)
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(label)
  })
}
