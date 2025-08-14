// app.plugin.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addSupportsRTLToStrings(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const stringsPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/values/strings.xml'
      );

      if (fs.existsSync(stringsPath)) {
        let stringsContents = fs.readFileSync(stringsPath, 'utf-8');

        if (!stringsContents.includes('<string name="supportsRTL">true</string>')) {
          stringsContents = stringsContents.replace(
            '</resources>',
            '    <string name="supportsRTL">true</string>\n</resources>'
          );
          fs.writeFileSync(stringsPath, stringsContents, 'utf-8');
          console.log('supportsRTL added to strings.xml ✅');
        }
      } else {
        console.warn('strings.xml not found at', stringsPath);
      }

      return config;
    },
  ]);
}

module.exports = addSupportsRTLToStrings;
