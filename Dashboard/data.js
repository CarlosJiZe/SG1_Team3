// ============================================================
//  GreenGrid Dashboard — data.js
//  Data loading + all populate/init functions
//  NOTE: load this LAST so all chart functions are available
// ============================================================

Promise.all([
  fetch("data/duck_curve.json").then(r => r.json()),
  fetch("data/per_house.json").then(r => r.json()),
  fetch("data/overview.json").then(r => r.json()),
  fetch("data/by_group.json").then(r => r.json()),
  fetch("data/timeseries.json").then(r => r.json())
]).then(([duckData,houseData,overviewData,groupData,timeData])=>{
  state.allData = {duckData,houseData,overviewData,groupData,timeData}
  setTimeout(()=>{
    populateKPIs()
    populateSimOverview()
    populateComparisonTable()
    populateImpactCards()
    initCostByType()
    initWealthChart()
    initParadoxDuck()
    initParadoxClock()
    initDuckCurve()
    initSelfSufficiencyGauges()
    initBatterySocChart()
    initMistakeTimeseries()
    initHouseScatter()
    initByGroupChart()
    initBulletChart()
    initCo2BulletChart()
    initCo2Equivalencies()
    wireScenarioToggle()
    wireTimeBtns()
    wireSolutionModeToggle()
  }, 100)
}).catch(err=>console.error("Error loading dashboard data:",err))

// ─── KPIs ───────────────────────────────────────────────────────────────────
function populateKPIs() {
  const noSolar = state.allData.overviewData.scenarios.find(s=>s.scenario==="no_solar")
  if (!noSolar) return

  const costEl = document.querySelector("#kpi-cost")
  const co2El  = document.querySelector("#kpi-co2")
  const ssEl   = document.querySelector("#kpi-ss")
  if (costEl) costEl.textContent = "$"+fmt(noSolar.total_net_cost,0)
  if (co2El)  co2El.textContent  = fmt(noSolar.co2_baseline_kg/1000,0)+" tons"
  if (ssEl)   ssEl.textContent   = fmt(noSolar.avg_self_sufficiency,0)+"%"

  const duckWD = state.allData.duckData["well_designed"]
  const peakHours = duckWD.filter(d=>d.hour>=18&&d.hour<=20)
  const avgPeak = peakHours.reduce((s,d)=>s+d.avg_load_kw,0)/peakHours.length
  const peakEl = document.querySelector("#kpi-peak")
  if (peakEl) peakEl.textContent = fmt(avgPeak,2)+" kW"

  const peakSolarEntry = duckWD.reduce((max,d)=>d.avg_solar_kw>max.avg_solar_kw?d:max,duckWD[0])
  const loadAtSolarPeak = peakSolarEntry.avg_load_kw
  const maxLoadKw = Math.max(...duckWD.map(d=>d.avg_load_kw))

  const solarHourEl   = document.querySelector("#kpi-solar-hour")
  const solarPeakEl   = document.querySelector("#kpi-solar-peak")
  const loadAtSolarEl = document.querySelector("#kpi-load-at-solar")
  const loadAtSolarBar= document.querySelector("#kpi-load-at-solar-bar")
  if (solarHourEl)   solarHourEl.textContent   = peakSolarEntry.hour+":00 h"
  if (solarPeakEl)   solarPeakEl.textContent   = fmt(peakSolarEntry.avg_solar_kw,2)+" kW"
  if (loadAtSolarEl) loadAtSolarEl.textContent = fmt(loadAtSolarPeak,2)+" kW"
  if (loadAtSolarBar)loadAtSolarBar.style.width = fmt((loadAtSolarPeak/maxLoadKw)*100,0)+"%"
}

// ─── Simulation overview cards ──────────────────────────────────────────────
function populateSimOverview() {
  const numHouses = getNumHouses()
  const numDays   = getNumDays()
  const numScenarios = state.allData.overviewData.scenarios.length

  const simCards = document.querySelectorAll(".sim-card h3")
  if (simCards[0]) simCards[0].textContent = numHouses
  if (simCards[1]) simCards[1].textContent = numDays
  if (simCards[2]) simCards[2].textContent = numScenarios

  document.querySelectorAll(".sim-note").forEach(el=>{
    el.textContent = `Aggregated totals for the full ${numHouses}-household neighborhood over ${numDays} simulated days.`
  })

  const chartNote = document.querySelector(".chart-data-note")
  if (chartNote) chartNote.textContent = `Average per household · Based on ${numDays}-day simulation · Grid rate: $${GRID_RATE}/kWh · CO₂ factor: ${CO2_FACTOR} kg/kWh (CFE Mexico)`

  updateMistakeNote()

  const scatterNote = document.getElementById("scatter-note")
  if (scatterNote) scatterNote.textContent = `kWh totals over ${numDays} simulated days · Break-even line = solar generated equals energy consumed · Points above the line indicate energy deficit`
}

// ─── Comparison table ───────────────────────────────────────────────────────
function populateComparisonTable() {
  const tbody = document.querySelector("#comparison-tbody")
  if (!tbody) return
  tbody.innerHTML = ""
  state.allData.overviewData.scenarios.forEach(s=>{
    const cost    = s.total_net_cost<0 ? `-$${fmt(Math.abs(s.total_net_cost),0)}` : `$${fmt(s.total_net_cost,0)}`
    const co2     = s.co2_avoided_kg!=null ? fmt(s.co2_avoided_kg,0)+" kg" : "—"
    const savings = s.cost_savings_vs_no_solar!=null ? "$"+fmt(s.cost_savings_vs_no_solar,0) : "—"
    tbody.innerHTML += `<tr>
      <td>${s.scenario_label}</td><td>${cost}</td><td>${co2}</td>
      <td>${fmt(s.avg_self_sufficiency,1)}%</td><td>${savings}</td>
    </tr>`
  })
  const note = document.querySelector("#comparison-note")
  if (note) {
    const n = getNumHouses(), d = getNumDays()
    note.innerHTML = `Table and gauge figures are totals for the full neighborhood (${n} households, ${d} simulated days). Annual Cost is net energy cost after grid exports. CO₂ Avoided is relative to a no-solar baseline. Savings vs No Solar = baseline cost − scenario cost.`
  }
}

// ─── Impact cards ───────────────────────────────────────────────────────────
function populateImpactCards() {
  const optimized = state.allData.overviewData.scenarios.find(s=>s.scenario==="well_designed")
  if (!optimized) return
  const numDays = getNumDays()

  const savingsEl = document.querySelector("#impact-savings")
  const co2El     = document.querySelector("#impact-co2")
  const ssEl      = document.querySelector("#impact-ss")
  if (savingsEl) savingsEl.textContent = "$"+fmt(optimized.cost_savings_vs_no_solar,0)
  if (co2El)     co2El.textContent     = fmt(optimized.co2_avoided_kg,0)+" kg"
  if (ssEl)      ssEl.textContent      = fmt(optimized.avg_self_sufficiency,1)+"%"

  const savingsCard = savingsEl?.closest(".impact-card")?.querySelector("p")
  const co2Card     = co2El?.closest(".impact-card")?.querySelector("p")
  if (savingsCard) savingsCard.textContent = `Savings vs No Solar over ${numDays} days`
  if (co2Card)     co2Card.textContent     = `CO₂ Avoided over ${numDays} days (kg)`
}

// ─── CO₂ equivalencies ──────────────────────────────────────────────────────
function initCo2Equivalencies() {
  const container = document.querySelector("#co2Equivalencies")
  if (!container) return
  container.innerHTML = ""

  const wd = state.allData.overviewData.scenarios.find(s=>s.scenario==="well_designed")
  if (!wd) return

  const divisor   = getSolutionDivisor()
  const co2Avoided = wd.co2_avoided_kg / divisor

  const rounded = state.solutionMode==="average"
    ? d3.format(",.0f")(Math.round(co2Avoided))
    : d3.format(",.0f")(Math.round(co2Avoided/1000)*1000)

  const labelEl = document.getElementById("co2AvoidedLabel")
  if (labelEl) labelEl.textContent = rounded

  const titleEl = document.getElementById("co2EquivTitle")
  if (titleEl) {
    const suffix = state.solutionMode==="average" ? " kg per household" : " kg of CO₂"
    titleEl.innerHTML = `<span class="material-icons section-icon" style="font-size:20px;vertical-align:middle;margin-right:6px;">forest</span>What ${rounded}${suffix} Actually Means`
  }

  ;[
    {icon:"park",         value:Math.round(co2Avoided/21),                    unit:"trees",  label:"planted & growing for a year",   color:"#2c7a55"},
    {icon:"directions_car",value:Math.round(co2Avoided/0.243),               unit:"km",     label:"not driven by a gasoline car",    color:"#1565c0"},
    {icon:"home",         value:Math.max(1,Math.round(co2Avoided/4798)),      unit:"homes",  label:"powered for an entire year",      color:"#6a1b9a"}
  ].forEach(eq=>{
    const card = document.createElement("div")
    card.style.cssText = "flex:1;min-width:180px;background:#fff;border-radius:14px;padding:24px 20px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);"
    card.innerHTML = `
      <span class="material-icons" style="font-size:36px;color:${eq.color};margin-bottom:8px;display:block;">${eq.icon}</span>
      <div style="font-size:28px;font-weight:700;color:${eq.color};font-family:Poppins,sans-serif;line-height:1.1;">${d3.format(",.0f")(eq.value)}</div>
      <div style="font-size:14px;font-weight:600;color:#333;font-family:Poppins,sans-serif;margin:4px 0 2px;">${eq.unit}</div>
      <div style="font-size:11px;color:#888;font-family:Poppins,sans-serif;">${eq.label}</div>`
    container.appendChild(card)
  })
}

// ─── Solution mode toggle ───────────────────────────────────────────────────
function wireSolutionModeToggle() {
  d3.selectAll("#solutionModeToggle [data-solution-mode]").on("click",function(){
    d3.selectAll("#solutionModeToggle .scenario-btn").classed("active",false)
    d3.select(this).classed("active",true)
    state.solutionMode = this.getAttribute("data-solution-mode")
    updateSolutionMode()
  })
}

function updateSolutionMode() {
  const wd = state.allData.overviewData.scenarios.find(s=>s.scenario==="well_designed")
  const ns = state.allData.overviewData.scenarios.find(s=>s.scenario==="no_solar")
  if (!wd||!ns) return

  const numDays  = getNumDays()
  const divisor  = getSolutionDivisor()
  const suffix   = state.solutionMode==="average" ? " / household" : ""

  const savingsEl = document.querySelector("#impact-savings")
  const co2El     = document.querySelector("#impact-co2")
  const ssEl      = document.querySelector("#impact-ss")
  if (savingsEl) savingsEl.textContent = "$"+fmt(wd.cost_savings_vs_no_solar/divisor,0)
  if (co2El)     co2El.textContent     = fmt(wd.co2_avoided_kg/divisor,0)+" kg"
  if (ssEl)      ssEl.textContent      = fmt(wd.avg_self_sufficiency,1)+"%"

  const savingsCard = savingsEl?.closest(".impact-card")?.querySelector("p")
  const co2Card     = co2El?.closest(".impact-card")?.querySelector("p")
  if (savingsCard) savingsCard.textContent = `Savings vs No Solar over ${numDays} days${suffix}`
  if (co2Card)     co2Card.textContent     = `CO₂ Avoided over ${numDays} days (kg)${suffix}`

  d3.select("#bulletChart").selectAll("*").remove()
  d3.select("#co2BulletChart").selectAll("*").remove()
  d3.select("#co2Equivalencies").selectAll("*").remove()
  initBulletChart()
  initCo2BulletChart()
  initCo2Equivalencies()
}
