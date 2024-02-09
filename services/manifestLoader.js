const yaml = require('yaml');
const _fs = require('fs');
const path = require('path');
const { findUp } = require('find-up');

const fs = _fs.promises;

const projectRoot = path.dirname(findUp.sync('package.json'));

async function loadManifest(service_id) {
  try {
    const manifestPath = `${projectRoot}/services/${service_id}/manifest.yaml`;
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = yaml.parse(manifestContent);
    return {
      service_id,
      ...manifest
    }
  } catch (error) {
    console.log(error.stack)
    console.error('Error loading manifest:', error.message);
    throw error;
  }
}

async function getAllServicesManifests(options) {
  const {
    groupResult=true
  } = options || {};

  const servicesFolders = (await fs.readdir(`${projectRoot}/services`, { withFileTypes: true })).filter(dirent => dirent.isDirectory());

  const servicesManifests = await Promise.all(
    servicesFolders.map(async ({name: service_id}) => {
      return await loadManifest(service_id);
    })
  );

  if(!groupResult) return servicesManifests.flat();

  // Group by service_type
  const groupedManifests = servicesManifests.reduce((grouped, { service_id, service_type, service_name }) => {
    if (!grouped[service_type]) {
      grouped[service_type] = [];
    }

    grouped[service_type].push({ service_id, service_name });
    return grouped;
  }, {});

  return groupedManifests;
}

// Function to validate a single manifest file
function validateManifest(manifest) {
  const {
    service_id,
    service_name,
    service_type
  } = manifest;

  try {
    if (!service_name) {
      throw new Error(`'service_name' is missing in ${service_id}`);
    } else if(!service_type) {
      throw new Error(`'service_type' is missing in ${service_id}`);
    }

    return true;
  } catch (error) {
    console.error(`Error validating ${service_id}:`, error.message);
    return false;
  }
}


// Function to validate all manifest files in the services directory
async function validateAllManifests() {
  try {
    const manifests = await getAllServicesManifests({ groupResult: false })

    // Validate each manifest.yaml file
    const validationResults = manifests.map(validateManifest);

    // Check if all validations passed
    if (validationResults.every((result) => result)) {
      console.log('All manifest files are valid.');
    } else {
      console.error('Some manifest files are invalid. Please check the logs for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error reading service directory:', error.message);
    process.exit(1);
  }
}

module.exports = { loadManifest, validateAllManifests, getAllServicesManifests };
