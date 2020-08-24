var fs = require('fs')
var settings = require('./settings.js');

function saveToFile(filename, data)
{
  // Save to file
  fs.writeFile(filename, data, function(err) {
    if(err) {
      console.log("Error: " + err.message)
      return// console.log(err);
    }
    console.log("Results saved to " + filename);
  });
}


function getFromFile(filename)
{
  var content;

  console.log(filename)
  var content = fs.readFileSync(filename);

  return (content)
}

module.exports.saveToFile = saveToFile;
module.exports.getFromFile = getFromFile;
