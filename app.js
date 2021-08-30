var fs = require("fs");
var parse = require("csv-parse");
var async = require("async");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csv = require("csvtojson");

function readCSV() {
  let entries = [];
  let count = 0;

  fs.createReadStream("./Sample input - Log Parser.csv")
    .pipe(parse({ delimiter: ";", from_line: 2 }))
    .on("data", function (row) {
      row = row[0].split(",");
      count++;
      entries.push(new Entry(row[0], row[1], row[2], row[3], row[4], row[5]));

      if (count % 100 == 0) {
        processEntries(entries);
        count = 0;
        entries = [];
      }
    })
    .on("end", function () {
      processEntries(entries);
    });
}

function processEntries(entries) {
  let result = [];
  for (let i = 0; i < entries.length; i++) {
    let index = checkExisted(result, entries[i].url);
    if (index !== -1) {
      result[index].response_time.push(entries[i].response_time);
      result[index].frequency = result[index].frequency + 1;
    } else {
      let obj = {
        url: entries[i].url,
        method: entries[i].method,
        response_time: [entries[i].response_time],
        frequency: 1,
      };
      result.push(obj);
    }
  }

  result.sort((a, b) => {
    return b.frequency - a.frequency;
  });


  let response = result.map((element) => {
      let url = element.url;
    delete element.url;
    let newObj = {
      maxTime: Math.max(...element.response_time),
      minTime: Math.min(...element.response_time),
      average:
        element["response_time"].reduce((a, b) => parseInt(a) + parseInt(b)) /
        element["response_time"].length,
      url: url.replace(new RegExp("[0-9]+", "g"), "{id}"),
    };
    return { ...element, ...newObj };
  });

  console.log("Response::", response)

  const csvWriter = createCsvWriter({
    path: "output1.csv",
    header: [
      { id: "method", title: "Method" },
      { id: "url", title: "URL" },
      { id: "frequency", title: "Frequency" },
    ],
  });
  csvWriter
    .writeRecords(response.slice(0, 5))
    .then(() => console.log("The first output file was written successfully"));

  const csvWriter2 = createCsvWriter({
    path: "output2.csv",
    header: [
      { id: "method", title: "Method" },
      { id: "url", title: "URL" },
      { id: "minTime", title: "Min Time" },
      { id: "maxTime", title: "Max Time" },
      { id: "average", title: "Average Time" },
    ],
  });
  csvWriter2
    .writeRecords(response)
    .then(() => console.log("The second output file was written successfully"));
}

class Entry {
  constructor(timestamp, url, method, response_time, response_code) {
    this.timestamp = timestamp;
    this.url = url;
    this.method = method;
    this.response_time = response_time;
    this.response_code = response_code;
  }
}

function checkExisted(array, url) {
  return array.findIndex((element) => element.url === url);
}
readCSV();
