import { fetchJSON, renderProjects } from '../global.js';

// use fetchJSON function to grab projects data as a json file
const projects = await fetchJSON('../lib/projects.json');

// select the container we want to render json into
const projectsContainer = document.querySelector('.projects');

// use renderProjects to dynamically dislay json data
renderProjects(projects, projectsContainer, 'h2');