// public/VERSION.json is the release version source and is copied to the build root by CRA.
const metadata = require('../public/VERSION.json');
if (!/^\d+\.\d+(?:\.\d+){0,2}$/.test(metadata.version) || metadata.startProProtocol !== 1) {
  throw new Error('Invalid public/VERSION.json: expected a numeric version and startProProtocol: 1');
}
process.env.REACT_APP_PROMPTER_VERSION = metadata.version;
require('react-scripts/scripts/build');
