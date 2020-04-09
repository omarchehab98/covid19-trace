const _ = require('lodash');

const safeMatch = (string, regex) => (string || '').match(regex) || [];

const locationAlias = (location) => (({
  'US': 'United States of America',
  'USA': 'United States of America',
  'Spain Turkey': ['Spain', 'Turkey'],
})[location] || location);

const caseResultToColor = (caseResult) => ({
  'Discharged': 'green',
  'Deceased': 'red',
})[caseResult];

function fetchPatients() {
  return fetch('https://www.moh.gov.bh/COVID19/ContactsTracing')
    .then(res => res.text())
    .then(html => new DOMParser().parseFromString(html, 'text/html'))
    .then(document => document.querySelector('table'))
    .then(table => table.querySelectorAll('tbody tr'))
    .then(Array.from)
    .then(rows => rows
      .map(row => row.innerText
        .replace(/ +/g, ' ')
        .replace(/\n+/g, '\n')
        .trim())
      .map(row => row
        .split('\n')
        .filter(Boolean)
        .reduce((patient, property, index) => {
          const kv = property.replace(/case.?no[\s:.]*/i, 'Case No:').split(':', 2);
          let key, value;

          if (kv.length === 1) {
            const keys = Object.keys(patient);
            if (keys.length > 0) {
              key = keys[keys.length - 1];
            } else {
              console.warn(`Warning: Patient at index "${index}" has a property with no key and the object is empty.\n\t"${property}"`);
              return patient;
            }
            [value] = kv;
          } else if (kv.length === 2) {
            [key, value] = kv;
          }

          key = _.camelCase(key);
          value = value.trim();
          if (typeof patient[key] === 'undefined') {
            patient[key] = value;
          } else {
            patient[key] += '\n' + value;
          }
          return patient;
        }, {
          raw: row,
        })
      )
      .map((patient) => ({
        ...patient,
        caseNo: Number(safeMatch(patient.caseNo, /\d+/)[0]),
        caseResult: safeMatch(patient.caseNo, /\(([^)]+)\)/)[1],
        locationHistory: (safeMatch((patient.travelHistory || '').replace(/(\son\s[\w\W]*|\s-\s[\w\W]*)/ig, ''), /arrived ?from ?(.+)/i)[1] || '')
          .split(',')
          .map(s => s.trim())
          .flatMap(locationAlias)
          .filter(Boolean),
        contactTraces: (safeMatch(patient.contactTracing, /positive ?case[^(]*(\([^)]*\))/i)[1] || '')
          .replace(/[^\d,]/g, '')
          .split(',')
          .filter(Boolean),
      }))
      .filter((patient) => {
        const hasCaseNo = !Number.isNaN(patient.caseNo);
        if (!hasCaseNo) {
          console.warn('Warning: Patient is missing property "caseNo"\n', patient);
        }
        return hasCaseNo;
      })
      .reverse()
    )
}

function mapPatientsToGraph(patients) {
  const graph = new dagreD3.graphlib.Graph()
    .setGraph({})
    .setDefaultEdgeLabel(() => ({}));

  // patients
  //   .filter(patient => patient.locationHistory)
  //   .forEach((patient) => {
  //     patient.locationHistory.forEach((location) => {
  //       graph.setNode(location, {
  //         label: location,
  //         class: 'node-orange',
  //       });
  //       graph.setEdge(location, patient.caseNo);
  //     });
  //   });

  patients.forEach((patient) => {
    const color = caseResultToColor(patient.caseResult);
    graph.setNode(patient.caseNo, {
      label: String(patient.caseNo),
      class: color && ('node-' + color),
      description: patient.raw,
    });
  });

  patients.forEach((patient) => {
    patient.contactTraces.forEach((trace) => {
      graph.setEdge(trace, patient.caseNo);
    });
  });

  graph.nodes().forEach(node => {
    if (graph.nodeEdges(node).length === 0) {
      graph.removeNode(node);
    }
  });

  return graph;
}

module.exports = {
  fetchPatients,
  mapPatientsToGraph,
};
