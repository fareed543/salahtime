const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '../src/assets/data/timezones.json');
const now = new Date();

const regionLabels = {
  Africa: 'Africa',
  America: 'Americas',
  Antarctica: 'Antarctica',
  Arctic: 'Arctic',
  Asia: 'Asia',
  Atlantic: 'Atlantic Islands',
  Australia: 'Australia',
  Europe: 'Europe',
  Indian: 'Indian Ocean',
  Pacific: 'Pacific Islands'
};

const countryHints = {
  'Asia/Almaty': 'Kazakhstan',
  'Asia/Qostanay': 'Kazakhstan',
  'Asia/Qyzylorda': 'Kazakhstan',
  'Asia/Aqtau': 'Kazakhstan',
  'Asia/Aqtobe': 'Kazakhstan',
  'Asia/Atyrau': 'Kazakhstan',
  'Asia/Oral': 'Kazakhstan',
  'Asia/Kolkata': 'India',
  'Asia/Calcutta': 'India',
  'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Dubai': 'United Arab Emirates',
  'Asia/Qatar': 'Qatar',
  'Asia/Kuwait': 'Kuwait',
  'Asia/Bahrain': 'Bahrain',
  'Asia/Muscat': 'Oman'
};

function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function timezonePart(zone, timeZoneName) {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName })
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value || zone;
}

function cityName(zone) {
  const pieces = zone.split('/');
  return titleCase(pieces[pieces.length - 1]);
}

function placeLabel(zone) {
  const pieces = zone.split('/');
  const country = countryHints[zone];

  if (country) {
    return `${cityName(zone)}, ${country}`;
  }

  const region = pieces[0];
  const subregion = pieces.length > 2
    ? `${titleCase(pieces[1])}, ${regionLabels[region] || region}`
    : regionLabels[region] || region;

  return `${cityName(zone)}, ${subregion}`;
}

const zones = Intl.supportedValuesOf('timeZone');
const timezones = zones.map((zone) => {
  const name = timezonePart(zone, 'longGeneric');
  const offset = timezonePart(zone, 'shortOffset');
  const description = `Time zone in ${placeLabel(zone)} (${offset})`;

  return {
    value: zone,
    name,
    description,
    label: `${name} - ${description}`,
    offset
  };
}).sort((first, second) => first.name.localeCompare(second.name) || first.value.localeCompare(second.value));

if (!timezones.some((timezone) => timezone.value === 'Asia/Kolkata')) {
  timezones.push({
    value: 'Asia/Kolkata',
    name: 'India Standard Time',
    description: 'Time zone in Kolkata, India (GMT+5:30)',
    label: 'India Standard Time - Time zone in Kolkata, India (GMT+5:30)',
    offset: 'GMT+5:30'
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(timezones, null, 2)}\n`);

console.log(`Wrote ${timezones.length} timezones to ${outputPath}`);
