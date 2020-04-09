const d3 = require('d3');
const dagreD3 = require('dagre-d3');
const datasources = require('./datasources');

function renderGraph(graph) {
  const render = dagreD3.render();
  const svg = d3.select("svg");
  const svgInner = svg.select("g");
  render(svgInner, graph);
}

function enableZoom() {
  const svg = d3.select("svg");
  const svgInner = svg.select("g");
  const zoom = d3.zoom().on("zoom", () => {
    svgInner.attr("transform", d3.event.transform);
  });
  svg.call(zoom);
}

function enableTooltips(graph) {
  const svg = d3.select("svg");
  const svgInner = svg.select("g");
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);
  svgInner.selectAll("g.node")
    .attr("title", (label) => graph.node(label).description)
    .each(function() {
      const description = this.getAttribute('title');
      if (description) {
        this.addEventListener('mouseenter', () => {
          tooltip.style.display = '';
          const bbox = this.getBoundingClientRect();
          tooltip.innerText = description;
          tooltip.style.left = (bbox.x + bbox.width) + 'px';
          tooltip.style.top = (bbox.y + bbox.height / 2) + 'px';
        });
        this.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      }
    });
}

async function main() {
  try {
    const patients = await datasources.bahrain.fetchPatients();
    console.log(patients)
    const graph = datasources.bahrain.mapPatientsToGraph(patients);
    renderGraph(graph);
    enableZoom();
    enableTooltips(graph);
  } catch (err) {
    console.error(err);
  }
}

main();
