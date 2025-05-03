import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// get data from projects json
const projects = await fetchJSON('../lib/projects.json');

// select the container we want to render json into
const projectsContainer = document.querySelector('.projects');

// use renderProjects to dynamically dislay json data
renderProjects(projects, projectsContainer, 'h2');

// change title to the amount of projects
const title = document.querySelector('.projects-title');
title.innerHTML = `${projects.length} Projects`;


// add search field
let query = '';
let searchInput = document.querySelector('.searchBar')

// set selectedIndex value
let selectedIndex = -1;

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  // create circle
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  // re-calculate slice generator, arc data, arc, etc.
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));
  let newColors = d3.scaleOrdinal(d3.schemeTableau10);
  // TODO: clear up paths and legends
  let newSVG = d3.select('svg');
  newSVG.selectAll('path').remove();
  let newUL = d3.select('ul');
  newUL.selectAll('li').remove();
  // update paths and legends, refer to steps 1.4 and 2.2
  newArcs.forEach((arc, idx) => {
    d3.select('svg')
      .append('path')
      .attr('d', arc)
      .attr('d', arc)
      .attr('fill',newColors(idx))
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        newSVG
          .selectAll('path')
          .attr('class', (_, idx) => (
            // TODO: filter idx to find correct pie slice and apply CSS from above
            idx === selectedIndex ? 'selected' : null
          ));

        newUL
          .selectAll('li')
          .attr('class', (_, idx) => (
            // TODO: filter idx to find correct pie slice and apply CSS from above
            idx === selectedIndex ? 'selected' : null
          ));
        
          if (selectedIndex === -1) {
            renderProjects(projects, projectsContainer, 'h2');
          } else {
            // TODO: filter projects and project them onto webpage
            // Hint: `.label` might be useful
            const selectedLabel = newData[selectedIndex].label;
            const filteredProjects = projects.filter(p => {
              const match =  p.year === selectedLabel;
              return match
            });
            renderProjects(filteredProjects, projectsContainer, 'h2');
          }
      });
  });
  let newLegend = d3.select('.legend');
  newData.forEach((d, idx) => {
    newLegend
      .append('li')
      .attr('style', `--color:${newColors(idx)}`) // set the style attribute while passing in parameters
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
  });
}

// Call this function on page load
renderPieChart(projects);

searchInput.addEventListener('change', (event) => {
  // update query value
  query = event.target.value;
  // TODO: filter the projects
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  // re-render legends and pie chart when event triggers
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

