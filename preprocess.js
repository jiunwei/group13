'use strict';

const fs = require('fs');

let areas = JSON.parse(fs.readFileSync('data/planning-areas.json'));
areas = areas.filter((item) => item.pln_area_n !== 'OTHERS');

let features = areas.map(function(item) {
    return {
        type: 'Feature',
        properties: {
            name: item.pln_area_n
        },
        geometry: JSON.parse(item.geojson)
    }
});

let new_areas = {
    type: 'FeatureCollection',
    features: features
};
 
let data = JSON.stringify(new_areas);
fs.writeFileSync('data/singapore.json', data);
