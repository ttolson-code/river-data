import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';
import  connect from 'mongodb';
import { getMongoConnection } from './mongoConnect.js';

// PARAMS:
// 00060 = streamflow (cu ft/sec).
// 00010 = temp (celcius).

// Use node-fetch to fetch data from USGS api.
async function fetchRiverData(fetchState) {
  console.log(`Fetching Data from USGS api. State = ${fetchState}`)
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=${fetchState}&parameterCd=00060,00010&siteType=ST&siteStatus=active`;
  const response = await fetch(url);
  const responseJson = await response.json();

  // console.log(responseJson);

  if (responseJson.error) {
    res.end(JSON.stringify({ error: responseJson.error.message }));
  } else {
    // Drill down to relevant data.
    const riverDataUSGS = responseJson.value.timeSeries;
    console.log(riverDataUSGS);

    // Loop through USGS data and cleanup each site object. 
    // .map() returns an array.
    const riverData = riverDataUSGS.map((site) => {

      // Collect data needed to build new river object. 
      const siteName = site.sourceInfo.siteName.toLowerCase(); 
      // console.log(siteName);

      // Use regex to split the siteName string at the word "at", "near", or "nr" (Creates array of strings). 
      // Grab string in the array (shift = first, pop = last).
      // Trim whitespace. 
      // Replace spaces with hypens in river property.
      // Split town and state by "," for location and state property.

      // TODO: Improve error handling because USGS api is absolute garbage (not consistent). Add 'city'. Location should be City & State. 
      // const river = siteName.split(/(\bat|\bnear|\bnr|\bbelow|\babove\w*)\b/g).shift().trim().replace(/ /g, '-');
      const river = siteName.split(/(\bat|\bnear|\bnr|\bbelow|\babove\w*)\b/g).shift().trim();
      const location = siteName.split(/\b(\w*at|near|nr\w*)\b/g).pop().trim().split(",").shift().trim();
      // const state = siteName.split(/\b(\w*at|near|nr\w*)\b/g).pop().trim().split(",").pop().trim();
      const state = fetchState;
      // Collects geolocation cooridinates.
      const coordinates = site.sourceInfo.geoLocation.geogLocation;
      const latitude = coordinates.latitude;
      const longitude = coordinates.longitude;
      // Streamflow or Temperature. Remove additional unwanted text.
      const dataType = site.variable.variableName.split(",").shift().toLowerCase();
      // Value of Streamflow or Temperature variable.
      const dataValue = site.values[0].value[0].value;
      
      // Build new river object.
      const newSite = {
        "usgsTitle": siteName,
        "river": river, 
        "location": location,
        "state": state,
        "coordinates": {
          "latitude": latitude,
          "longitude": longitude
        },
        "data": {
          // streamflow or temperature depending on USGS entry.
          [dataType]: dataValue,
        }
      }
      return newSite;
    });
  
    // Sort riverData array by river name.  
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    const riverDataSorted = [...riverData].sort((a,b) => {
      const riverA = a.river;
      const riverB = b.river;
      if (riverA < riverB) {
        return -1;
      }
      if (riverA > riverB) {
        return 1;
      }
      // If equal.
      return 0;
    });
  
    // https://www.javascripttutorial.net/object/javascript-merge-objects/
    // https://stackoverflow.com/questions/46971158/how-to-merge-objects-with-the-same-properties-into-an-array/47027531#47027531
    function mergeDuplicateSites(accumulator, currentSite) {
      // Build unique identity key.
      const key = (currentSite.river + '-' + currentSite.location);
      // console.log(key);
      const store = accumulator.store;
      // console.log(store);
      const storedSites = store[key];
      // console.log(storedSites);
      // Merge `data` of sites with the same name and location.
      if (storedSites) { 
        storedSites.data = Object.assign(storedSites.data, currentSite.data);
      } else {
        store[key] = currentSite;
        accumulator.list.push(currentSite);
      }
      return accumulator;
    }
    
    const riverDataFinal = riverDataSorted.reduce(mergeDuplicateSites, { store: {}, list: [] }).list;
    return riverDataFinal;
  }
};

export default async function updateDatabase() {
  const stateList = [ "md", "pa", "wv", "va", "nc" ];
  const db = await getMongoConnection();

  // Drop rivers collection in order to reseed with fresh data.
  if (await db.collection('rivers').find().count() > 0) {
    console.log('Dropping rivers collection.');
    db.collection('rivers').drop();
  }
  
  // Drop errors collection in order to reseed with fresh data.
  if (await db.collection('errors').find().count() > 0) {
    console.log('Dropping errors collection.')
    db.collection('errors').drop();
  }

  await stateList.map(async (fetchState) => {
    const riverData = await fetchRiverData(fetchState);
  
    await riverData.map(async (river) => {
      // Check if data property is missing "temperature", if so add it and supply a null value.
      if(!river.data.temperature) {
        river.data = Object.assign({ "temperature": null }, river.data);
      }

      // Check if data property is missing "streamflow", if so add it and supply a null value.
      if(!river.data.streamflow) {
        river.data = Object.assign(river.data, { "streamflow": null });
      }

      // Take riverData array and insert individual river objects into mongoDB as documents.
      // Validate that the state matches a state in stateList array.
      // Validate that the river name is not null.
      // Validate that river name starts with a lowercase letter and only contains lowercase letters, hypens, and numbers.
      // Items that pass vaidation are added to 'rivers' collection, others added to 'errors' collection. 
      if (river.state.match(/(md|pa|wv|va|nc)/)
        && (river.river)) {
        // && (river.river.match(/^[a-z]+(-[a-z0-9]+)*$/)))  {
        db.collection('rivers').insertOne(river);
      } else { 
        db.collection('errors').insertOne(river);
      }
    });
    const countRivers = await db.collection('rivers').find().count();
    const countErrors = await db.collection('errors').find().count();
    console.log(`${countRivers} sites added to river collection.`)
    console.log(`${countErrors} sites added to error collection.`)
  })
  console.log('Cron Job complete.')
}

// Maryland State and County Codes. 

// US	24	001	Allegany County
// US	24	003	Anne Arundel County
// US	24	005	Baltimore County
// US	24	009	Calvert County
// US	24	011	Caroline County
// US	24	013	Carroll County
// US	24	015	Cecil County
// US	24	017	Charles County
// US	24	019	Dorchester County
// US	24	021	Frederick County
// US	24	023	Garrett County
// US	24	025	Harford County
// US	24	027	Howard County
// US	24	029	Kent County
// US	24	031	Montgomery County
// US	24	033	Prince George's County
// US	24	035	Queen Anne's County
// US	24	037	St. Mary's County
// US	24	039	Somerset County
// US	24	041	Talbot County
// US	24	043	Washington County
// US	24	045	Wicomico County
// US	24	047	Worcester County
// US	24	510	Baltimore City

// Random abbreviaions: 

// "l" - little
// "ltl" - little
// "r" - river
// "c" - creek
// "cr" - creek
// "trib" - tributary
// "br" - branch
// "nb" - northbranch
// "eb" - eastbrach
// "b" - below
// "bl" - below
// "ab" - above
// "n" - north
// "s" - south
// "mth" - mouth