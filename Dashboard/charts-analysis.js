// ============================================================
//  GreenGrid Dashboard — charts-analysis.js
//  Bullet charts, scatter, by-group, timeseries, mistake timeseries
// ============================================================

// ─── Bullet chart (cost) ─────────────────────────────────────────────────────
function initBulletChart() {
  const container = document.querySelector("#bulletChart")
  if (!container) return
  const scenarios = state.allData.overviewData.scenarios
  const ns = scenarios.find(s=>s.scenario==="no_solar")
  const uv = scenarios.find(s=>s.scenario==="unadvised")
  const wd = scenarios.find(s=>s.scenario==="well_designed")
  if (!ns||!uv||!wd) return

  const numH    = getNumHouses()
  const divisor = getSolutionDivisor()
  const data = [
    {label:"No Solar",      value:ns.total_net_cost/divisor},
    {label:"Unadvised",     value:uv.total_net_cost/divisor},
    {label:"Well Designed", value:wd.total_net_cost/divisor}
  ]
  const thr1 = 1000/divisor
  function barColor(v) { return v<0?"#2c7a55":v<=thr1?"#ffb74d":"#e57373" }

  const totalW = container.clientWidth-80
  const margin = {top:40,right:120,bottom:50,left:130}
  const width  = totalW-margin.left-margin.right
  const barH=42, gap=28, height=data.length*(barH+gap)-gap
  const minVal = Math.min((wd.total_net_cost/divisor)*1.3, -200/divisor)
  const maxVal = Math.max((ns.total_net_cost/divisor)*1.15, 200/divisor)
  const x = d3.scaleLinear().domain([minVal,maxVal]).range([0,width])

  const svg = d3.select("#bulletChart").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const numDays = getNumDays()
  const titleSuffix = state.solutionMode==="average" ? "Per Household Avg" : `All ${numH} Households`
  svg.append("text").attr("x",width/2).attr("y",-20).attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600").style("fill","#2c2c2c").style("font-family","Poppins,sans-serif")
    .text(`Net Cost over ${numDays} Days — ${titleSuffix}`)

  const ranges = [
    {x1:x(minVal),x2:x(0),    color:"#e8f5e9"},
    {x1:x(0),     x2:x(thr1), color:"#fff8e1"},
    {x1:x(thr1),  x2:x(maxVal),color:"#ffebee"}
  ]

  data.forEach((d,i)=>{
    const y=i*(barH+gap)
    ranges.forEach(r=>svg.append("rect").attr("x",r.x1).attr("y",y).attr("width",r.x2-r.x1).attr("height",barH).attr("fill",r.color).attr("rx",3))
    const barX=d.value>=0?x(0):x(d.value), barW=Math.abs(x(d.value)-x(0))
    svg.append("rect").attr("x",x(0)).attr("y",y+barH*0.2).attr("width",0).attr("height",barH*0.6)
      .attr("fill",barColor(d.value)).attr("rx",2)
      .transition().duration(700).delay(i*150).attr("x",barX).attr("width",barW)
    svg.append("text").attr("x",d.value>=0?x(d.value)+8:x(d.value)-8).attr("y",y+barH/2+5)
      .attr("text-anchor",d.value>=0?"start":"end")
      .style("font-size","13px").style("font-weight","600").style("fill",barColor(d.value)).style("font-family","Poppins,sans-serif").style("opacity",0)
      .transition().duration(400).delay(i*150+600).style("opacity",1)
      .text(d.value<0?`-$${fmt(Math.abs(d.value),0)}`:`$${fmt(d.value,0)}`)
    svg.append("text").attr("x",-10).attr("y",y+barH/2+5).attr("text-anchor","end")
      .style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(d.label)
  })

  svg.append("line").attr("x1",x(0)).attr("x2",x(0)).attr("y1",-8).attr("y2",height+8).attr("stroke","#333").attr("stroke-width",2).attr("stroke-dasharray","4,3")
  svg.append("text").attr("x",x(0)).attr("y",-12).attr("text-anchor","middle").style("font-size","10px").style("fill","#555").style("font-family","Poppins,sans-serif").text("break-even")
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(6).tickFormat(d=>`$${d3.format(",.0f")(d)}`)).selectAll("text").style("font-size","10px")
  svg.append("text").attr("x",width/2).attr("y",height+42).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").style("font-family","Poppins,sans-serif")
    .text(state.solutionMode==="average"?"Net Cost per Household (USD)":"Annual Net Cost (USD)")

  const leg = svg.append("g").attr("transform",`translate(${width+12},0)`)
  ;[{label:"Earns money",color:"#e8f5e9",tc:"#2c7a55"},{label:"Pays little",color:"#fff8e1",tc:"#f57f17"},{label:"High cost",color:"#ffebee",tc:"#c62828"}]
    .forEach((r,i)=>{
      leg.append("rect").attr("x",0).attr("y",i*22).attr("width",12).attr("height",12).attr("rx",2).attr("fill",r.color).attr("stroke","#ccc").attr("stroke-width",0.5)
      leg.append("text").attr("x",16).attr("y",i*22+10).style("font-size","11px").style("fill",r.tc).style("font-family","Poppins,sans-serif").text(r.label)
    })
}

// ─── Bullet chart (CO₂) ──────────────────────────────────────────────────────
function initCo2BulletChart() {
  const container = document.querySelector("#co2BulletChart")
  if (!container) return
  const scenarios = state.allData.overviewData.scenarios
  const ns = scenarios.find(s=>s.scenario==="no_solar")
  const uv = scenarios.find(s=>s.scenario==="unadvised")
  const wd = scenarios.find(s=>s.scenario==="well_designed")
  if (!ns||!uv||!wd) return

  const numH    = getNumHouses()
  const divisor = getSolutionDivisor()
  const nsE = ns.co2_baseline_kg/divisor
  const uvE = (ns.co2_baseline_kg-uv.co2_avoided_kg)/divisor
  const wdE = (ns.co2_baseline_kg-wd.co2_avoided_kg)/divisor
  const data = [{label:"No Solar",value:nsE},{label:"Unadvised",value:uvE},{label:"Well Designed",value:wdE}]

  const thr20=20000/divisor, thr70=70000/divisor
  function barColor(v){return v<thr20?"#2c7a55":v<thr70?"#ffb74d":"#e57373"}

  const totalW = container.clientWidth-80
  const margin = {top:40,right:120,bottom:50,left:130}
  const width  = totalW-margin.left-margin.right
  const barH=42,gap=28,height=data.length*(barH+gap)-gap
  const minVal = Math.min(wdE*1.3,-5000/divisor)
  const maxVal = nsE*1.1
  const x = d3.scaleLinear().domain([minVal,maxVal]).range([0,width])

  const svg = d3.select("#co2BulletChart").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const numDays = getNumDays()
  const titleSuffix = state.solutionMode==="average"?"Per Household Avg":`All ${numH} Households`
  svg.append("text").attr("x",width/2).attr("y",-20).attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600").style("fill","#2c2c2c").style("font-family","Poppins,sans-serif")
    .text(`CO₂ Emissions over ${numDays} Days — ${titleSuffix}`)

  const ranges = [
    {x1:x(minVal),x2:x(0),     color:"#e8f5e9"},
    {x1:x(0),     x2:x(thr20), color:"#e8f5e9"},
    {x1:x(thr20), x2:x(thr70), color:"#fff8e1"},
    {x1:x(thr70), x2:x(maxVal),color:"#ffebee"}
  ]

  data.forEach((d,i)=>{
    const y=i*(barH+gap)
    ranges.forEach(r=>svg.append("rect").attr("x",r.x1).attr("y",y).attr("width",r.x2-r.x1).attr("height",barH).attr("fill",r.color).attr("rx",3))
    svg.append("rect").attr("x",x(0)).attr("y",y+barH*0.2).attr("width",0).attr("height",barH*0.6)
      .attr("fill",barColor(d.value)).attr("rx",2)
      .transition().duration(700).delay(i*150).attr("x",d.value>=0?x(0):x(d.value)).attr("width",Math.abs(x(d.value)-x(0)))
    svg.append("text").attr("x",d.value>=0?x(d.value)+8:x(d.value)-8).attr("y",y+barH/2+5)
      .attr("text-anchor",d.value>=0?"start":"end")
      .style("font-size","13px").style("font-weight","600").style("fill",barColor(d.value)).style("font-family","Poppins,sans-serif").style("opacity",0)
      .transition().duration(400).delay(i*150+600).style("opacity",1)
      .text(d.value<0?`-${d3.format(",.0f")(Math.round(Math.abs(d.value)/1000))}k kg`:`${d3.format(",.0f")(Math.round(d.value/1000))}k kg`)
    svg.append("text").attr("x",-10).attr("y",y+barH/2+5).attr("text-anchor","end")
      .style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(d.label)
  })

  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(6).tickFormat(d=>`${d3.format(",.0f")(d/1000)}k`)).selectAll("text").style("font-size","10px")
  svg.append("line").attr("x1",x(0)).attr("x2",x(0)).attr("y1",0).attr("y2",height+8).attr("stroke","#333").attr("stroke-width",2).attr("stroke-dasharray","4,3")
  svg.append("text").attr("x",x(0)).attr("y",-4).attr("text-anchor","middle").style("font-size","10px").style("fill","#555").style("font-family","Poppins,sans-serif").text("net zero")
  svg.append("text").attr("x",width/2).attr("y",height+42).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").style("font-family","Poppins,sans-serif")
    .text(state.solutionMode==="average"?"CO₂ Emissions per Household (kg)":"Annual CO₂ Emissions (kg)")

  const leg = svg.append("g").attr("transform",`translate(${width+12},0)`)
  ;[{label:"Low emissions",color:"#e8f5e9",tc:"#2c7a55"},{label:"Moderate",color:"#fff8e1",tc:"#f57f17"},{label:"High emissions",color:"#ffebee",tc:"#c62828"}]
    .forEach((r,i)=>{
      leg.append("rect").attr("x",0).attr("y",i*22).attr("width",12).attr("height",12).attr("rx",2).attr("fill",r.color).attr("stroke","#ccc").attr("stroke-width",0.5)
      leg.append("text").attr("x",16).attr("y",i*22+10).style("font-size","11px").style("fill",r.tc).style("font-family","Poppins,sans-serif").text(r.label)
    })
}

// ─── House scatter ───────────────────────────────────────────────────────────
function initHouseScatter() {
  const toggleContainer = document.querySelector("#scatterToggleContainer")
  if (toggleContainer && !toggleContainer.querySelector(".scatter-toggle")) {
    const toggle = document.createElement("div")
    toggle.className = "scenario-toggle scatter-toggle"
    toggle.style.marginBottom = "16px"
    toggle.innerHTML = `<button class="scenario-btn active" data-scatter="well_designed">Well Designed</button><button class="scenario-btn" data-scatter="unadvised">Unadvised</button>`
    toggleContainer.appendChild(toggle)
    toggle.querySelectorAll(".scenario-btn").forEach(btn=>{
      btn.addEventListener("click",function(){
        toggle.querySelectorAll(".scenario-btn").forEach(b=>b.classList.remove("active"))
        this.classList.add("active")
        state.currentScatterScenario = this.getAttribute("data-scatter")
        drawHouseScatter(state.allData.houseData[state.currentScatterScenario])
      })
    })
  }
  drawHouseScatter(state.allData.houseData["well_designed"])
}

function drawHouseScatter(data) {
  d3.select("#houseScatter").selectAll("svg").remove()
  const container = document.querySelector("#houseScatter")
  const totalW = container ? container.clientWidth-80 : 720
  const margin = {top:30,right:160,bottom:60,left:70}
  const width  = totalW-margin.left-margin.right, height = 380

  const svg = d3.select("#houseScatter").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d.total_solar_kwh)*1.05]).range([0,width])
  const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.total_load_kwh)*1.05]).range([height,0])
  const colorMap = {low:"#64b5f6",middle:"#81c784",high:"#ffb74d",luxury:"#ba68c8"}
  const shapeMap = {studio_1_bed:d3.symbolCircle,small_family:d3.symbolSquare,large_family:d3.symbolTriangle}

  svg.append("text").attr("x",width/2).attr("y",-8).attr("text-anchor","middle").style("font-size","14px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text("Solar Generation vs Energy Consumption per Household")
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(6).tickFormat(d=>`${(d/1000).toFixed(0)}k`)).selectAll("text").style("font-size","11px")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${(d/1000).toFixed(0)}k`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+45).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").text("Solar Generated (kWh)")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-55).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").text("Energy Consumed (kWh)")

  const maxVal = Math.max(d3.max(data,d=>d.total_solar_kwh),d3.max(data,d=>d.total_load_kwh))
  svg.append("line").attr("x1",x(0)).attr("y1",y(0)).attr("x2",x(maxVal)).attr("y2",y(maxVal)).attr("stroke","#bbb").attr("stroke-dasharray","5,4").attr("stroke-width",1.5)
  svg.append("text").attr("x",x(maxVal*0.72)).attr("y",y(maxVal*0.72)-8).style("font-size","11px").style("fill","#aaa").text("Break-even")

  data.forEach((d,i)=>{
    const symbolGen = d3.symbol().type(shapeMap[d.household_type]||d3.symbolCircle).size(90)
    const tx=x(d.total_solar_kwh), ty=y(d.total_load_kwh)
    const point = svg.append("path").attr("d",symbolGen)
      .attr("transform",`translate(${x(0)},${y(0)})`)
      .attr("fill",colorMap[d.wealth_level]||"#aaa").attr("stroke","white").attr("stroke-width",1.5).attr("opacity",0)
      .on("mouseover",event=>showTooltip(`<strong>${d.id}</strong><br>Type: ${d.household_type.replace(/_/g," ")}<br>Wealth: ${d.wealth_level}<br>Solar: ${fmtKwh(d.total_solar_kwh)}<br>Load: ${fmtKwh(d.total_load_kwh)}<br>Self-sufficiency: ${fmt(d.self_sufficiency_percent)}%<br>Net cost: $${fmt(d.net_cost,2)}`))
      .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
    point.node()._tx=tx; point.node()._ty=ty; point.node()._i=i
  })

  const svgNode = d3.select("#houseScatter svg").node()
  const observer = new IntersectionObserver(entries=>{
    if (!entries[0].isIntersecting) return
    observer.disconnect()
    d3.select("#houseScatter svg g").selectAll("path[fill]")
      .filter(function(){return this._tx!==undefined})
      .each(function(){
        d3.select(this).transition().delay(this._i*40).duration(600).ease(d3.easeCubicOut)
          .attr("transform",`translate(${this._tx},${this._ty})`).attr("opacity",0.85)
      })
  },{threshold:0.3})
  if (svgNode) observer.observe(svgNode)

  const legendW = svg.append("g").attr("transform",`translate(${width+20},0)`)
  legendW.append("text").attr("x",0).attr("y",0).style("font-size","12px").style("font-weight","600").style("fill","#444").text("Wealth")
  Object.entries(colorMap).forEach(([k,c],i)=>{
    legendW.append("circle").attr("cx",6).attr("cy",18+i*20).attr("r",6).attr("fill",c)
    legendW.append("text").attr("x",18).attr("y",23+i*20).style("font-size","11px").style("fill","#555").text(k.charAt(0).toUpperCase()+k.slice(1))
  })
  const legendT = svg.append("g").attr("transform",`translate(${width+20},110)`)
  legendT.append("text").attr("x",0).attr("y",0).style("font-size","12px").style("font-weight","600").style("fill","#444").text("Type")
  Object.entries(shapeMap).forEach(([k,sym],i)=>{
    const gen=d3.symbol().type(sym).size(60)
    legendT.append("path").attr("d",gen).attr("transform",`translate(8,${18+i*20})`).attr("fill","#888")
    legendT.append("text").attr("x",20).attr("y",23+i*20).style("font-size","11px").style("fill","#555").text(k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()))
  })
}

// ─── By-group chart ──────────────────────────────────────────────────────────
function initByGroupChart() {
  d3.selectAll("#grpGroupToggle [data-group]").on("click",function(){
    d3.selectAll("#grpGroupToggle .scenario-btn").classed("active",false)
    d3.select(this).classed("active",true)
    state.currentGroupKey = this.getAttribute("data-group")
    drawByGroupChart(state.currentGroupKey,state.currentGroupScenario)
  })
  d3.selectAll("#grpScenToggle [data-grp-scenario]").on("click",function(){
    d3.selectAll("#grpScenToggle .scenario-btn").classed("active",false)
    d3.select(this).classed("active",true)
    state.currentGroupScenario = this.getAttribute("data-grp-scenario")
    drawByGroupChart(state.currentGroupKey,state.currentGroupScenario)
  })
  d3.selectAll("#grpModeToggle [data-grp-mode]").on("click",function(){
    d3.selectAll("#grpModeToggle .scenario-btn").classed("active",false)
    d3.select(this).classed("active",true)
    state.currentGroupMode = this.getAttribute("data-grp-mode")
    drawByGroupChart(state.currentGroupKey,state.currentGroupScenario)
  })
  drawByGroupChart("by_type","well_designed")
}

function drawByGroupChart(groupKey, scenario) {
  d3.select("#energyBalance").selectAll("*").remove()
  const raw = state.allData.groupData[scenario][groupKey]
  if (!raw||raw.length===0) return

  const labelKey = groupKey==="by_type" ? "household_type" : "wealth_level"
  const isAvg    = state.currentGroupMode==="averages"
  const metrics  = ["total_solar_kwh","total_load_kwh","total_imported_kwh","total_exported_kwh"]
  const colors   = ["#fbc02d","#2c7a55","#e57373","#64b5f6"]
  const metricLabels = ["Solar","Load","Imported","Exported"]

  const data = raw.map(d=>{
    const factor = isAvg ? d.count : 1
    const row = {label:d[labelKey],count:d.count,avg_self_sufficiency:d.avg_self_sufficiency,total_net_cost:d.total_net_cost}
    metrics.forEach(m=>{row[m]=d[m]/factor})
    return row
  })

  const container = document.querySelector("#energyBalance")
  const totalW = container ? container.clientWidth-80 : 720
  const margin = {top:40,right:160,bottom:70,left:75}
  const width  = totalW-margin.left-margin.right, height = 340

  const xLabel     = groupKey==="by_type" ? "Household Type" : "Wealth Level"
  const yLabel     = isAvg ? "Energy (kWh / household)" : "Energy (kWh)"
  const chartTitle = `Energy breakdown by ${groupKey==="by_type"?"household type":"wealth level"} — ${scenario==="well_designed"?"Well Designed":"Unadvised"}`

  const groups = data.map(d=>d.label)
  const x0 = d3.scaleBand().domain(groups).range([0,width]).paddingInner(0.35)
  const x1 = d3.scaleBand().domain(metrics).range([0,x0.bandwidth()]).padding(0.15)
  const yMax = d3.max(data,d=>d3.max(metrics,m=>d[m]))*1.12
  const y = d3.scaleLinear().domain([0,yMax]).range([height,0])

  const svg = d3.select("#energyBalance").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  svg.append("text").attr("x",width/2).attr("y",-14).attr("text-anchor","middle").style("font-size","13px").style("font-weight","600").style("fill","#2c2c2c").style("font-family","Poppins,sans-serif").text(chartTitle)
  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x0).tickFormat(d=>d.replace(/_/g," "))).selectAll("text").style("text-anchor","middle").style("font-size","11px")
  svg.append("text").attr("x",width/2).attr("y",height+52).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").style("font-family","Poppins,sans-serif").text(xLabel)
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d=>`${(d/1000).toFixed(0)}k`)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-62).attr("text-anchor","middle").style("font-size","12px").style("fill","#666").attr("class","hh-axis-label").text(yLabel)

  const lollipopR = Math.max(5,Math.min(9,x1.bandwidth()*0.45))
  const groupSel = svg.selectAll(".lollipop-group").data(data).enter().append("g")
    .attr("class","lollipop-group").attr("transform",d=>`translate(${x0(d.label)},0)`)

  metrics.forEach((metric,mi)=>{
    const cx = x1(metric)+x1.bandwidth()/2
    groupSel.append("line").attr("x1",cx).attr("x2",cx).attr("y1",height).attr("y2",height)
      .attr("stroke",colors[mi]).attr("stroke-width",2).attr("stroke-opacity",0.7)
      .transition().duration(600).delay((_,i)=>i*60+mi*20).attr("y2",d=>y(d[metric]))
    groupSel.append("circle").attr("cx",cx).attr("cy",height).attr("r",lollipopR)
      .attr("fill",colors[mi]).attr("stroke","#fff").attr("stroke-width",1.5)
      .transition().duration(600).delay((_,i)=>i*60+mi*20).attr("cy",d=>y(d[metric]))
    groupSel.append("circle").attr("cx",cx).attr("cy",d=>y(d[metric])).attr("r",lollipopR+6).attr("fill","transparent")
      .on("mouseover",(event,d)=>showTooltip(`<strong>${d.label.replace(/_/g," ")}</strong><br>${metricLabels[mi]}: <strong>${fmtKwh(d[metric])}</strong>${isAvg?" / household":""}<br>Self-suff: ${fmt(d.avg_self_sufficiency)}%<br>Net cost: $${fmt(d.total_net_cost/(isAvg?d.count:1),2)}${isAvg?" / household":""}`))
      .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
  })

  const countPerGroup = data[0]?.count??"?"
  const noteEl = document.getElementById("energyBalance-note")
  if (noteEl) {
    const groupDesc = groupKey==="by_type"?"household type":"wealth level"
    noteEl.textContent = `kWh totals over 360 simulated days · Each ${groupDesc} group contains ${countPerGroup} households · Averages mode divides totals by household count`
  }

  const leg = svg.append("g").attr("transform",`translate(${width+20},0)`)
  metricLabels.forEach((label,i)=>{
    leg.append("circle").attr("cx",7).attr("cy",i*26+7).attr("r",7).attr("fill",colors[i])
    leg.append("text").attr("x",20).attr("y",i*26+12).style("font-size","12px").style("fill","#444").text(label)
  })
}

// ─── Mistake note ────────────────────────────────────────────────────────────
function updateMistakeNote() {
  const numHouses = getNumHouses()
  const mistakeNote = document.getElementById("mistake-note")
  if (!mistakeNote) return
  if (state.mistakeMetric==="import") {
    mistakeNote.textContent = `Grid Imported = energy purchased from the utility grid · Totals for the full neighborhood (${numHouses} households)`
  } else if (state.mistakeMetric==="export") {
    mistakeNote.textContent = `Grid Exported = surplus solar energy sold back to the grid · No Solar scenario excluded (zero export by definition) · Totals for the full neighborhood (${numHouses} households)`
  } else if (state.mistakeMetric==="generated") {
    mistakeNote.textContent = `Solar Generated = total energy produced by solar panels · No Solar scenario excluded · Totals for the full neighborhood (${numHouses} households)`
  } else {
    mistakeNote.textContent = `Load Consumed = total household energy demand · Similar across scenarios since consumption is independent of system design · Totals for the full neighborhood (${numHouses} households)`
  }
}

// ─── Mistake timeseries ──────────────────────────────────────────────────────
function initMistakeTimeseries() {
  document.querySelectorAll("#mistakeMetricTabs .metric-tab").forEach(btn=>{
    btn.addEventListener("click",function(){
      document.querySelectorAll("#mistakeMetricTabs .metric-tab").forEach(b=>b.classList.remove("active"))
      this.classList.add("active")
      state.mistakeMetric = this.dataset.metric
      updateMistakeNote()
      drawMistakeTimeseries(state.mistakeTimeGranularity)
    })
  })
  drawMistakeTimeseries("monthly")
}

function wireTimeBtns() {
  const m={Day:"daily",Week:"weekly",Month:"monthly",Quarter:"quarterly",Year:"yearly"}
  d3.selectAll("#mistakeTimeFilter .time-btn").on("click",function(){
    d3.selectAll("#mistakeTimeFilter .time-btn").classed("active",false)
    d3.select(this).classed("active",true)
    state.mistakeTimeGranularity = m[this.textContent.trim()]||"monthly"
    drawMistakeTimeseries(state.mistakeTimeGranularity)
  })
}

function drawMistakeTimeseries(granularity) {
  d3.select("#mistakeTimeseries").selectAll("svg").remove()
  const metric = state.mistakeMetric
  const field  = metric==="import"?"grid_imported_kwh":metric==="export"?"grid_exported_kwh":metric==="generated"?"solar_generated_kwh":"load_consumed_kwh"
  const yLabel = metric==="import"?"Grid Imported (kWh)":metric==="export"?"Grid Exported (kWh)":metric==="generated"?"Solar Generated (kWh)":"Load Consumed (kWh)"
  const showNs = metric==="import"

  if (granularity==="yearly") { _drawMistakeYearly(field,yLabel,showNs,metric); return }

  const wd = state.allData.timeData["well_designed"][granularity]
  const uv = state.allData.timeData["unadvised"][granularity]
  if (!wd||!uv||wd.length===0) return
  const ns = showNs ? uv.map(d=>({...d,[field]:d.load_consumed_kwh})) : []

  const container = document.querySelector("#mistakeTimeseries")
  const totalW = container.clientWidth-80||720
  const margin = {top:40,right:160,bottom:granularity==="daily"?50:80,left:75}
  const width  = totalW-margin.left-margin.right, height = 300

  const svgEl = d3.select("#mistakeTimeseries").append("svg").attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
  const svg   = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const titleStr = metric==="import"?"Grid Energy Imported — Three Scenarios Compared":metric==="export"?"Grid Energy Exported — Well Designed vs Unadvised":metric==="generated"?"Solar Generated — Well Designed vs Unadvised":"Load Consumed — Well Designed vs Unadvised"
  svgEl.append("text").attr("x",margin.left+width/2).attr("y",22).attr("text-anchor","middle").style("font-size","14px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text(titleStr)

  const label = (d,i)=>{
    if (granularity==="daily")     return d.date||`D${i+1}`
    if (granularity==="weekly")    return `W${d.week||i+1}`
    if (granularity==="monthly")   return d.month_name ? d.month_name.replace(" 2024","") : `M${i+1}`
    if (granularity==="quarterly") return `Q${d.quarter_num||i+1}`
    return `${i+1}`
  }
  const labels = wd.map(label)
  const allForMax = showNs ? [...wd,...uv,...ns] : [...wd,...uv]
  const yMax = d3.max(allForMax,d=>d[field])*1.15
  const y = d3.scaleLinear().domain([0,yMax]).range([height,0])
  const yFmt = d=>yMax>=5000?`${(d/1000).toFixed(0)}k`:yMax>=1000?`${(d/1000).toFixed(1)}k`:`${d.toFixed(0)}`

  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(yFmt)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-58).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text(yLabel)

  const xLabelText = {daily:"Day",weekly:"Week",monthly:"Month",quarterly:"Quarter"}[granularity]||""
  svg.append("text").attr("x",width/2).attr("y",height+(granularity==="monthly"?72:42)).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text(xLabelText)

  svg.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat("")).selectAll("line").style("stroke","#f0f0f0").style("stroke-width","1")
  svg.select(".domain").remove()

  if (granularity==="daily"||granularity==="weekly") {
    const x = granularity==="daily"
      ? d3.scaleTime().domain(d3.extent(wd,d=>new Date(d.date))).range([0,width])
      : d3.scaleLinear().domain([0,wd.length-1]).range([0,width])
    const xAxis = granularity==="daily"
      ? d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %-d"))
      : d3.axisBottom(x).ticks(13).tickFormat(i=>`W${Math.round(i)+1}`)
    svg.append("g").attr("transform",`translate(0,${height})`).call(xAxis).selectAll("text").style("font-size","11px")

    const xVal = granularity==="daily" ? d=>x(new Date(d.date)) : (d,i)=>x(i)
    const lineGen = ()=>d3.line().x((d,i)=>xVal(d,i)).y(d=>y(d[field])).curve(d3.curveMonotoneX)
    const uvLine = svg.append("path").datum(uv).attr("fill","none").attr("stroke","#e57373").attr("stroke-width",2).attr("d",lineGen()(uv))
    if (showNs) {
      const nsLine = svg.append("path").datum(ns).attr("fill","none").attr("stroke","#90a4ae").attr("stroke-width",2).attr("stroke-dasharray","5,3").attr("d",lineGen()(ns))
      animatePath(nsLine,150)
    }
    const wdLine = svg.append("path").datum(wd).attr("fill","none").attr("stroke","#2c7a55").attr("stroke-width",2).attr("d",lineGen()(wd))
    animatePath(uvLine,0); animatePath(wdLine,300)

    const crossV = svg.append("line").attr("y1",0).attr("y2",height).attr("stroke","#ccc").attr("stroke-width",1).attr("stroke-dasharray","3,3").style("opacity",0)
    svg.append("rect").attr("width",width).attr("height",height).attr("fill","transparent")
      .on("mousemove",function(event){
        const mx=d3.pointer(event)[0]
        let w,u,n
        if (granularity==="daily") {
          const date=x.invert(mx)
          const idx=Math.min(d3.bisector(d=>new Date(d.date)).left(wd,date),wd.length-1)
          w=wd[idx];u=uv[idx];n=showNs?ns[idx]:null
        } else {
          const idx=Math.min(Math.round(x.invert(mx)),wd.length-1)
          w=wd[Math.max(0,idx)];u=uv[Math.max(0,idx)];n=showNs?ns[Math.max(0,idx)]:null
        }
        if (!w||!u) return
        crossV.attr("x1",mx).attr("x2",mx).style("opacity",1)
        const lbl=granularity==="daily"?w.date:`Week ${w.week}`
        const nsRow=showNs&&n?`<span style="color:#90a4ae">●</span> No Solar: <strong>${fmtKwh(n[field])}</strong><br>`:""
        showTooltip(`<strong>${lbl}</strong><br>${nsRow}<span style="color:#e57373">●</span> Unadvised: <strong>${fmtKwh(u[field])}</strong><br><span style="color:#2c7a55">●</span> Well Designed: <strong>${fmtKwh(w[field])}</strong>`)
        moveTooltip(event)
      })
      .on("mouseout",()=>{crossV.style("opacity",0);hideTooltip()})
  } else {
    // Grouped bar chart for month/quarter
    const barDomain = showNs?["ns","uv","wd"]:["uv","wd"]
    const x0 = d3.scaleBand().domain(labels).range([0,width]).padding(0.25)
    const x1 = d3.scaleBand().domain(barDomain).range([0,x0.bandwidth()]).padding(0.05)

    svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x0))
      .selectAll("text").attr("transform",granularity==="monthly"?"rotate(-35)":"rotate(0)")
      .style("text-anchor",granularity==="monthly"?"end":"middle").style("font-size","11px")

    const animateBar=(sel,delay)=>sel.attr("y",height).attr("height",0)
      .transition().delay((d,i)=>i*20+delay).duration(500).ease(d3.easeCubicOut)
      .attr("y",d=>y(d[field])).attr("height",d=>height-y(d[field]))

    if (showNs) {
      animateBar(svg.selectAll(".bar-ns").data(ns).enter().append("rect").attr("class","bar-ns")
        .attr("x",(d,i)=>x0(labels[i])+x1("ns")).attr("width",x1.bandwidth()).attr("fill","#90a4ae").attr("rx",3)
        .on("mouseover",(e,d)=>showTooltip(`<span style="color:#90a4ae">●</span> <strong>No Solar</strong><br>Imported: ${fmtKwh(d[field])}`))
        .on("mousemove",moveTooltip).on("mouseout",hideTooltip),0)
    }
    animateBar(svg.selectAll(".bar-wd").data(wd).enter().append("rect").attr("class","bar-wd")
      .attr("x",(d,i)=>x0(labels[i])+x1("wd")).attr("width",x1.bandwidth()).attr("fill","#2c7a55").attr("rx",3)
      .on("mouseover",(e,d)=>showTooltip(`<span style="color:#2c7a55">●</span> <strong>Well Designed</strong><br>${metric==="import"?"Imported":"Exported"}: ${fmtKwh(d[field])}<br>Self-suff: ${fmt(d.self_sufficiency_avg)}%`))
      .on("mousemove",moveTooltip).on("mouseout",hideTooltip),50)
    animateBar(svg.selectAll(".bar-uv").data(uv).enter().append("rect").attr("class","bar-uv")
      .attr("x",(d,i)=>x0(labels[i])+x1("uv")).attr("width",x1.bandwidth()).attr("fill","#e57373").attr("rx",3)
      .on("mouseover",(e,d)=>showTooltip(`<span style="color:#e57373">●</span> <strong>Unadvised</strong><br>${metric==="import"?"Imported":"Exported"}: ${fmtKwh(d[field])}<br>Self-suff: ${fmt(d.self_sufficiency_avg)}%`))
      .on("mousemove",moveTooltip).on("mouseout",hideTooltip),100)
  }

  // Legend
  const legendItems = showNs
    ? [{label:"No Solar",color:"#90a4ae",dashed:true},{label:"Unadvised",color:"#e57373",dashed:false},{label:"Well Designed",color:"#2c7a55",dashed:false}]
    : [{label:"Unadvised",color:"#e57373",dashed:false},{label:"Well Designed",color:"#2c7a55",dashed:false}]
  legendItems.forEach(({label,color,dashed},i)=>{
    const g=svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",color).attr("stroke-width",3).attr("stroke-dasharray",dashed?"5,3":null)
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(label)
  })
}

function _drawMistakeYearly(field, yLabel, showNs, metric) {
  const wdDaily = state.allData.timeData["well_designed"]["daily"]
  const uvDaily = state.allData.timeData["unadvised"]["daily"]
  const sumWd = wdDaily.reduce((s,d)=>s+d[field],0)
  const sumUv = uvDaily.reduce((s,d)=>s+d[field],0)
  const sumNs = showNs ? uvDaily.reduce((s,d)=>s+d.load_consumed_kwh,0) : 0

  const container = document.querySelector("#mistakeTimeseries")
  const totalW = container.clientWidth-80||720
  const margin = {top:40,right:160,bottom:60,left:75}
  const width  = totalW-margin.left-margin.right, height = 300

  const svgEl = d3.select("#mistakeTimeseries").append("svg").attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
  const svg   = svgEl.append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const titleStr = metric==="import"?"Grid Energy Imported — Three Scenarios Compared":metric==="export"?"Grid Energy Exported — Well Designed vs Unadvised":metric==="generated"?"Solar Generated — Well Designed vs Unadvised":"Load Consumed — Well Designed vs Unadvised"
  svgEl.append("text").attr("x",margin.left+width/2).attr("y",22).attr("text-anchor","middle").style("font-size","14px").style("font-weight","600").style("fill","#1e2b24").style("font-family","Poppins,sans-serif").text(titleStr)

  const yMax=(showNs?sumNs:Math.max(sumWd,sumUv))*1.15
  const y = d3.scaleLinear().domain([0,yMax]).range([height,0])
  const yFmt = d=>`${(d/1000).toFixed(0)}k`
  const barKeys = showNs?["ns","uv","wd"]:["uv","wd"]
  const x0 = d3.scaleBand().domain(["Year 2024"]).range([0,width]).padding(0.5)
  const x1 = d3.scaleBand().domain(barKeys).range([0,x0.bandwidth()]).padding(0.1)

  svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x0)).selectAll("text").style("font-size","13px").style("font-weight","600")
  svg.append("text").attr("x",width/2).attr("y",height+46).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text("Year")
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(yFmt)).selectAll("text").style("font-size","11px")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-58).attr("text-anchor","middle").style("font-size","12px").style("fill","#7c8f86").style("font-family","Poppins,sans-serif").text(yLabel)
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat("")).selectAll("line").style("stroke","#f0f0f0")
  svg.select(".domain").remove()

  const allBars = showNs
    ? [{key:"ns",val:sumNs,color:"#90a4ae",label:"No Solar"},{key:"uv",val:sumUv,color:"#e57373",label:"Unadvised"},{key:"wd",val:sumWd,color:"#2c7a55",label:"Well Designed"}]
    : [{key:"uv",val:sumUv,color:"#e57373",label:"Unadvised"},{key:"wd",val:sumWd,color:"#2c7a55",label:"Well Designed"}]

  allBars.forEach(({key,val,color,label},i)=>{
    const barX=x0("Year 2024")+x1(key), bw=x1.bandwidth()
    svg.append("rect").attr("x",barX).attr("y",height).attr("width",bw).attr("height",0).attr("fill",color).attr("rx",4)
      .on("mouseover",e=>showTooltip(`<span style="color:${color}">●</span> <strong>${label}</strong><br>Annual ${metric}: <strong>${fmtKwh(val)}</strong>`))
      .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
      .transition().delay(i*80).duration(600).ease(d3.easeCubicOut).attr("y",y(val)).attr("height",height-y(val))
    svg.append("text").attr("x",barX+bw/2).attr("y",y(val)-6).attr("text-anchor","middle").style("font-size","12px").style("font-weight","700").style("fill",color).style("font-family","Poppins,sans-serif").attr("opacity",0)
      .transition().delay(i*80+500).duration(200).attr("opacity",1).text(fmtKwh(val))
    const g=svg.append("g").attr("transform",`translate(${width+8},${i*22})`)
    g.append("line").attr("x1",0).attr("x2",20).attr("y1",8).attr("y2",8).attr("stroke",color).attr("stroke-width",3)
    g.append("text").attr("x",26).attr("y",12).style("font-size","12px").style("fill","#444").style("font-family","Poppins,sans-serif").text(label)
  })
}
