// ============================================================
//  GreenGrid Dashboard — charts-household.js
//  Cost-by-type bar chart, wealth lollipop, self-sufficiency gauges
// ============================================================

// ─── Cost by type ────────────────────────────────────────────────────────────
function initCostByType() {
  const container = document.querySelector("#costByType")
  if (!container) return
  if (document.getElementById("hhToggle")) return  // don't double-inject

  container.insertAdjacentHTML("beforebegin", `
    <div id="hhToggle" style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="time-btn active" data-hhmode="kwh">Consumption (kWh)</button>
      <button class="time-btn" data-hhmode="cost">Annual Cost ($)</button>
      <button class="time-btn" data-hhmode="co2">CO₂ Emissions (kg)</button>
    </div>`)

  document.querySelectorAll("#hhToggle .time-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("#hhToggle .time-btn").forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      state.currentHHMode = btn.dataset.hhmode
      updateHHChart()
    })
  })
  drawHHChart()
}

function _getHHData() {
  const byType = state.allData.groupData["well_designed"]["by_type"]
  const labels = HH_TYPE_LABELS
  return byType.map(d=>{
    const loadPerHouse = d.total_load_kwh / d.count
    let value, barColor, labelFn
    if (state.currentHHMode==="kwh") {
      value=loadPerHouse; barColor="#ffb74d"; labelFn=v=>`${d3.format(",")(Math.round(v))} kWh`
    } else if (state.currentHHMode==="cost") {
      value=loadPerHouse*GRID_RATE; barColor="#e57373"; labelFn=v=>`$${fmt(v,2)}`
    } else {
      value=loadPerHouse*CO2_FACTOR; barColor="#90a4ae"; labelFn=v=>`${d3.format(",")(Math.round(v))} kg CO₂`
    }
    return {label:d.household_type,value,count:d.count,barColor,labelFn}
  })
}

function drawHHChart() {
  const data = _getHHData()
  const labels = HH_TYPE_LABELS
  const container = document.querySelector("#costByType")
  const totalW = container.clientWidth-80||720
  const margin = {top:20,right:180,bottom:50,left:160}
  const width  = totalW-margin.left-margin.right, height = 160

  const svg = d3.select("#costByType").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const y = d3.scaleBand().domain(data.map(d=>d.label)).range([0,height]).padding(0.35)
  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.2]).range([0,width])

  svg.append("text").attr("class","chart-title").attr("x",width/2).attr("y",-8).attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600").style("fill","#1e2b24")
    .text("Annual Consumption by Household Type")

  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>labels[d]||d)).selectAll("text").style("font-size","13px").style("fill","#1e2b24")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-margin.left+14)
    .attr("text-anchor","middle").style("font-size","11px").style("fill","#aaa").text("Household Type")

  svg.append("g").attr("class","x-axis").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>state.currentHHMode==="cost"?`$${fmt(d,2)}`:d3.format(",")(Math.round(d))))
    .selectAll("text").style("font-size","11px")

  svg.append("text").attr("class","hh-axis-label").attr("x",width/2).attr("y",height+44).attr("text-anchor","middle")
    .style("font-size","11px").style("fill","#aaa")
    .text(state.currentHHMode==="kwh"?"kWh":state.currentHHMode==="cost"?"USD":"kg CO₂")

  svg.selectAll(".bar-hh").data(data).enter().append("rect").attr("class","bar-hh")
    .attr("y",d=>y(d.label)).attr("x",0).attr("height",y.bandwidth()).attr("width",0)
    .attr("fill",d=>d.barColor).attr("rx",6)
    .on("mouseover",(event,d)=>showTooltip(`<strong>${labels[d.label]}</strong><br>${d.labelFn(d.value)}<br>Households: ${d.count}`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
    .transition().duration(700).ease(d3.easeCubicOut).attr("width",d=>x(d.value))

  svg.selectAll(".bar-hh-label").data(data).enter().append("text").attr("class","bar-hh-label")
    .attr("x",0).attr("y",d=>y(d.label)+y.bandwidth()/2+4)
    .style("font-size","13px").style("font-weight","600").style("fill","#1e2b24").style("opacity",0)
    .text(d=>d.labelFn(d.value))
    .transition().duration(700).ease(d3.easeCubicOut).attr("x",d=>x(d.value)+8).style("opacity",1)
}

function updateHHChart() {
  const data = _getHHData()
  const container = document.querySelector("#costByType")
  const totalW = container.clientWidth-80||720
  const margin = {top:20,right:180,bottom:50,left:160}
  const width  = totalW-margin.left-margin.right
  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.2]).range([0,width])
  const svg = d3.select("#costByType svg g")

  svg.selectAll(".bar-hh").data(data).transition().duration(500).ease(d3.easeCubicInOut)
    .attr("width",d=>x(d.value)).attr("fill",d=>d.barColor)

  svg.selectAll(".bar-hh-label").data(data).transition().duration(500).ease(d3.easeCubicInOut)
    .attr("x",d=>x(d.value)+8)
    .tween("text",function(d){
      const node=this
      const prev=parseFloat(node.textContent.replace(/[^0-9.]/g,""))||0
      const interp=d3.interpolateNumber(prev,d.value)
      return t=>{node.textContent=d.labelFn(interp(t))}
    })

  svg.select(".hh-axis-label").text(state.currentHHMode==="kwh"?"kWh":state.currentHHMode==="cost"?"USD":"kg CO₂")
  svg.select(".chart-title").text(
    state.currentHHMode==="kwh"?"Annual Consumption by Household Type":
    state.currentHHMode==="cost"?"Annual Cost by Household Type":
    "CO₂ Emissions by Household Type")
  svg.select(".x-axis").transition().duration(500)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>state.currentHHMode==="cost"?`$${fmt(d,2)}`:d3.format(",")(Math.round(d))))
}

// ─── Wealth lollipop ─────────────────────────────────────────────────────────
function getWealthColor() {
  if (state.currentWealthMode==="kwh")  return "#ffb74d"
  if (state.currentWealthMode==="cost") return "#e57373"
  return "#90a4ae"
}

function _getWealthData() {
  const byWealth = state.allData.groupData["well_designed"]["by_wealth"]
  return {
    data: byWealth.map(d=>{
      const loadPerHouse = d.total_load_kwh / d.count
      let value, labelFn
      if (state.currentWealthMode==="kwh") {
        value=loadPerHouse; labelFn=v=>`${d3.format(",")(Math.round(v))} kWh`
      } else if (state.currentWealthMode==="cost") {
        value=loadPerHouse*GRID_RATE; labelFn=v=>`$${fmt(v,2)}`
      } else {
        value=loadPerHouse*CO2_FACTOR; labelFn=v=>`${d3.format(",")(Math.round(v))} kg CO₂`
      }
      return {label:d.wealth_level,value,count:d.count,labelFn}
    })
  }
}

function initWealthChart() {
  const container = document.querySelector("#wealthLollipop")
  if (!container) return
  if (document.getElementById("wealthToggle")) return  // don't double-inject

  container.insertAdjacentHTML("beforebegin", `
    <div id="wealthToggle" style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="time-btn active" data-wmode="kwh">Consumption (kWh)</button>
      <button class="time-btn" data-wmode="cost">Annual Cost ($)</button>
      <button class="time-btn" data-wmode="co2">CO₂ Emissions (kg)</button>
    </div>`)

  document.querySelectorAll("#wealthToggle .time-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("#wealthToggle .time-btn").forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      state.currentWealthMode = btn.dataset.wmode
      updateWealthChart()
    })
  })
  drawWealthChart()

  const numDays = getNumDays()
  const wealthNote = document.querySelector("#wealth-data-note")
  if (wealthNote) wealthNote.textContent = `Average per household · Based on ${numDays}-day simulation · Grid rate: $${GRID_RATE}/kWh · CO₂ factor: ${CO2_FACTOR} kg/kWh (CFE Mexico)`
}

function drawWealthChart() {
  const {data} = _getWealthData()
  const container = document.querySelector("#wealthLollipop")
  const totalW = container.clientWidth-80||720
  const margin = {top:30,right:160,bottom:50,left:140}
  const width  = totalW-margin.left-margin.right, height = 200

  const svg = d3.select("#wealthLollipop").append("svg")
    .attr("width",width+margin.left+margin.right).attr("height",height+margin.top+margin.bottom)
    .append("g").attr("transform",`translate(${margin.left},${margin.top})`)

  const y = d3.scaleBand().domain(data.map(d=>d.label)).range([0,height]).padding(0.4)
  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.2]).range([0,width])

  svg.append("text").attr("class","w-chart-title").attr("x",width/2).attr("y",-10).attr("text-anchor","middle")
    .style("font-size","13px").style("font-weight","600").style("fill","#1e2b24")
    .text(state.currentWealthMode==="kwh"?"Annual Consumption by Wealth Level":state.currentWealthMode==="cost"?"Annual Cost by Wealth Level":"CO₂ Emissions by Wealth Level")

  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>WEALTH_LABELS[d]||d)).selectAll("text").style("font-size","13px").style("fill","#1e2b24")
  svg.append("text").attr("transform","rotate(-90)").attr("x",-height/2).attr("y",-margin.left+14)
    .attr("text-anchor","middle").style("font-size","11px").style("fill","#aaa").text("Wealth Level")

  svg.append("g").attr("class","w-x-axis").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>state.currentWealthMode==="cost"?`$${fmt(d,2)}`:d3.format(",")(Math.round(d))))
    .selectAll("text").style("font-size","11px")

  svg.append("text").attr("class","w-axis-label").attr("x",width/2).attr("y",height+44).attr("text-anchor","middle")
    .style("font-size","11px").style("fill","#aaa")
    .text(state.currentWealthMode==="kwh"?"kWh":state.currentWealthMode==="cost"?"USD":"kg CO₂")

  const color = getWealthColor()

  svg.selectAll(".lollipop-stem").data(data).enter().append("line").attr("class","lollipop-stem")
    .attr("y1",d=>y(d.label)+y.bandwidth()/2).attr("y2",d=>y(d.label)+y.bandwidth()/2)
    .attr("x1",0).attr("x2",0).attr("stroke",color).attr("stroke-width",3)
    .transition().duration(700).ease(d3.easeCubicOut).attr("x2",d=>x(d.value))

  svg.selectAll(".lollipop-circle").data(data).enter().append("circle").attr("class","lollipop-circle")
    .attr("cy",d=>y(d.label)+y.bandwidth()/2).attr("cx",0).attr("r",9)
    .attr("fill",color).attr("stroke","white").attr("stroke-width",2)
    .on("mouseover",(event,d)=>showTooltip(`<strong>${WEALTH_LABELS[d.label]}</strong><br>${d.labelFn(d.value)}<br>Households: ${d.count}`))
    .on("mousemove",moveTooltip).on("mouseout",hideTooltip)
    .transition().duration(700).ease(d3.easeCubicOut).attr("cx",d=>x(d.value))

  svg.selectAll(".lollipop-label").data(data).enter().append("text").attr("class","lollipop-label")
    .attr("cx",0).attr("x",0).attr("y",d=>y(d.label)+y.bandwidth()/2+4)
    .style("font-size","13px").style("font-weight","600").style("fill","#1e2b24").style("opacity",0)
    .text(d=>d.labelFn(d.value))
    .transition().duration(700).ease(d3.easeCubicOut).attr("x",d=>x(d.value)+16).style("opacity",1)
}

function updateWealthChart() {
  const {data} = _getWealthData()
  const container = document.querySelector("#wealthLollipop")
  const totalW = container.clientWidth-80||720
  const margin = {top:30,right:160,bottom:50,left:140}
  const width  = totalW-margin.left-margin.right
  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.2]).range([0,width])
  const svg = d3.select("#wealthLollipop svg g")
  const color = getWealthColor()

  svg.selectAll(".lollipop-stem").data(data).transition().duration(500).ease(d3.easeCubicInOut).attr("x2",d=>x(d.value)).attr("stroke",color)
  svg.selectAll(".lollipop-circle").data(data).transition().duration(500).ease(d3.easeCubicInOut).attr("cx",d=>x(d.value)).attr("fill",color)
  svg.selectAll(".lollipop-label").data(data).transition().duration(500).ease(d3.easeCubicInOut)
    .attr("x",d=>x(d.value)+16)
    .tween("text",function(d){
      const node=this
      const prev=parseFloat(node.textContent.replace(/[^0-9.]/g,""))||0
      const interp=d3.interpolateNumber(prev,d.value)
      return t=>{node.textContent=d.labelFn(interp(t))}
    })

  svg.select(".w-axis-label").text(state.currentWealthMode==="kwh"?"kWh":state.currentWealthMode==="cost"?"USD":"kg CO₂")
  svg.select(".w-chart-title").text(state.currentWealthMode==="kwh"?"Annual Consumption by Wealth Level":state.currentWealthMode==="cost"?"Annual Cost by Wealth Level":"CO₂ Emissions by Wealth Level")
  svg.select(".w-x-axis").transition().duration(500)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>state.currentWealthMode==="cost"?`$${fmt(d,2)}`:d3.format(",")(Math.round(d))))
}

// ─── Self-sufficiency gauges ─────────────────────────────────────────────────
function initSelfSufficiencyGauges() {
  const container = document.querySelector("#selfSufficiencyGauges")
  if (!container) return
  ;[
    {label:"Unadvised System",     key:"unadvised",     color:"#e57373"},
    {label:"Well Designed System", key:"well_designed", color:"#2c7a55"}
  ].forEach(s=>{
    const sc = state.allData.overviewData.scenarios.find(x=>x.scenario===s.key)
    if (!sc) return
    const wrapper = document.createElement("div")
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;"
    container.appendChild(wrapper)
    drawGauge(wrapper,s.label,sc.avg_self_sufficiency,sc.total_net_cost,sc.co2_avoided_kg,s.color)
  })
}

function drawGauge(wrapper, label, pct, netCost, co2, color) {
  const outerR=140, innerR=96
  const W=outerR*2, H=outerR+55
  const svgEl = d3.select(wrapper).append("svg").attr("width",W).attr("height",H).style("overflow","visible").style("display","block")

  const gradId = "gg-"+Math.random().toString(36).slice(2,7)
  const grad = svgEl.append("defs").append("linearGradient").attr("id",gradId).attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","0%")
  ;[{offset:"0%",color:"#ef5350"},{offset:"40%",color:"#ffa726"},{offset:"70%",color:"#d4e157"},{offset:"100%",color:"#2c7a55"}]
    .forEach(s=>grad.append("stop").attr("offset",s.offset).attr("stop-color",s.color))

  const cx=outerR, cy=outerR
  const arcGen = d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(-Math.PI/2).endAngle(Math.PI/2)
  svgEl.append("path").attr("d",arcGen()).attr("fill",`url(#${gradId})`).attr("transform",`translate(${cx},${cy})`)

  const g = svgEl.append("g").attr("transform",`translate(${cx},${cy})`)
  const pctToAngle = p => Math.PI-(p/100)*Math.PI
  const aX = a => Math.cos(a), aY = a => -Math.sin(a)

  ;[0,25,50,75,100].forEach(v=>{
    const a=pctToAngle(v), x=aX(a), y=aY(a)
    g.append("line").attr("x1",(outerR+4)*x).attr("y1",(outerR+4)*y).attr("x2",(outerR+16)*x).attr("y2",(outerR+16)*y).attr("stroke","#bbb").attr("stroke-width",1.5)
    g.append("text").attr("x",(outerR+28)*x).attr("y",(outerR+28)*y+4).attr("text-anchor","middle").style("font-size","10px").style("fill","#999").style("font-family","Poppins,sans-serif").text(v+"%")
  })

  const needleLen=outerR*0.76, tailLen=outerR*0.18
  const needleLine = g.append("line").attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",0).attr("stroke","#1e2b24").attr("stroke-width",3).attr("stroke-linecap","round").attr("opacity",0.9)
  const tailLine   = g.append("line").attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",0).attr("stroke","#1e2b24").attr("stroke-width",3).attr("stroke-linecap","round").attr("opacity",0.6)
  g.append("circle").attr("r",10).attr("fill","#1e2b24").attr("stroke","white").attr("stroke-width",2.5)

  const pctText = g.append("text").attr("y",-outerR*0.35).attr("text-anchor","middle")
    .style("font-size","36px").style("font-weight","800").style("fill",color).style("font-family","Poppins,sans-serif").text("0%")

  function animateGauge() {
    needleLine.transition().delay(300).duration(1400).ease(d3.easeElastic.period(0.6))
      .attrTween("x2",()=>{const i=d3.interpolateNumber(0,pct/100);return t=>needleLen*aX(pctToAngle(i(t)*100))})
      .attrTween("y2",()=>{const i=d3.interpolateNumber(0,pct/100);return t=>needleLen*aY(pctToAngle(i(t)*100))})
    tailLine.transition().delay(300).duration(1400).ease(d3.easeElastic.period(0.6))
      .attrTween("x2",()=>{const i=d3.interpolateNumber(0,pct/100);return t=>-tailLen*aX(pctToAngle(i(t)*100))})
      .attrTween("y2",()=>{const i=d3.interpolateNumber(0,pct/100);return t=>-tailLen*aY(pctToAngle(i(t)*100))})
    pctText.transition().duration(1400).ease(d3.easeCubicOut)
      .tween("text",()=>{const interp=d3.interpolateNumber(0,pct);return t=>{pctText.text(fmt(interp(t),1)+"%")}})
  }

  const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){animateGauge();observer.disconnect()}})
  },{threshold:0.4})
  observer.observe(wrapper)

  svgEl.append("text").attr("x",cx).attr("y",cy+22).attr("text-anchor","middle").style("font-size","13px").style("font-weight","700").style("fill",color).style("font-family","Poppins,sans-serif").text(label)
  svgEl.append("text").attr("x",cx).attr("y",cy+40).attr("text-anchor","middle").style("font-size","11px").style("fill","#aaa").style("font-family","Poppins,sans-serif").text(`${fmt(100-pct,1)}% grid dependent`)
}
