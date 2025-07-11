import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
            id: commit,
            url: 'https://github.com/vis-society/lab-7/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
            writable: true,
            configurable: true
        });

        return ret;
    });
}

function renderCommitInfo(data, commits) {
    // Create the dl element
    d3.select('.stats').remove(); // clear dl element so update works
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Add more stats as needed...
    // Add longest line length
    dl.append('dt').text('Longest line length');
    const max_lines = d3.max(commits[0].lines, (d) => d.length);
    dl.append('dd').text(max_lines);

    // Add longest line depth
    dl.append('dt').text('Max Depth');
    const max_depth = d3.max(commits[0].lines, (d) => d.depth);
    dl.append('dd').text(max_depth);

    // Add time of day that most work is done
    dl.append('dt').text('Time of Day Most Work Occurs');
    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short'}),
        );
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dd').text(maxPeriod);
}

// STEP 2: Create Scatterplot

// create tooltip
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
  
    if (Object.keys(commit).length === 0) return;
    
    console.log(link);
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
}
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}
function createBrushSelector(svg) {
    svg.call(d3.brush());
}
let xScale = d3.scaleTime();
let yScale = d3.scaleLinear();
function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}
function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }
    // TODO: return true if commit is within brushSelection
    // and false if not
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commit(s) selected`;
  
    return selectedCommits;
}
function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
}

// create plot
function updateScatterPlot(data, filteredCommits){

    // define dimensions
    const width = 1000;
    const height = 600;

    d3.select('svg').remove();

    // create svg using d3
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // create x and y scale
    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredCommits, (d) => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    // define margins
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };

    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    svg.selectAll('g').remove();
    // Add gridlines
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width))
        .attr('opacity',0.2);

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    
    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);


    
    // plot data
    const dots = svg.append('g').attr('class', 'dots');

    // create brush selector
    svg.call(d3.brush().on('start brush end', brushed));

    // Raise dots and everything after overlay
    svg.selectAll('.dots, .overlay ~ *').raise();    

    // add radius constraints
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);

    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 30]);

    // sort commits by total lines in descending order
    // const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);

    dots.selectAll('circle').remove();
    dots
    .selectAll('circle')
    .data(filteredCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
    .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });
}


let data = await loadData();
let commits = processCommits(data);

// Render Plot and Commit Info

renderCommitInfo(data, commits);

updateScatterPlot(data, commits);

console.log(commits);

let timeScale = d3.scaleTime(
  [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
  [0, 100],
);

const sortedCommits = d3.sort(commits, (d) => d.datetime);

// Add scrollytelling area
d3.select('#scatter-story')
  .selectAll('.step')
  .data(sortedCommits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  function onStepEnter(response) {
    const timeValue = response.element.__data__.datetime;
    let filteredCommits = d3.filter(sortedCommits, d => d.datetime <= timeValue);
    const selectedTime = d3.select('#selectedTime');
    selectedTime.text(timeValue);
    updateScatterPlot(data, filteredCommits);
    renderCommitInfo(data, filteredCommits);
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = [];
    files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
        return { name, lines };
    });
    files = d3.sort(files, (d) => -d.lines.length);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    d3.select('.files').selectAll('div').remove(); // don't forget to clear everything first so we can re-render
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

    filesContainer.append('dt').append('code').text(d => d.name) // append file name
    filesContainer.append('dd').selectAll('div').data(d => d.lines).enter().append('div').attr('class', 'line').style('background', (d) => fileTypeColors(d.type)); // append line data
    filesContainer.append('line').text(d=>`${d.lines.length} lines`); // append file lines count
  }
  
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);
    

// // Update scatter plot and commit info

// const timeSlider = document.getElementById('commit-slider');
// function updateTimeDisplay(){
//     const commitProgress = Number(timeSlider.value);

//     let commitMaxTime = timeScale.invert(commitProgress);
//     let filteredCommits = d3.filter(commits, d => d.datetime <= commitMaxTime);
//     updateScatterPlot(data, filteredCommits);
//     renderCommitInfo(data, filteredCommits);

//     let lines = filteredCommits.flatMap((d) => d.lines);
//     let files = [];
//     files = d3
//     .groups(lines, (d) => d.file)
//     .map(([name, lines]) => {
//         return { name, lines };
//     });
//     files = d3.sort(files, (d) => -d.lines.length);
//     let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

//     d3.select('.files').selectAll('div').remove(); // don't forget to clear everything first so we can re-render
//     let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

//     filesContainer.append('dt').append('code').text(d => d.name) // append file name
//     filesContainer.append('dd').selectAll('div').data(d => d.lines).enter().append('div').attr('class', 'line').style('background', (d) => fileTypeColors(d.type)); // append line data
//     filesContainer.append('line').text(d=>`${d.lines.length} lines`); // append file lines count
// }
// timeSlider.addEventListener('input', updateTimeDisplay);
// updateTimeDisplay();

