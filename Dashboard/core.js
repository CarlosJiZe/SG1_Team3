// ============================================================
//  GreenGrid Dashboard — core.js
//  Global state, constants, tooltip, shared helpers
// ============================================================

const GRID_RATE  = 0.0075
const CO2_FACTOR = 0.444

const WEALTH_LABELS = {
  low_income: "Low Income", middle_income: "Middle Income",
  high_income: "High Income", luxury: "Luxury",
  low: "Low Income", middle: "Middle Income", high: "High Income"
}
const HH_TYPE_LABELS = {
  studio_1_bed: "Studio / 1-Bed",
  small_family:  "Small Family",
  large_family:  "Large Family"
}

// ─── Single state object (replaces all scattered `let` globals) ────────────
const state = {
  allData:               {},
  currentDuckScenario:   "well_designed",
  currentTimeScenario:   "well_designed",
  currentScatterScenario:"well_designed",
  currentGroupScenario:  "well_designed",
  currentGroupKey:       "by_type",
  currentGroupMode:      "totals",
  solutionMode:          "total",
  currentHHMode:         "kwh",
  currentWealthMode:     "kwh",
  paradoxScenario:       "no_solar",
  mistakeTimeGranularity:"monthly",
  mistakeMetric:         "import"
}

// ─── Tooltip ────────────────────────────────────────────────────────────────
const tooltip = d3.select("body")
  .append("div").attr("class", "gg-tooltip")
  .style("position","absolute").style("background","white")
  .style("padding","10px 14px").style("border","1px solid #d0ddd6")
  .style("border-radius","8px").style("box-shadow","0 4px 16px rgba(0,0,0,0.1)")
  .style("pointer-events","none").style("font-size","13px")
  .style("line-height","1.6").style("opacity",0).style("z-index",999)

function showTooltip(html) { tooltip.style("opacity",1).html(html) }
function moveTooltip(event) {
  tooltip.style("left",(event.pageX+14)+"px").style("top",(event.pageY-28)+"px")
}
function hideTooltip() { tooltip.style("opacity",0) }

// ─── Formatters ─────────────────────────────────────────────────────────────
function fmt(n, decimals=1) {
  return n==null ? "—" : Number(n).toLocaleString("en-US",{
    minimumFractionDigits:decimals, maximumFractionDigits:decimals
  })
}
function fmtKwh(n) { return fmt(n,1)+" kWh" }
function fmtKw(n)  { return fmt(n,2)+" kW"  }

// ─── Helpers ────────────────────────────────────────────────────────────────
function getNumDays()   { return (state.allData.timeData?.["well_designed"]?.["daily"]?.length??359)+1 }
function getNumHouses() { return state.allData.houseData?.["well_designed"]?.length??24 }
function getSolutionDivisor() { return state.solutionMode==="average" ? getNumHouses() : 1 }

function setEl(selector, value) {
  const el = document.querySelector(selector)
  if (el) el.textContent = value
}

function animatePath(path, delay) {
  const len = path.node().getTotalLength()
  const origDash = path.attr("stroke-dasharray")
  path.attr("stroke-dasharray",`${len} ${len}`).attr("stroke-dashoffset",len)
    .transition().delay(delay||0).duration(1300).ease(d3.easeQuadInOut)
    .attr("stroke-dashoffset",0)
    .on("end",()=>{
      path.attr("stroke-dasharray", (origDash&&origDash!=="none") ? origDash : null)
      path.attr("stroke-dashoffset",null)
    })
}
